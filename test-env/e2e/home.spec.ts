import { test, expect } from '@playwright/test';
import { unlockCorrect } from './helpers';

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await unlockCorrect(page);
  });

  test('loads and shows project cards', async ({ page }) => {
    await expect(page.locator('.project-card')).toHaveCount(10);
  });

  test('shows project title in card', async ({ page }) => {
    await expect(page.locator('.project-card-title').first()).toContainText('Test Project');
  });

  test('shows stage badge', async ({ page }) => {
    await expect(page.locator('.stage-badge').first()).toBeVisible();
  });

  test('shows controls (sort and filter)', async ({ page }) => {
    await page.waitForSelector('.controls', { timeout: 5000 });
    await expect(page.locator('.controls')).toBeVisible();
  });

  test('sort buttons are present', async ({ page }) => {
    await page.waitForSelector('.sort-buttons', { timeout: 5000 });
    await expect(page.locator('.sort-buttons .btn').first()).toBeVisible();
  });

  test('stage filter chips are present', async ({ page }) => {
    await page.waitForSelector('.stage-filters', { timeout: 5000 });
    const chips = page.locator('.stage-chip');
    await expect(chips).toHaveCount(6);
  });

  test('view project link points to project page', async ({ page }) => {
    const link = page.locator('.btn-primary').first();
    await expect(link).toHaveAttribute('href', '/projects/xal-test-project');
  });

  test('filtering out all stages hides cards and shows empty state', async ({ page }) => {
    await page.waitForSelector('.stage-chip', { timeout: 5000 });
    const chips = page.locator('.stage-chip.selected');
    const count = await chips.count();
    for (let i = 0; i < count; i++) {
      await chips.nth(0).click();
    }
    await expect(page.locator('.empty-state')).toBeVisible();
  });

  test('sorting by started_at keeps cards visible', async ({ page }) => {
    await page.waitForSelector('.sort-buttons', { timeout: 5000 });
    await page.locator('.sort-buttons .btn').nth(1).click();
    await expect(page.locator('.project-card')).toHaveCount(10);
  });
});
