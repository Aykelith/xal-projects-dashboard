import { test, expect } from '@playwright/test';
import { unlockCorrect } from './helpers';

test.describe('Blog list page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog');
    await unlockCorrect(page);
  });

  test('loads and shows blog post cards', async ({ page }) => {
    await expect(page.locator('.blog-card')).toHaveCount(10);
  });

  test('shows post title', async ({ page }) => {
    await expect(page.locator('.blog-card-title').first()).toContainText(
      'First update on the test project'
    );
  });

  test('shows project link in card', async ({ page }) => {
    await expect(page.locator('.blog-card-project').first()).toBeVisible();
  });

  test('shows tags', async ({ page }) => {
    await expect(page.locator('.blog-card .tag').first()).toBeVisible();
  });

  test('shows post excerpt', async ({ page }) => {
    await expect(page.locator('.blog-card-excerpt').first()).toBeVisible();
  });

  test('controls bar is visible after hydration', async ({ page }) => {
    await page.waitForSelector('.controls', { timeout: 5000 });
    await expect(page.locator('.controls')).toBeVisible();
  });

  test('search filters posts by title', async ({ page }) => {
    await page.waitForSelector('.search-input', { timeout: 5000 });
    await page.locator('.search-input').fill('nonexistent query xyz');
    await expect(page.locator('.empty-state')).toBeVisible();
  });

  test('search clearing restores posts', async ({ page }) => {
    await page.waitForSelector('.search-input', { timeout: 5000 });
    await page.locator('.search-input').fill('nonexistent');
    await page.locator('.search-input').fill('');
    await expect(page.locator('.blog-card')).toHaveCount(10);
  });
});

test.describe('Blog post page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog/xal-test-project/01jx0v2pk8abcdef0000000002');
    await unlockCorrect(page);
  });

  test('shows post title', async ({ page }) => {
    await expect(page.locator('.post-title')).toContainText(
      'First update on the test project'
    );
  });

  test('shows project link', async ({ page }) => {
    const link = page.locator('.post-meta a[href="/projects/xal-test-project"]');
    await expect(link).toBeVisible();
  });

  test('shows published date', async ({ page }) => {
    await expect(page.locator('.post-meta')).toContainText('Published');
  });

  test('shows tags', async ({ page }) => {
    await expect(page.locator('.post-meta .tag').first()).toBeVisible();
  });

  test('renders post content', async ({ page }) => {
    await expect(page.locator('.prose')).toBeVisible();
  });
});
