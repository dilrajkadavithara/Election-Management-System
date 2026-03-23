import { test, expect } from '@playwright/test';

test.describe('PWA Configuration', () => {

  test('manifest.json is served and valid', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    expect(response.status()).toBe(200);

    const manifest = await response.json();

    // Required fields
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');

    // Icons — must have at least 192x192 and 512x512
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    const sizes = manifest.icons.map(i => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');

    // Icons must be PNG (not SVG) for broad browser support
    for (const icon of manifest.icons) {
      expect(icon.type, `Icon ${icon.src} should be PNG`).toBe('image/png');
      expect(icon.src, `Icon ${icon.src} should end with .png`).toMatch(/\.png$/);
    }
  });

  test('PWA icons exist and are valid images', async ({ page }) => {
    // Check 192px icon
    const res192 = await page.goto('/icons/icon-192.png');
    expect(res192.status(), 'icon-192.png should exist').toBe(200);
    const type192 = res192.headers()['content-type'];
    expect(type192).toContain('image/png');

    // Check 512px icon
    const res512 = await page.goto('/icons/icon-512.png');
    expect(res512.status(), 'icon-512.png should exist').toBe(200);
    const type512 = res512.headers()['content-type'];
    expect(type512).toContain('image/png');
  });

  test('service worker is served', async ({ page }) => {
    const response = await page.goto('/sw.js');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('addEventListener');
    expect(body).toContain('fetch');
  });

  test('index.html has manifest link', async ({ page }) => {
    await page.goto('/');
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');
  });

  test('index.html has theme-color meta', async ({ page }) => {
    await page.goto('/');
    const meta = page.locator('meta[name="theme-color"]');
    const content = await meta.getAttribute('content');
    expect(content).toBeTruthy();
  });

  test('index.html has apple-mobile-web-app-capable', async ({ page }) => {
    await page.goto('/');
    const meta = page.locator('meta[name="apple-mobile-web-app-capable"]');
    await expect(meta).toHaveAttribute('content', 'yes');
  });

  test('service worker registers on page load', async ({ page }) => {
    await page.goto('/');
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration('/');
      return !!reg;
    });
    expect(swRegistered, 'Service worker should be registered').toBe(true);
  });

  test('PWA install prompt is mobile-only', async ({ page }) => {
    // Check the component source — it should skip on desktop (>1024px)
    await page.goto('/');
    await page.waitForTimeout(1000);

    const viewport = page.viewportSize();
    if (viewport && viewport.width > 1024) {
      // On desktop, install prompt should NOT be shown
      const prompt = page.locator('text=Install IntelHub');
      await expect(prompt).not.toBeVisible();
    }
  });
});
