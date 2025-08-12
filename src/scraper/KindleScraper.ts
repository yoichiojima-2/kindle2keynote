import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface BookMetadata {
  title: string;
  author: string;
  asin?: string;
}

export interface ExtractedContent {
  metadata: BookMetadata;
  chapters: Chapter[];
  fullText: string;
}

export interface Chapter {
  title: string;
  content: string;
  pageNumbers: number[];
}

export class KindleScraper {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;
  protected config: any;

  constructor() {
    try {
      this.config = JSON.parse(readFileSync(join(__dirname, '../../config/default.json'), 'utf8'));
    } catch (error) {
      console.warn('Config file not found, using defaults');
      this.config = {
        scraper: {
          headless: true,
          timeout: 30000,
          userDataDir: './profile',
          viewport: { width: 1280, height: 800 }
        }
      };
    }
  }

  async initialize(): Promise<void> {
    console.log('🔧 Initializing browser...');
    
    this.browser = await chromium.launch({
      headless: this.config.scraper.headless,
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: this.config.scraper.viewport,
      extraHTTPHeaders: {
        'Accept-Language': 'ja-JP,ja;q=0.9,en-US,en;q=0.8'
      }
    });

    this.page = await this.context.newPage();
    
    // Add stealth measures
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Mock languages (prioritize Japanese)
      Object.defineProperty(navigator, 'languages', {
        get: () => ['ja-JP', 'ja', 'en-US', 'en'],
      });
    });
  }

  async navigateToKindle(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log('🌐 Navigating to Kindle Cloud Reader...');
    
    try {
      await this.page.goto(url, { 
        waitUntil: 'networkidle', 
        timeout: this.config.scraper.timeout 
      });
      
      // Wait for the book to load
      await this.page.waitForSelector('.kp-reading-area, .kp-page, #KindleReaderIFrame', { 
        timeout: this.config.scraper.timeout 
      });
      
      console.log('✅ Kindle page loaded successfully');
    } catch (error) {
      console.error('❌ Failed to navigate to Kindle:', error);
      throw error;
    }
  }

  async extractBookMetadata(): Promise<BookMetadata> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    console.log('📖 Extracting book metadata...');
    
    try {
      const metadata = await this.page.evaluate(() => {
        const titleElement = document.querySelector('[data-testid="book-title"], .kp-notebook-book-info h3, title');
        const authorElement = document.querySelector('[data-testid="book-author"], .kp-notebook-book-info .a-row:nth-child(2)');
        
        return {
          title: titleElement?.textContent?.trim() || 'Unknown Title',
          author: authorElement?.textContent?.trim() || 'Unknown Author',
          asin: window.location.pathname.match(/\/([A-Z0-9]{10})/)?.[1]
        };
      });
      
      console.log(`📚 Found book: "${metadata.title}" by ${metadata.author}`);
      return metadata;
    } catch (error) {
      console.warn('⚠️  Could not extract metadata, using defaults');
      return {
        title: 'Unknown Title',
        author: 'Unknown Author'
      };
    }
  }

  async extractText(): Promise<string> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    console.log('📝 Extracting text from book...');
    
    let fullText = '';
    let pageCount = 0;
    const maxPages = 1000; // Safety limit
    
    try {
      // Try to switch to single page view for easier extraction
      try {
        await this.page.keyboard.press('Escape'); // Close any dialogs
        await this.page.waitForTimeout(1000);
        
        // Look for view settings
        const viewButton = await this.page.$('[data-testid="view-options"], .kp-reader-options-button');
        if (viewButton) {
          await viewButton.click();
          await this.page.waitForTimeout(1000);
          
          const singlePageOption = await this.page.$('[data-testid="single-page"], button:has-text("Single page")');
          if (singlePageOption) {
            await singlePageOption.click();
            await this.page.waitForTimeout(2000);
          }
        }
      } catch (error) {
        console.log('Could not switch to single page view, continuing...');
      }
      
      while (pageCount < maxPages) {
        // Extract text from current page
        const pageText = await this.page.evaluate(() => {
          // Try multiple selectors for different Kindle layouts
          const selectors = [
            '.kp-reading-area',
            '.kp-page-content',
            '#KindleReaderIFrame',
            '[data-testid="page-content"]',
            '.a-text-left'
          ];
          
          let text = '';
          
          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              const elementText = element.textContent?.trim();
              if (elementText && elementText.length > 50) { // Filter out UI elements
                text += elementText + '\n\n';
              }
            }
            if (text) break;
          }
          
          // If iframe is present, try to access its content
          const iframe = document.querySelector('#KindleReaderIFrame') as HTMLIFrameElement;
          if (iframe && iframe.contentDocument) {
            try {
              const iframeText = iframe.contentDocument.body?.textContent?.trim();
              if (iframeText && iframeText.length > text.length) {
                text = iframeText;
              }
            } catch (e) {
              // Cross-origin iframe, can't access content
            }
          }
          
          return text;
        });
        
        if (pageText && pageText.trim()) {
          fullText += pageText + '\n\n---\n\n'; // Page separator
          pageCount++;
          
          if (pageCount % 10 === 0) {
            console.log(`📄 Processed ${pageCount} pages...`);
          }
        }
        
        // Try to navigate to next page
        const hasNext = await this.page.evaluate(() => {
          // Try clicking next page button
          const nextButtons = [
            '[data-testid="next-page"]',
            '.kp-reader-next-page-button',
            'button[aria-label*="next"]',
            '.a-button-next'
          ];
          
          for (const selector of nextButtons) {
            const button = document.querySelector(selector) as HTMLElement;
            if (button && !button.hasAttribute('disabled')) {
              button.click();
              return true;
            }
          }
          
          return false;
        });
        
        if (!hasNext) {
          // Try keyboard navigation
          await this.page.keyboard.press('ArrowRight');
          await this.page.waitForTimeout(2000);
          
          // Check if we're still on the same page
          const newPageText = await this.page.evaluate(() => {
            const element = document.querySelector('.kp-reading-area, .kp-page-content');
            return element?.textContent?.trim() || '';
          });
          
          if (newPageText === pageText.trim()) {
            console.log('📄 Reached end of book or no more pages');
            break;
          }
        } else {
          await this.page.waitForTimeout(2000); // Wait for page to load
        }
      }
      
      console.log(`✅ Extracted text from ${pageCount} pages`);
      return fullText.trim();
      
    } catch (error) {
      console.error('❌ Error extracting text:', error);
      throw error;
    }
  }

  async extractBook(url: string, outputDir: string, format: string): Promise<ExtractedContent> {
    try {
      await this.initialize();
      await this.navigateToKindle(url);
      
      const metadata = await this.extractBookMetadata();
      const fullText = await this.extractText();
      
      // For now, treat the entire text as one chapter
      // TODO: Implement chapter detection
      const chapters: Chapter[] = [{
        title: 'Full Text',
        content: fullText,
        pageNumbers: Array.from({ length: fullText.split('---').length }, (_, i) => i + 1)
      }];
      
      return {
        metadata,
        chapters,
        fullText
      };
      
    } finally {
      await this.cleanup();
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up browser resources...');
    
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}