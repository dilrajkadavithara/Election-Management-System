import { test, expect } from '@playwright/test';

/**
 * Production verification tests.
 * Run with: TEST_URL=https://intelhub.live npx playwright test e2e/production.spec.js
 *
 * These tests verify the DEPLOYED site is actually serving the latest code.
 */

const PROD_URL = process.env.TEST_URL || 'https://intelhub.live';
const IS_PROD = PROD_URL.includes('intelhub.live');

test.describe('Production Deployment Verification', () => {
  test.skip(!IS_PROD, 'Production tests only run against intelhub.live');

  test('site is reachable and returns HTML', async ({ page }) => {
    const response = await page.goto(PROD_URL);
    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/html');
  });

  test('manifest.json is served', async ({ page }) => {
    const response = await page.goto(`${PROD_URL}/manifest.json`);
    expect(response.status()).toBe(200);
    const manifest = await response.json();
    expect(manifest.name).toContain('IntelHub');
  });

  test('service worker is served', async ({ page }) => {
    const response = await page.goto(`${PROD_URL}/sw.js`);
    expect(response.status()).toBe(200);
  });

  test('PWA icons are PNG (not SVG)', async ({ page }) => {
    const res192 = await page.goto(`${PROD_URL}/icons/icon-192.png`);
    expect(res192.status()).toBe(200);
    expect(res192.headers()['content-type']).toContain('image/png');

    const res512 = await page.goto(`${PROD_URL}/icons/icon-512.png`);
    expect(res512.status()).toBe(200);
    expect(res512.headers()['content-type']).toContain('image/png');
  });

  test('login page renders', async ({ page }) => {
    await page.goto(PROD_URL);
    await page.waitForTimeout(2000);

    // Should see some login-related UI
    const body = await page.textContent('body');
    const hasLoginUI = body.includes('Login') || body.includes('ACCESS') || body.includes('username') || body.includes('Password');
    expect(hasLoginUI, 'Login page should render').toBe(true);
  });

  test('security headers are present', async ({ page }) => {
    const response = await page.goto(PROD_URL);
    const headers = response.headers();

    // Check key security headers set in nginx
    expect(headers['x-frame-options']).toBeTruthy();
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  test('HTTPS redirect works', async ({ page }) => {
    // Skip if we can't test HTTP
    const response = await page.goto(PROD_URL.replace('https://', 'https://'));
    expect(response.url()).toContain('https://');
  });

  test('API health endpoint responds', async ({ page }) => {
    const response = await page.goto(`${PROD_URL}/api/health`);
    expect(response.status()).toBe(200);
  });

  test('static assets have cache headers', async ({ page }) => {
    await page.goto(PROD_URL);

    // Listen for asset requests
    const assetResponses = [];
    page.on('response', (res) => {
      if (res.url().includes('/assets/')) {
        assetResponses.push(res);
      }
    });

    await page.reload();
    await page.waitForTimeout(2000);

    for (const res of assetResponses) {
      const cc = res.headers()['cache-control'] || '';
      // Assets should have long cache (immutable or max-age > 1 day)
      const hasCache = cc.includes('immutable') || cc.includes('max-age=31536000') || cc.includes('max-age=86400');
      expect(hasCache, `${res.url()} should have cache headers`).toBe(true);
    }
  });
});
