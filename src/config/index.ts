import { ScraperConfig } from '../types';

export const getConfig = (): ScraperConfig => ({
  headless: process.env.HEADLESS === 'true',
  timeout: parseInt(process.env.TIMEOUT || '30000'),
  userDataDir: '/app/profile',
  viewport: {
    width: parseInt(process.env.VIEWPORT_WIDTH || '1280'),
    height: parseInt(process.env.VIEWPORT_HEIGHT || '800')
  }
});