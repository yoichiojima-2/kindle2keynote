import { firefox } from 'playwright';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { BaseScraper } from './BaseScraper';

export class KindleScraper extends BaseScraper {
  private profileDir: string;
  private cookiesFile: string;

  constructor() {
    super();
    this.profileDir = '/app/profile';
    this.cookiesFile = join(this.profileDir, 'cookies.json');
    
    if (!existsSync(this.profileDir)) {
      mkdirSync(this.profileDir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing browser...');
    
    this.browser = await firefox.launch({
      headless: this.config.headless,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      viewport: this.config.viewport,
      locale: 'ja-JP',  // Changed to Japanese locale for better compatibility
      ignoreHTTPSErrors: true,
      acceptDownloads: true
    });

    await this.loadSavedSession();
    this.page = await this.context.newPage();
    
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'platform', { get: () => 'Linux x86_64' });
    });
  }

  async navigateToKindle(url: string): Promise<void> {
    await this.ensureLoggedIn();
    await super.navigateToKindle(url);
    
    // Check for book restrictions
    const errorMessage = await this.page!.evaluate(() => {
      const error = document.querySelector('.kp-error-message, .a-alert-content');
      return error?.textContent || null;
    });
    
    if (errorMessage?.includes("can't open this book")) {
      throw new Error('Book restricted to Kindle apps only');
    }
  }

  private async loadSavedSession(): Promise<void> {
    if (existsSync(this.cookiesFile)) {
      try {
        const cookies = JSON.parse(readFileSync(this.cookiesFile, 'utf8'));
        await this.context!.addCookies(cookies);
        console.log('✅ Loaded saved session');
      } catch (error) {
        console.log('⚠️ Could not load saved session');
      }
    }
  }

  private async ensureLoggedIn(): Promise<void> {
    if (!this.page) return;
    
    // Always use Amazon Japan for Japanese users
    const amazonDomain = 'https://www.amazon.co.jp';
    
    await this.page.goto(amazonDomain, { waitUntil: 'networkidle' });
    
    const isLoggedIn = await this.page.evaluate(() => {
      // Check for both English and Japanese login indicators
      const accountElement = document.querySelector('#nav-link-accountList-nav-line-1');
      return accountElement?.textContent?.includes('Hello') || 
             accountElement?.textContent?.includes('こんにちは') || 
             false;
    });

    if (!isLoggedIn) {
      console.log('📝 Please login to Amazon (2 minutes timeout)...');
      console.log(`🌐 Domain: ${amazonDomain}`);
      
      // Wait for login - accept both English and Japanese indicators
      await this.page.waitForFunction(() => {
        const accountElement = document.querySelector('#nav-link-accountList-nav-line-1');
        return accountElement?.textContent?.includes('Hello') || 
               accountElement?.textContent?.includes('こんにちは');
      }, { timeout: 120000 });
      
      const cookies = await this.context!.cookies();
      writeFileSync(this.cookiesFile, JSON.stringify(cookies, null, 2));
      console.log('✅ Login saved');
    }
  }


  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up browser resources...');
    
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