import { test, expect } from '@playwright/test';
import { loginAs } from './helpers.js';

test.describe('Voter Edit Modal', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'BOOTH_AGENT');
    await page.goto('/');
    await page.waitForTimeout(2000);
  });

  async function navigateToVoterList(page) {
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 1024) {
      // Mobile: open sidebar via hamburger
      await page.locator('button:has(span:text("☰"))').click();
      await page.waitForTimeout(500);
    }
    // Click Voter List nav item
    await page.locator('nav button', { hasText: 'Voter List' }).click();
    await page.waitForTimeout(2000);
  }

  async function openEditModal(page) {
    await navigateToVoterList(page);
    // Wait for voter data to render, then click Update Profile or Edit Again
    const editBtn = page.getByRole('button', { name: /Update Profile|Edit Again/ }).first();
    await editBtn.waitFor({ state: 'visible', timeout: 10000 });
    await editBtn.click();
    await page.waitForTimeout(500);
  }

  test('has a visible close (✕) button', async ({ page }) => {
    await openEditModal(page);
    const closeBtn = page.locator('button[title="Close"]');
    await expect(closeBtn).toBeVisible();
  });

  test('closes when ✕ button is clicked', async ({ page }) => {
    await openEditModal(page);
    await page.locator('button[title="Close"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('button[title="Close"]')).not.toBeVisible();
  });

  test('closes when backdrop is clicked', async ({ page }) => {
    await openEditModal(page);
    // Click the very top-left edge which is always the backdrop, not the card
    const viewport = page.viewportSize();
    await page.mouse.click(viewport.width < 1024 ? 5 : 425, 5);
    await page.waitForTimeout(300);
    await expect(page.locator('button[title="Close"]')).not.toBeVisible();
  });

  test('has sticky Save button on mobile', async ({ page }) => {
    test.skip(page.viewportSize()?.width > 1024, 'Mobile-only test');
    await openEditModal(page);
    const saveBtn = page.getByRole('button', { name: 'Save' }).first();
    await expect(saveBtn).toBeVisible();
    const box = await saveBtn.boundingBox();
    expect(box.y).toBeLessThan(120);
  });

  test('modal does not overlap sidebar on desktop', async ({ page }) => {
    test.skip(page.viewportSize()?.width < 1024, 'Desktop-only test');
    await openEditModal(page);
    const modal = page.locator('.fixed.backdrop-blur-md').first();
    const box = await modal.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(400);
  });

  test('phone input has tel type', async ({ page }) => {
    await openEditModal(page);
    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toBeVisible();
    await expect(phoneInput).toHaveAttribute('inputMode', 'numeric');
  });

  test('shows all 4 party options', async ({ page }) => {
    await openEditModal(page);
    for (const party of ['യു.ഡി.എഫ്', 'എൽ.ഡി.എഫ്', 'എൻ.ഡി.എ', 'നിഷ്പക്ഷൻ']) {
      await expect(page.getByText(party).first()).toBeVisible();
    }
  });

  test('gender/age pills do not use uppercase CSS', async ({ page }) => {
    await openEditModal(page);
    const pills = page.locator('.rounded-full.tracking-tighter');
    const count = await pills.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const tt = await pills.nth(i).evaluate(el => getComputedStyle(el).textTransform);
      expect(tt).not.toBe('uppercase');
    }
  });
});
