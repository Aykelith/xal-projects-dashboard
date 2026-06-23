import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'data');

// Fixed salt so every test run uses the same PBKDF2 key — prevents salt mismatch
// when encrypt.mjs is run multiple times and the idempotency check skips already-encrypted content.
const TEST_SALT = 'e2e0e2e0e2e0e2e0e2e0e2e0e2e0e2e0';

// Minimal 1×1 white JPEG — gives EncryptedImage a real file to encrypt/decrypt.
const TINY_JPEG = Buffer.from([
  0xFF,0xD8,0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46,0x00,0x01,0x01,0x00,0x00,0x01,
  0x00,0x01,0x00,0x00,0xFF,0xDB,0x00,0x43,0x00,0x08,0x06,0x06,0x07,0x06,0x05,0x08,
  0x07,0x07,0x07,0x09,0x09,0x08,0x0A,0x0C,0x14,0x0D,0x0C,0x0B,0x0B,0x0C,0x19,0x12,
  0x13,0x0F,0x14,0x1D,0x1A,0x1F,0x1E,0x1D,0x1A,0x1C,0x1C,0x20,0x24,0x2E,0x27,0x20,
  0x22,0x2C,0x23,0x1C,0x1C,0x28,0x37,0x29,0x2C,0x30,0x31,0x34,0x34,0x34,0x1F,0x27,
  0x39,0x3D,0x38,0x32,0x3C,0x2E,0x33,0x34,0x32,0xFF,0xC0,0x00,0x0B,0x08,0x00,0x01,
  0x00,0x01,0x01,0x01,0x11,0x00,0xFF,0xC4,0x00,0x1F,0x00,0x00,0x01,0x05,0x01,0x01,
  0x01,0x01,0x01,0x01,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x01,0x02,0x03,0x04,
  0x05,0x06,0x07,0x08,0x09,0x0A,0x0B,0xFF,0xC4,0x00,0x14,0x10,0x01,0x00,0x00,0x00,
  0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xFF,0xDA,0x00,
  0x08,0x01,0x01,0x00,0x00,0x3F,0x00,0x7F,0xA4,0x00,0xFF,0xD9,
]);

// Restore known plaintext for test project — ensures encrypt.mjs always starts from
// a clean state regardless of whether the previous teardown succeeded.
function restoreTestContent() {
  // Project JSON — write full known content; don't read from disk (may not exist if previous teardown failed)
  mkdirSync(join(ROOT, 'data', 'projects'), { recursive: true });
  const projPath = join(ROOT, 'data', 'projects', 'xal-test-project.json');
  writeFileSync(projPath, JSON.stringify({
    id: 'xal-test-project',
    title: 'Test Project',
    stage: 'in_progress',
    started_at: '2026-01-01T00:00:00.000Z',
    last_activity_at: '2099-12-31T23:59:59.999Z',
    last_task_id: '01JX0V2PK8ABCDEF0000000001',
    last_post_id: '01JX0V2PK8ABCDEF0000000002',
    home_description: '<p>Home description for test project.</p>',
  }, null, 2) + '\n');

  // Task file — preserve frontmatter, restore known body
  const taskPath = join(ROOT, 'data', 'content', 'tasks', 'xal-test-project', '01JX0V2PK8ABCDEF0000000001.md');
  mkdirSync(join(ROOT, 'data', 'content', 'tasks', 'xal-test-project'), { recursive: true });
  writeFileSync(taskPath, [
    '---',
    'id: 01JX0V2PK8ABCDEF0000000001',
    'stage: started',
    "started_at: '2026-06-10T09:00:00.000Z'",
    "last_activity_at: '2026-06-10T09:00:00.000Z'",
    '---',
    '',
    'Test task description for the test project.',
    '',
  ].join('\n'));

  // Post file — preserve frontmatter, restore known body
  const postPath = join(ROOT, 'data', 'content', 'posts', 'xal-test-project', '01JX0V2PK8ABCDEF0000000002.md');
  mkdirSync(join(ROOT, 'data', 'content', 'posts', 'xal-test-project'), { recursive: true });
  writeFileSync(postPath, [
    '---',
    'id: 01JX0V2PK8ABCDEF0000000002',
    'title: First update on the test project',
    'project_id: xal-test-project',
    "published_at: '2026-06-15T10:00:00.000Z'",
    'tags:',
    '  - update',
    '  - progress',
    '---',
    '',
    'The first paragraph of this blog post. It should appear as the excerpt in blog list views.',
    '',
  ].join('\n'));

  // Description file — body only (no frontmatter), restore known body
  const descPath = join(ROOT, 'data', 'content', 'descriptions', 'xal-test-project.md');
  mkdirSync(join(ROOT, 'data', 'content', 'descriptions'), { recursive: true });
  writeFileSync(descPath, 'This is a description for the test project.\n');

  // Copy all test-proj-XX fixtures from test-env/fixtures/data/ into data/
  copyFixtureProjects();
}

function copyFixtureProjects() {
  const fixtureProjects = readdirSync(join(FIXTURES, 'projects'))
    .filter((f) => f.startsWith('test-proj-') && f.endsWith('.json'));

  for (const file of fixtureProjects) {
    const projId = file.replace('.json', '');
    writeFileSync(
      join(ROOT, 'data', 'projects', file),
      readFileSync(join(FIXTURES, 'projects', file))
    );

    const taskDir = join(FIXTURES, 'content', 'tasks', projId);
    for (const taskFile of readdirSync(taskDir)) {
      mkdirSync(join(ROOT, 'data', 'content', 'tasks', projId), { recursive: true });
      writeFileSync(
        join(ROOT, 'data', 'content', 'tasks', projId, taskFile),
        readFileSync(join(taskDir, taskFile))
      );
    }

    const postDir = join(FIXTURES, 'content', 'posts', projId);
    for (const postFile of readdirSync(postDir)) {
      mkdirSync(join(ROOT, 'data', 'content', 'posts', projId), { recursive: true });
      writeFileSync(
        join(ROOT, 'data', 'content', 'posts', projId, postFile),
        readFileSync(join(postDir, postFile))
      );
    }

    const descFile = join(FIXTURES, 'content', 'descriptions', `${projId}.md`);
    try {
      const descContent = readFileSync(descFile);
      writeFileSync(join(ROOT, 'data', 'content', 'descriptions', `${projId}.md`), descContent);
    } catch {
      // no description for this project — that's fine
    }
  }
}

export default function setup() {
  restoreTestContent();

  mkdirSync(join(ROOT, 'public', 'photos', 'home_page'), { recursive: true });
  mkdirSync(join(ROOT, 'public', 'photos', 'covers'), { recursive: true });

  // Write photos for all projects (xal-test-project + all test-proj-XX)
  const allProjectIds = ['xal-test-project', ...Array.from({ length: 29 }, (_, i) => `test-proj-${String(i + 1).padStart(2, '0')}`)];
  for (const id of allProjectIds) {
    writeFileSync(join(ROOT, 'public', 'photos', 'home_page', `${id}.jpg`), TINY_JPEG);
    writeFileSync(join(ROOT, 'public', 'photos', 'covers', `${id}.jpg`), TINY_JPEG);
  }

  execSync('node scripts/encrypt.mjs', {
    cwd: ROOT,
    env: { ...process.env, ENCRYPT_PASSWORD: 'testpass123', ENCRYPT_SALT: TEST_SALT },
    stdio: 'inherit',
  });
}
