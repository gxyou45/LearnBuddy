import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/acceptance',outputDir:'/tmp/learnbuddy-visual-acceptance',workers:1,timeout:150000,expect:{timeout:12000},use:{baseURL:process.env.PLAYWRIGHT_BASE_URL||'http://localhost:8080',channel:'chrome',viewport:{width:393,height:851},trace:'retain-on-failure'},reporter:'json'});
