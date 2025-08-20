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
    
    try {
      await this.page.waitForSelector(
        '.kp-reading-area, .kp-page, #KindleReaderIFrame, .kp-reader, #kindleReader_content', 
        { timeout: this.config.timeout }
      );
    } catch (error) {
      // Debug: Show what page we're actually on
      const url = this.page.url();
      const title = await this.page.title();
      console.log(`🔍 Current page: ${title}`);
      console.log(`📍 URL: ${url}`);
      
      // Debug: List available elements on the page
      const availableElements = await this.page.evaluate(() => {
        const elements: string[] = [];
        
        // Get actual kp-* class names
        const kpElements = document.querySelectorAll('[class*="kp"]');
        const kpClasses = new Set<string>();
        kpElements.forEach(el => {
          const classes = el.className.split(' ');
          classes.forEach(cls => {
            if (cls.startsWith('kp')) {
              kpClasses.add(`.${cls}`);
            }
          });
        });
        
        // Add first few kp classes found
        Array.from(kpClasses).slice(0, 5).forEach(cls => {
          elements.push(`Found class: ${cls}`);
        });
        
        // Check for specific elements that might contain content
        const contentSelectors = [
          '[class*="content"]', '[class*="text"]', '[class*="page"]',
          'main', 'article', 'section', 'div[role="main"]'
        ];
        
        for (const selector of contentSelectors) {
          const found = document.querySelectorAll(selector);
          if (found.length > 0) {
            elements.push(`${selector}: ${found.length} found`);
          }
        }
        
        return elements.slice(0, 15); // Show more info
      });
      
      console.log('🔍 Available elements on page:');
      availableElements.forEach(elem => console.log(`   ${elem}`));
      
      // Check for landing page or need to open book
      const hasErrorPage = await this.page.locator('.kp-body-error, .kp-landing-page-container').count() > 0;
      const hasLoginForm = await this.page.locator('input[type="email"], input[type="password"], #signInSubmit').count() > 0;
      
      if (hasErrorPage) {
        console.log('📄 On Kindle landing page, looking for "Open Book" or "Read Now" button...');
        
        // Get all buttons and links on the page to find the right one
        const allButtons = await this.page.evaluate(() => {
          const buttons: Array<{
            index: number;
            text: string;
            href: string;
            classes: string;
            tagName: string;
          }> = [];
          const elements = document.querySelectorAll('button, a, [role="button"]');
          elements.forEach((el, i) => {
            const text = el.textContent?.trim() || '';
            const href = el.getAttribute('href') || '';
            const classes = el.className || '';
            if (text || href.includes('read') || classes.includes('read')) {
              buttons.push({
                index: i,
                text: text.slice(0, 50),
                href: href.slice(0, 100),
                classes: classes.slice(0, 100),
                tagName: el.tagName
              });
            }
          });
          return buttons.slice(0, 10);
        });
        
        console.log('🔍 Found buttons/links:');
        allButtons.forEach(btn => {
          console.log(`   ${btn.tagName}: "${btn.text}" href="${btn.href}" class="${btn.classes}"`);
        });
        
        // This seems to be a book preview/share page. 
        // Need to modify URL to get to actual reader
        console.log('💡 This appears to be a book sharing page, not the reader');
        console.log('🔄 Attempting to construct direct reader URL...');
        
        // Extract ASIN from current URL
        const asinMatch = this.page.url().match(/asin=([A-Z0-9]{10})/);
        if (asinMatch) {
          const asin = asinMatch[1];
          const readerUrl = `https://read.amazon.com/?asin=${asin}`;
          console.log(`🔗 Trying direct reader URL: ${readerUrl}`);
          
          await this.page.goto(readerUrl, { waitUntil: 'networkidle' });
          
          // Wait a bit for the reader to load
          await this.page.waitForTimeout(3000);
          
          // Debug what we got at the direct reader URL
          const newTitle = await this.page.title();
          const newUrl = this.page.url();
          console.log(`🔍 After redirect - Page: ${newTitle}`);
          console.log(`📍 After redirect - URL: ${newUrl}`);
          
          // Check if we were redirected to login
          if (newUrl.includes('signin') || newTitle.includes('Sign-In') || newTitle.includes('Login')) {
            console.log('🔐 Direct reader URL requires login - trying manual login flow...');
            
            // Wait for user to login manually
            console.log('📝 Please login to Amazon manually in the visible browser window');
            console.log('⏳ Waiting up to 2 minutes for login completion...');
            
            try {
              // Wait for redirect back to reader or successful login
              await this.page.waitForURL('**/read.amazon.com/**', { timeout: 120000 });
              console.log('✅ Login successful, now on Kindle reader');
              
              // Wait a bit more for reader to load
              await this.page.waitForTimeout(5000);
              
              // Try waiting for reader elements
              await this.page.waitForSelector(
                '.kp-reading-area, .kp-page, #KindleReaderIFrame, .kp-reader, #kindleReader_content', 
                { timeout: this.config.timeout }
              );
              return;
              
            } catch (loginError) {
              console.log('⚠️ Login timeout or failed, trying alternative approach...');
            }
          }
          
          // Try waiting for reader elements if not redirected to login
          try {
            await this.page.waitForSelector(
              '.kp-reading-area, .kp-page, #KindleReaderIFrame, .kp-reader, #kindleReader_content', 
              { timeout: this.config.timeout }
            );
            return;
          } catch (e) {
            console.log('⚠️ Still no reader elements at direct URL, continuing with fallback...');
          }
        }
        
        // Fallback: try clicking available buttons
        const readButtonSelectors = [
          'button:has-text("今すぐ読む")', // Japanese "Read Now"
          'button:has-text("Read Now")',
          'button:has-text("Learn more")', // Try this button we found
          '.kp-primary-button',
          'a:has-text("今すぐ読む")',
          'a:has-text("Read Now")',
          '.kp-start-reading',
          '[data-testid*="read"]',
          'button[class*="read"]',
          'a[class*="read"]:not([href*="email"]):not([href*="facebook"]):not([href*="twitter"])'
        ];
        
        let buttonClicked = false;
        for (const selector of readButtonSelectors) {
          const button = this.page.locator(selector).first();
          if (await button.count() > 0) {
            console.log(`🖱️ Trying to click: ${selector}`);
            try {
              // Try force click to bypass intercepting elements
              await button.click({ force: true, timeout: 5000 });
              buttonClicked = true;
              break;
            } catch (e) {
              console.log(`   ❌ Failed to click ${selector}: ${(e as Error).message}`);
              continue;
            }
          }
        }
        
        if (buttonClicked) {
          console.log('⏳ Waiting for reader to load...');
          await this.page.waitForTimeout(3000);
          // Try waiting for reader again
          await this.page.waitForSelector(
            '.kp-reading-area, .kp-page, #KindleReaderIFrame, .kp-reader, #kindleReader_content', 
            { timeout: this.config.timeout }
          );
          return;
        }
      }
      
      if (hasLoginForm) {
        console.log('🔐 Login page detected - please login manually');
        console.log('⏳ Waiting 120 seconds for manual login...');
        await this.page.waitForURL('**/read.amazon.com/**', { timeout: 120000 });
      }
      
      const hasErrorMessage = await this.page.locator('.a-alert-error, .kp-error-message, .error').count() > 0;
      if (hasErrorMessage) {
        const errorText = await this.page.locator('.a-alert-error, .kp-error-message, .error').first().textContent();
        console.log(`❌ Error on page: ${errorText}`);
      }
      
      throw error;
    }
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