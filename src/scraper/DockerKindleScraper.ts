import { Browser, BrowserContext, Page, chromium, firefox } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { KindleScraper, ExtractedContent, BookMetadata, Chapter } from './KindleScraper';

export class DockerKindleScraper extends KindleScraper {
  private profileDir: string;
  private cookiesFile: string;

  constructor() {
    super();
    this.profileDir = join(__dirname, '../../profile');
    this.cookiesFile = join(this.profileDir, 'cookies.json');
    
    // Ensure profile directory exists
    if (!existsSync(this.profileDir)) {
      mkdirSync(this.profileDir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    console.log('🐳 Initializing Docker-optimized browser...');
    
    // Use Firefox in Docker as it often works better with Kindle
    this.browser = await firefox.launch({
      headless: process.env.HEADLESS !== 'false',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process'
      ]
    });

    // Create persistent context to save login
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['clipboard-read', 'clipboard-write'],
      bypassCSP: true,
      ignoreHTTPSErrors: true
    });

    // Load saved cookies if they exist
    if (existsSync(this.cookiesFile)) {
      try {
        const cookies = JSON.parse(readFileSync(this.cookiesFile, 'utf8'));
        await this.context.addCookies(cookies);
        console.log('✅ Loaded saved session');
      } catch (error) {
        console.log('⚠️ Could not load saved session, will need to login');
      }
    }

    this.page = await this.context.newPage();
    
