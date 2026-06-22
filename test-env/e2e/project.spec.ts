import { test, expect } from '@playwright/test';
import { unlockCorrect } from './helpers';

test.describe('Project page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects/xal-test-project');
    await unlockCorrect(page);
  });

  test('shows project title', async ({ page }) => {
    await expect(page.locator('.project-page-title')).toContainText('Test Project');
  });

  test('shows stage badge', async ({ page }) => {
    await expect(page.locator('.project-page-header .stage-badge')).toBeVisible();
  });

  test('shows metadata (started, age, last activity)', async ({ page }) => {
    await expect(page.locator('.project-page-meta .meta-item')).toHaveCount(5);
  });

  test('shows active task section', async ({ page }) => {
    await expect(page.locator('.section-title').first()).toContainText('Active Task');
  });

  test('shows active task box (started task exists)', async ({ page }) => {
    await expect(page.locator('.active-task-box')).toBeVisible();
  });

  test('shows latest post section', async ({ page }) => {
    const titles = page.locator('.section-title');
    const texts = await titles.allTextContents();
    expect(texts.some((t) => t.includes('Latest Post'))).toBeTruthy();
  });

  test('shows blog post card for latest post', async ({ page }) => {
    await expect(page.locator('.blog-card')).toBeVisible();
  });

  test('shows about section with description', async ({ page }) => {
    const titles = page.locator('.section-title');
    const texts = await titles.allTextContents();
    expect(texts.some((t) => t.includes('About'))).toBeTruthy();
  });
});
