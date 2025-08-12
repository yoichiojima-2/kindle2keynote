import { ScraperConfig } from '../types';

export const getConfig = (): ScraperConfig => ({
  headless: process.env.HEADLESS !== 'false',
  timeout: parseInt(process.env.TIMEOUT || '30000'),
  userDataDir: process.env.USER_DATA_DIR || './profile',
  viewport: {
    width: parseInt(process.env.VIEWPORT_WIDTH || '1280'),
    height: parseInt(process.env.VIEWPORT_HEIGHT || '800')
  }
});

export const isDocker = (): boolean => {
  return process.env.DOCKER_ENV === 'true' || process.env.DISPLAY === ':99';
};