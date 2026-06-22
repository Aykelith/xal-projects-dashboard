import { test, expect } from '@playwright/test';
import { unlockCorrect } from './helpers';

// 30 projects total: 5 abandoned hidden by default → 25 visible → 3 pages (10/10/5)
// 30 blog posts → 3 pages (10/10/10)
// Descriptions: xal-test-project + test-proj-01..14 = 15 total
// test-proj-01: stage=idea, task=started, has description
// test-proj-15: stage=in_production, task=done, no description

test.describe('Home pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await unlockCorrect(page);
    await page.waitForSelector('.pagination', { timeout: 10_000 });
  });

  test('page 1 shows 10 cards', async ({ page }) => {
    await expect(page.locator('.project-card')).toHaveCount(10);
  });

  test('pagination controls show 3 pages', async ({ page }) => {
    const pageButtons = page.locator('.page-btn[data-page], .pagination .page-btn').filter({ hasText: /^\d+$/ });
    await expect(pageButtons).toHaveCount(3);
  });

  test('page 2 shows 10 different cards', async ({ page }) => {
    const firstCardTitle = await page.locator('.project-card-title').first().textContent();
    await page.locator('.pagination .page-btn').filter({ hasText: '2' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('.project-card')).toHaveCount(10);
    const newFirstTitle = await page.locator('.project-card-title').first().textContent();
    expect(newFirstTitle).not.toBe(firstCardTitle);
  });

  test('page 3 shows 5 cards', async ({ page }) => {
    await page.locator('.pagination .page-btn').filter({ hasText: '3' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('.project-card')).toHaveCount(5);
  });
});

test.describe('Blog pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog');
    await unlockCorrect(page);
    await page.waitForSelector('.pagination', { timeout: 10_000 });
  });

  test('page 1 shows 10 posts', async ({ page }) => {
    await expect(page.locator('.blog-card')).toHaveCount(10);
  });

  test('pagination controls show 3 pages', async ({ page }) => {
    const pageButtons = page.locator('.pagination .page-btn').filter({ hasText: /^\d+$/ });
    await expect(pageButtons).toHaveCount(3);
  });

  test('page 2 shows 10 posts', async ({ page }) => {
    await page.locator('.pagination .page-btn').filter({ hasText: '2' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('.blog-card')).toHaveCount(10);
  });

  test('page 3 shows 10 posts', async ({ page }) => {
    await page.locator('.pagination .page-btn').filter({ hasText: '3' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('.blog-card')).toHaveCount(10);
  });
});

test.describe('Project with description (test-proj-01)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects/test-proj-01');
    await unlockCorrect(page);
  });

  test('shows project title', async ({ page }) => {
    await expect(page.locator('.project-page-title')).toContainText('Test Project 01');
  });

  test('shows About section', async ({ page }) => {
    const titles = page.locator('.section-title');
    const texts = await titles.allTextContents();
    expect(texts.some((t) => t.includes('About'))).toBeTruthy();
  });

  test('description content is rendered', async ({ page }) => {
    await expect(page.locator('.prose')).toContainText('test-proj-01');
  });

  test('active task box is visible (started task)', async ({ page }) => {
    await expect(page.locator('.active-task-box')).toBeVisible();
  });

  test('cover image is present', async ({ page }) => {
    // Either encrypted image or plain img, both visible on the page
    const coverLocator = page.locator('.cover-image').first();
    await expect(coverLocator).toBeVisible();
  });
});

test.describe('Project without description (test-proj-15)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects/test-proj-15');
    await unlockCorrect(page);
  });

  test('shows project title', async ({ page }) => {
    await expect(page.locator('.project-page-title')).toContainText('Test Project 15');
  });

  test('no About section (description absent)', async ({ page }) => {
    const titles = page.locator('.section-title');
    const texts = await titles.allTextContents();
    expect(texts.some((t) => t.includes('About'))).toBeFalsy();
  });

  test('no active task (task stage is done)', async ({ page }) => {
    await expect(page.locator('.no-content').first()).toBeVisible();
  });

  test('shows latest post card', async ({ page }) => {
    await expect(page.locator('.blog-card')).toBeVisible();
  });
});

test.describe('Project page photos', () => {
  test('home page card has photo element', async ({ page }) => {
    await page.goto('/');
    await unlockCorrect(page);
    // EncryptedImage renders as an img once decrypted; before decryption it may render a placeholder
    // Either way the card image container should be present
    const card = page.locator('.project-card').first();
    await expect(card.locator('img, .img-placeholder')).toBeVisible();
  });

  test('project page shows cover image', async ({ page }) => {
    await page.goto('/projects/test-proj-01');
    await unlockCorrect(page);
    await expect(page.locator('.cover-image').first()).toBeVisible();
  });
});
