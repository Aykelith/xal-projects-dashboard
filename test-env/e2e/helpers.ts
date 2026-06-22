import { expect, type Page } from '@playwright/test';

export const UNLOCK_TIMEOUT = 15_000;

export async function unlockCorrect(page: Page) {
  await expect(page.locator('.password-overlay')).toBeVisible({ timeout: 10_000 });
  await page.locator('.password-input').fill('testpass123');
  await expect(page.locator('.password-form button[type="submit"]')).toBeEnabled({ timeout: 3_000 });
  await page.locator('.password-form button[type="submit"]').click();
  await expect(page.locator('.password-overlay')).not.toBeVisible({ timeout: UNLOCK_TIMEOUT });
}