    // Enhanced stealth measures for Linux
    await this.page.addInitScript(() => {
      // Override navigator properties
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Linux x86_64',
      });
      
      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => ({
          0: { name: 'Chrome PDF Plugin' },
          1: { name: 'Chrome PDF Viewer' },
          2: { name: 'Native Client' },
          length: 3
        }),
      });
      
      // Mock WebGL vendor
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.apply(this, [parameter]);
      };
    });
  }

  async navigateToKindle(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log('🌐 Navigating to Kindle Cloud Reader...');
    
    try {
      // First, go to Amazon main page to establish session
      await this.page.goto('https://www.amazon.com', { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });
      
      // Check if we need to login
      const isLoggedIn = await this.page.evaluate(() => {
        return document.querySelector('#nav-link-accountList-nav-line-1')?.textContent?.includes('Hello') || false;
      });

      if (!isLoggedIn) {
        console.log('📝 Please login to Amazon...');
        console.log('Waiting for login... (you have 2 minutes)');
        
        // Wait for user to login
        await this.page.waitForSelector('#nav-link-accountList-nav-line-1:has-text("Hello")', {
          timeout: 120000
        });
        
        // Save cookies after login
        const cookies = await this.context!.cookies();
        writeFileSync(this.cookiesFile, JSON.stringify(cookies, null, 2));
        console.log('✅ Login successful, session saved');
      }

      // Now navigate to Kindle Cloud Reader
      await this.page.goto(url || 'https://read.amazon.com', { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });
      
      // Handle the "Choose your Kindle" dialog if it appears
      try {
        const kindleDialog = await this.page.waitForSelector('.kp-kindle-device-select', { timeout: 5000 });
        if (kindleDialog) {
          const firstDevice = await this.page.$('.kp-kindle-device-select button:first-child');
          if (firstDevice) {
            await firstDevice.click();
            await this.page.waitForTimeout(2000);
          }
        }
      } catch {
        // No device selection needed
      }
      
      // Wait for the reader to load
      await this.page.waitForSelector('.kp-reader, #KindleReaderFrame, #kindleReader_content', { 
        timeout: 60000 
      });
      
      console.log('✅ Kindle reader loaded successfully');
      
      // Check if book is accessible
      const errorMessage = await this.page.evaluate(() => {
        const error = document.querySelector('.kp-error-message, .a-alert-content');
        return error?.textContent || null;
      });
      
      if (errorMessage && errorMessage.includes("can't open this book")) {
        throw new Error('This book is restricted to Kindle apps only. Try a different book or use the Kindle app.');
      }
      
    } catch (error: any) {
      if (error.message.includes('restricted')) {
        throw error;
      }
      console.error('❌ Failed to navigate to Kindle:', error);
      
      // Take a screenshot for debugging
      const screenshotPath = join(this.profileDir, 'error-screenshot.png');
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved to ${screenshotPath}`);
      
      throw error;
    }
  }

  async extractText(): Promise<string> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    console.log('📝 Extracting text from book (Docker-optimized method)...');
    
    let fullText = '';
    let pageCount = 0;
    const maxPages = 1000;
    let lastPageContent = '';
    
    try {
      // Wait for reader to be fully loaded
      await this.page.waitForTimeout(5000);
      
      // Try to maximize reading area
      await this.page.evaluate(() => {
        // Hide navigation elements
        const elementsToHide = [
          '.kp-reader-header',
          '.kp-reader-footer',
          '.kp-notebook-annotations-pane'
        ];
        elementsToHide.forEach(selector => {
          const elem = document.querySelector(selector) as HTMLElement;
          if (elem) elem.style.display = 'none';
        });
      });
      
      while (pageCount < maxPages) {
        // Extract text with multiple strategies
        const pageData = await this.page.evaluate(() => {
          let text = '';
          
          // Strategy 1: Try iframe content
          const iframe = document.querySelector('#KindleReaderIFrame, #kindleReader_content_iframe') as HTMLIFrameElement;
          if (iframe && iframe.contentDocument) {
            try {
              const iframeBody = iframe.contentDocument.body;
              if (iframeBody) {
                // Get all text nodes
                const walker = document.createTreeWalker(
                  iframeBody,
                  NodeFilter.SHOW_TEXT,
                  null
                );
                let node;
                while (node = walker.nextNode()) {
                  const nodeText = node.textContent?.trim();
                  if (nodeText && nodeText.length > 0) {
                    text += nodeText + ' ';
                  }
                }
              }
            } catch (e) {
              console.log('Could not access iframe:', e);
            }
          }
          
          // Strategy 2: Direct page content
          if (!text) {
            const contentSelectors = [
              '.kp-reader-content',
              '.kp-notebook-content',
              '#kindleReader_content',
              '.a-container'
            ];
            
            for (const selector of contentSelectors) {
              const elements = document.querySelectorAll(selector);
              for (const element of elements) {
                const elemText = element.textContent?.trim();
                if (elemText && elemText.length > 50) {
                  text += elemText + '\n';
                }
              }
              if (text) break;
            }
          }
          
          // Get page number if available
          const pageNum = document.querySelector('.kp-reader-page-number, .pageNumber')?.textContent || '';
          
          return { text: text.trim(), pageNum };
        });
        
        if (pageData.text && pageData.text !== lastPageContent) {
          fullText += `\n\n--- Page ${pageData.pageNum || pageCount + 1} ---\n\n${pageData.text}`;
          lastPageContent = pageData.text;
          pageCount++;
          
          if (pageCount % 5 === 0) {
            console.log(`📄 Processed ${pageCount} pages...`);
          }
        }
        
        // Navigate to next page
        const navigated = await this.navigateNextPage();
        if (!navigated) {
          console.log('📄 Reached end of book');
          break;
        }
        
        // Wait for content to load
        await this.page.waitForTimeout(2000);
      }
      
      console.log(`✅ Extracted text from ${pageCount} pages`);
      return fullText.trim();
      
    } catch (error) {
      console.error('❌ Error extracting text:', error);
      throw error;
    }
  }

  private async navigateNextPage(): Promise<boolean> {
    if (!this.page) return false;
    
    try {
      // Try multiple navigation methods
      
      // Method 1: Click next button
      const nextButton = await this.page.$('.kp-reader-nav-next, [aria-label*="next"], .a-button-next');
      if (nextButton) {
        const isDisabled = await nextButton.evaluate(el => el.hasAttribute('disabled') || el.classList.contains('disabled'));
        if (!isDisabled) {
          await nextButton.click();
          return true;
        }
      }
      
      // Method 2: Keyboard navigation
      await this.page.keyboard.press('ArrowRight');
      await this.page.waitForTimeout(1000);
      
      // Check if page changed
      const currentContent = await this.page.evaluate(() => {
        const content = document.querySelector('.kp-reader-content, #kindleReader_content');
        return content?.textContent?.substring(0, 100) || '';
      });
      
      return true; // Assume navigation worked
      
    } catch (error) {
      console.log('Could not navigate to next page');
      return false;
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Docker browser resources...');
    
    // Save cookies before cleanup
    if (this.context) {
      try {
        const cookies = await this.context.cookies();
        writeFileSync(this.cookiesFile, JSON.stringify(cookies, null, 2));
        console.log('💾 Session saved for next run');
      } catch (error) {
        console.log('Could not save session');
      }
    }
    
    await super.cleanup();
  }
}