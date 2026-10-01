import {defineConfig,chromium} from '@playwright/test';
import config from './playwright.config';
export default defineConfig({...config,use:{...config.use,launchOptions:{executablePath:chromium.executablePath()}}});
