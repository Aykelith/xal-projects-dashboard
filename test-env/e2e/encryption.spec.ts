import { test, expect, type Page } from '@playwright/test';

// Capture browser errors so CI output shows them on failure.
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (err) => console.error('[browser error]', err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('[browser console]', msg.text());
  });
  page.on('response', (res) => {
    if (res.status() >= 400) console.error('[404]', res.status(), res.url());
  });
});

// PBKDF2 (300k iterations) takes ~1s in browser — unlock steps need more time.
const UNLOCK_TIMEOUT = 15_000;

async function expectOverlay(page: Page) {
  await expect(page.locator('.password-overlay')).toBeVisible({ timeout: 10_000 });
}

async function unlock(page: Page, password: string) {
  await expectOverlay(page);
  await page.locator('.password-input').fill(password);
  await expect(page.locator('.password-form button[type="submit"]')).toBeEnabled({ timeout: 3_000 });
  await page.locator('.password-form button[type="submit"]').click();
}

async function unlockCorrect(page: Page) {
  await unlock(page, 'testpass123');
  await expect(page.locator('.password-overlay')).not.toBeVisible({ timeout: UNLOCK_TIMEOUT });
}

// ── PasswordGate ───────────────────────────────────────────────────────────

test.describe('PasswordGate', () => {
  test('overlay appears on home page', async ({ page }) => {
    await page.goto('/');
    await expectOverlay(page);
  });

  test('overlay appears on project page', async ({ page }) => {
    await page.goto('/projects/xal-test-project');
    await expectOverlay(page);
  });

  test('overlay appears on blog post page', async ({ page }) => {
    await page.goto('/blog/xal-test-project/01jx0v2pk8abcdef0000000002');
    await expectOverlay(page);
  });

  test('submit button disabled when input is empty', async ({ page }) => {
    await page.goto('/');
    await expectOverlay(page);
    await expect(page.locator('.password-form button[type="submit"]')).toBeDisabled();
  });

  test('wrong password shows error, overlay stays', async ({ page }) => {
    await page.goto('/');
    await unlock(page, 'wrong-password');
    await expect(page.locator('.password-error')).toContainText('Wrong password', {
      timeout: UNLOCK_TIMEOUT,
    });
    await expect(page.locator('.password-overlay')).toBeVisible();
  });

  test('correct password dismisses overlay', async ({ page }) => {
    await page.goto('/');
    await unlockCorrect(page);
  });
});

// ── Home page ──────────────────────────────────────────────────────────────

test.describe('Home page — encrypted content', () => {
  test('project card shows encrypted placeholder before unlock', async ({ page }) => {
    await page.goto('/');
    await expectOverlay(page);
    // Content placeholder rendered by EncryptedContent before key is set.
    await expect(page.locator('.project-card').first()).toContainText('🔒');
  });

  test('home_description decrypts after unlock', async ({ page }) => {
    await page.goto('/');
    await unlockCorrect(page);
    // Encrypted placeholder gone; actual description content visible.
    await expect(page.locator('.project-card-description').first()).not.toContainText('🔒', {
      timeout: 10_000,
    });
    await expect(page.locator('.project-card-description').first()).toBeVisible();
  });

  test('thumbnail auto-decrypts after unlock', async ({ page }) => {
    await page.goto('/');
    await unlockCorrect(page);
    // EncryptedImage (decryptOnLoad=true) sets src to blob: URL once decrypted.
    await expect(page.locator('.project-card-image img').first()).toHaveAttribute('src', /^blob:/, {
      timeout: 10_000,
    });
  });
});

// ── Project page ───────────────────────────────────────────────────────────

test.describe('Project page — encrypted content', () => {
  test('description shows encrypted placeholder before unlock', async ({ page }) => {
    await page.goto('/projects/xal-test-project');
    await expectOverlay(page);
    await expect(page.locator('main')).toContainText('🔒');
  });

  test('description decrypts after unlock', async ({ page }) => {
    await page.goto('/projects/xal-test-project');
    await unlockCorrect(page);
    await expect(page.locator('.encrypted-markdown')).toBeVisible({ timeout: 10_000 });
    // Raw markdown body — should include content from the test description file.
    await expect(page.locator('.encrypted-markdown')).toContainText('test project', {
      timeout: 10_000,
    });
  });

  test('cover image auto-decrypts after unlock', async ({ page }) => {
    await page.goto('/projects/xal-test-project');
    await unlockCorrect(page);
    await expect(page.locator('.cover-image')).toHaveAttribute('src', /^blob:/, {
      timeout: 10_000,
    });
  });

  test('DecryptAllButton hidden before unlock', async ({ page }) => {
    await page.goto('/projects/xal-test-project');
    await expectOverlay(page);
    await expect(page.locator('button:has-text("Decrypt all images")')).not.toBeVisible();
  });

  test('DecryptAllButton visible after unlock', async ({ page }) => {
    await page.goto('/projects/xal-test-project');
    await unlockCorrect(page);
    await expect(page.locator('button:has-text("Decrypt all images")')).toBeVisible({
      timeout: 10_000,
    });
  });
});

// ── Blog post page ─────────────────────────────────────────────────────────

test.describe('Blog post page — encrypted content', () => {
  const POST_URL = '/blog/xal-test-project/01jx0v2pk8abcdef0000000002';

  test('title visible without unlock (frontmatter stays plaintext)', async ({ page }) => {
    await page.goto(POST_URL);
    // Title is in plaintext frontmatter — visible even with overlay up.
    await expect(page.locator('.post-title')).toContainText('First update on the test project');
  });

  test('post body shows encrypted placeholder before unlock', async ({ page }) => {
    await page.goto(POST_URL);
    await expectOverlay(page);
    await expect(page.locator('.prose')).toContainText('🔒');
  });

  test('post body decrypts after unlock', async ({ page }) => {
    await page.goto(POST_URL);
    await unlockCorrect(page);
    await expect(page.locator('.encrypted-markdown')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.encrypted-markdown')).toContainText('first paragraph', {
      timeout: 10_000,
    });
  });
});
