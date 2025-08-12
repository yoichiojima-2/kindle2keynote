import { chromium } from 'playwright';
import { BaseScraper } from './BaseScraper';

export class KindleScraper extends BaseScraper {

  async initialize(): Promise<void> {
    console.log('🔧 Initializing browser...');
    
    this.browser = await chromium.launch({
      headless: this.config.headless,
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security'
      ]
    });

    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: this.config.viewport,
      extraHTTPHeaders: {
        'Accept-Language': 'ja-JP,ja;q=0.9,en-US,en;q=0.8'
      }
    });

    this.page = await this.context.newPage();
    
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['ja-JP', 'ja', 'en-US', 'en'] });
    });
  }

}