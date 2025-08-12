import { Browser, BrowserContext, Page } from 'playwright';
import { ExtractedContent, BookMetadata, Chapter, ScraperConfig } from '../types';
import { getConfig } from '../config';

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;
  protected config: ScraperConfig;

  constructor() {
    this.config = getConfig();
  }

  abstract initialize(): Promise<void>;
  
  async navigateToKindle(url: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    
    console.log('🌐 Navigating to Kindle Cloud Reader...');
    await this.page.goto(url, { 
      waitUntil: 'networkidle', 
      timeout: this.config.timeout 
    });
    
    await this.waitForReader();
    console.log('✅ Kindle page loaded successfully');
  }

  protected async waitForReader(): Promise<void> {
    if (!this.page) return;
    
    await this.page.waitForSelector(
      '.kp-reading-area, .kp-page, #KindleReaderIFrame, .kp-reader, #kindleReader_content', 
      { timeout: this.config.timeout }
    );
  }

  async extractBookMetadata(): Promise<BookMetadata> {
    if (!this.page) throw new Error('Page not available');

    console.log('📖 Extracting book metadata...');
    
    const metadata = await this.page.evaluate(() => {
      const titleElement = document.querySelector('[data-testid="book-title"], .kp-notebook-book-info h3, title');
      const authorElement = document.querySelector('[data-testid="book-author"], .kp-notebook-book-info .a-row:nth-child(2)');
      
      return {
        title: titleElement?.textContent?.trim() || 'Unknown Title',
        author: authorElement?.textContent?.trim() || 'Unknown Author',
        asin: window.location.pathname.match(/\/([A-Z0-9]{10})/)?.[1]
      };
    });
    
    console.log(`📚 Found: "${metadata.title}" by ${metadata.author}`);
    return metadata;
  }

  async extractText(): Promise<string> {
    if (!this.page) throw new Error('Page not available');

    console.log('📝 Extracting text from book...');
    let fullText = '';
    let pageCount = 0;
    const maxPages = 1000;
    
    while (pageCount < maxPages) {
      const pageText = await this.extractPageText();
      
      if (pageText) {
        fullText += pageText + '\n\n---\n\n';
        pageCount++;
        
        if (pageCount % 10 === 0) {
          console.log(`📄 Processed ${pageCount} pages...`);
        }
      }
      
      const hasNext = await this.navigateNextPage();
      if (!hasNext) break;
      
      await this.page.waitForTimeout(2000);
    }
    
    console.log(`✅ Extracted text from ${pageCount} pages`);
    return fullText.trim();
  }

  protected async extractPageText(): Promise<string> {
    if (!this.page) return '';
    
    return await this.page.evaluate(() => {
      const selectors = [
        '.kp-reading-area',
        '.kp-page-content',
        '#KindleReaderIFrame',
        '[data-testid="page-content"]',
        '.a-text-left'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.trim()) {
          return element.textContent.trim();
        }
      }
      
      return '';
    });
  }

  protected async navigateNextPage(): Promise<boolean> {
    if (!this.page) return false;
    
    const clicked = await this.page.evaluate(() => {
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
    
    if (!clicked) {
      await this.page.keyboard.press('ArrowRight');
    }
    
    return true;
  }

  async extractBook(url: string): Promise<ExtractedContent> {
    try {
      await this.initialize();
      await this.navigateToKindle(url);
      
      const metadata = await this.extractBookMetadata();
      const fullText = await this.extractText();
      
      const chapters: Chapter[] = [{
        title: 'Full Text',
        content: fullText,
        pageNumbers: Array.from({ length: fullText.split('---').length }, (_, i) => i + 1)
      }];
      
      return { metadata, chapters, fullText };
      
    } finally {
      await this.cleanup();
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up browser resources...');
    
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    
    this.page = null;
    this.context = null;
    this.browser = null;
  }
}