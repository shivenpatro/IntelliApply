// Anonymous smoke checks only; no account credentials or fixture responses.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const access = JSON.parse(readFileSync('preview-report.json', 'utf8'));
if (access.status !== 'app_served') {
  writeFileSync('preview-browser-report.json', JSON.stringify({ status: 'not_run', access: access.status }));
  process.exit(0);
}
const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let errors = 0;
  page.on('pageerror', () => errors++);
  for (const route of ['/', '/login', '/register', '/forgot-password', '/update-password', '/dashboard', '/profile']) {
    const response = await page.goto(access.url + route, { waitUntil: 'domcontentloaded', timeout: 25000 });
    if (route === '/dashboard' || route === '/profile') await page.waitForURL('**/login', { timeout: 20000 });
    else await page.waitForTimeout(1500);
    const finalPath = new URL(page.url()).pathname;
    const passed = response.status() === 200 && errors === 0 &&
      (route === '/dashboard' || route === '/profile' ? finalPath === '/login' : finalPath === route);
    results.push({ route, status: response.status(), finalPath, pageErrors: errors, passed });
    if (route === '/') await page.screenshot({ path: 'preview-desktop.png' });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(access.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(1800);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  results.push({ route: 'mobile landing', viewport: 390, scrollWidth: width, passed: width <= 390 });
  await page.screenshot({ path: 'preview-mobile.png' });
} catch {
  results.push({ passed: false, status: 'browser_check_interrupted' });
} finally {
  await browser.close();
  const passed = results.length === 8 && results.every(item => item.passed);
  writeFileSync('preview-browser-report.json', JSON.stringify({ status: passed ? 'passed' : 'failed', results }, null, 2));
  console.log(JSON.stringify({ previewBrowser: passed ? 'passed' : 'failed', results }));
  if (!passed) process.exitCode = 1;
}
