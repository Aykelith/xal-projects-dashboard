/**
 * Standalone verify: encrypt.mjs → decrypt.mjs round-trip on fixture data.
 * Works entirely in a tmp dir — never touches the real data/ or data-encrypted/ directories.
 *
 * Usage: node test-env/scripts/verify-enc-dec.mjs
 */

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TMP = join(tmpdir(), `xal-enc-test-${Date.now()}`);
const PASSWORD = 'testverify123';
const SALT = 'deadbeefdeadbeefdeadbeefdeadbeef';

// ── 1. Build tmp tree ──────────────────────────────────────────────────────────

function mkdir(p) { mkdirSync(join(TMP, p), { recursive: true }); }
function write(p, content) { writeFileSync(join(TMP, p), content); }

const FIXTURE_PROJECT = {
  id: 'xal-test-project',
  title: 'Test Project Title',
  stage: 'in_progress',
  started_at: '2026-01-01T00:00:00.000Z',
  last_activity_at: '2026-06-19T19:59:05.505Z',
  last_task_id: '01JX0V2PK8ABCDEF0000000001',
  last_post_id: '01JX0V2PK8ABCDEF0000000002',
  home_description: '<p>Home description for test project.</p>',
};

const FIXTURE_TASK = `---
id: 01JX0V2PK8ABCDEF0000000001
stage: started
started_at: '2026-06-10T09:00:00.000Z'
last_activity_at: '2026-06-10T09:00:00.000Z'
---

Test task description for the test project.
`;

const FIXTURE_POST = `---
id: 01JX0V2PK8ABCDEF0000000002
title: First update on the test project
project_id: xal-test-project
published_at: '2026-06-15T10:00:00.000Z'
tags:
  - update
  - progress
---

The first paragraph of this blog post.
`;

const FIXTURE_DESC = 'This is a description for the test project.\n';

mkdir('data/projects');
mkdir('data/content/tasks/xal-test-project');
mkdir('data/content/posts/xal-test-project');
mkdir('data/content/descriptions');
mkdir('data-encrypted/projects');
mkdir('src/content/tasks');
mkdir('src/content/posts');
mkdir('src/content/descriptions');
mkdir('public/enc');
mkdir('public/photos/home_page');
mkdir('public/photos/covers');
mkdir('scripts');
mkdir('node_modules');

// Copy scripts and node_modules from real repo
cpSync(join(ROOT, 'scripts', 'encrypt.mjs'), join(TMP, 'scripts', 'encrypt.mjs'));
cpSync(join(ROOT, 'scripts', 'decrypt.mjs'), join(TMP, 'scripts', 'decrypt.mjs'));
cpSync(join(ROOT, 'node_modules'), join(TMP, 'node_modules'), { recursive: true });

// Write fixture data
write('data/projects/xal-test-project.json', JSON.stringify(FIXTURE_PROJECT, null, 2) + '\n');
write('data/content/tasks/xal-test-project/01JX0V2PK8ABCDEF0000000001.md', FIXTURE_TASK);
write('data/content/posts/xal-test-project/01JX0V2PK8ABCDEF0000000002.md', FIXTURE_POST);
write('data/content/descriptions/xal-test-project.md', FIXTURE_DESC);

console.log('Tmp tree ready at', TMP);

// ── 2. Encrypt ─────────────────────────────────────────────────────────────────

console.log('\n── encrypt ──');
execSync('node scripts/encrypt.mjs', {
  cwd: TMP,
  env: { ...process.env, ENCRYPT_PASSWORD: PASSWORD, ENCRYPT_SALT: SALT },
  stdio: 'inherit',
});

// ── 3. Verify .enc.json has no plaintext sensitive fields ─────────────────────

console.log('\n── verify enc.json ──');
const encJson = JSON.parse(readFileSync(join(TMP, 'data-encrypted/projects/xal-test-project.enc.json'), 'utf-8'));

const EXPECTED_NULL_FIELDS = ['title', 'stage', 'started_at', 'last_activity_at', 'home_description'];
const EXPECTED_ENC_FIELDS = ['enc_title', 'enc_stage', 'enc_started_at', 'enc_last_activity_at', 'enc_home_description'];

let failed = false;

for (const f of EXPECTED_NULL_FIELDS) {
  if (encJson[f] !== null) {
    console.error(`FAIL: enc.json.${f} should be null, got:`, encJson[f]);
    failed = true;
  } else {
    console.log(`  OK: ${f} = null`);
  }
}

for (const f of EXPECTED_ENC_FIELDS) {
  if (!encJson[f]?.iv || !encJson[f]?.data) {
    console.error(`FAIL: enc.json.${f} missing or malformed:`, encJson[f]);
    failed = true;
  } else {
    console.log(`  OK: ${f} has iv+data`);
  }
}

// last_task_id and last_post_id: non-null ULIDs should be encrypted
for (const f of ['last_task_id', 'last_post_id']) {
  const encField = `enc_${f}`;
  if (encJson[f] !== null) {
    console.error(`FAIL: enc.json.${f} should be null, got:`, encJson[f]);
    failed = true;
  } else {
    console.log(`  OK: ${f} = null`);
  }
  if (!encJson[encField]?.iv || !encJson[encField]?.data) {
    console.error(`FAIL: enc.json.${encField} missing or malformed:`, encJson[encField]);
    failed = true;
  } else {
    console.log(`  OK: ${encField} has iv+data`);
  }
}

// id must remain plaintext
if (encJson.id !== FIXTURE_PROJECT.id) {
  console.error(`FAIL: enc.json.id should be '${FIXTURE_PROJECT.id}', got:`, encJson.id);
  failed = true;
} else {
  console.log(`  OK: id = '${encJson.id}' (plaintext)`);
}

// ── 4. Verify .enc.md bodies encrypted ───────────────────────────────────────

console.log('\n── verify enc.md files ──');
for (const [rel, label] of [
  ['src/content/tasks/xal-test-project/01JX0V2PK8ABCDEF0000000001.enc.md', 'task'],
  ['src/content/posts/xal-test-project/01JX0V2PK8ABCDEF0000000002.enc.md', 'post'],
  ['src/content/descriptions/xal-test-project.enc.md', 'description'],
]) {
  const path = join(TMP, rel);
  if (!existsSync(path)) {
    console.error(`FAIL: ${rel} not found`);
    failed = true;
    continue;
  }
  const raw = readFileSync(path, 'utf-8');
  if (!raw.includes('enc_body:')) {
    console.error(`FAIL: ${label} enc.md missing enc_body`);
    failed = true;
  } else {
    console.log(`  OK: ${label} enc.md has enc_body`);
  }
}

// ── 5. Decrypt ─────────────────────────────────────────────────────────────────

console.log('\n── decrypt ──');
// Remove plaintext data/projects so decrypt has to recreate from enc
rmSync(join(TMP, 'data/projects/xal-test-project.json'));
rmSync(join(TMP, 'data/content/tasks/xal-test-project/01JX0V2PK8ABCDEF0000000001.md'));
rmSync(join(TMP, 'data/content/posts/xal-test-project/01JX0V2PK8ABCDEF0000000002.md'));
rmSync(join(TMP, 'data/content/descriptions/xal-test-project.md'));

execSync('node scripts/decrypt.mjs', {
  cwd: TMP,
  env: { ...process.env, ENCRYPT_PASSWORD: PASSWORD },
  stdio: 'inherit',
});

// ── 6. Verify decrypted values match originals ────────────────────────────────

console.log('\n── verify decrypted values ──');
const decJson = JSON.parse(readFileSync(join(TMP, 'data/projects/xal-test-project.json'), 'utf-8'));

const EXPECTED = {
  id: FIXTURE_PROJECT.id,
  title: FIXTURE_PROJECT.title,
  stage: FIXTURE_PROJECT.stage,
  started_at: FIXTURE_PROJECT.started_at,
  last_activity_at: FIXTURE_PROJECT.last_activity_at,
  last_task_id: FIXTURE_PROJECT.last_task_id,
  last_post_id: FIXTURE_PROJECT.last_post_id,
  home_description: FIXTURE_PROJECT.home_description,
};

for (const [k, expected] of Object.entries(EXPECTED)) {
  if (decJson[k] !== expected) {
    console.error(`FAIL: decrypted ${k} = ${JSON.stringify(decJson[k])}, expected ${JSON.stringify(expected)}`);
    failed = true;
  } else {
    console.log(`  OK: ${k} = ${JSON.stringify(decJson[k])}`);
  }
}

// enc_* fields must be gone after decrypt
for (const f of [...EXPECTED_ENC_FIELDS, 'enc_last_task_id', 'enc_last_post_id']) {
  if (decJson[f] !== undefined) {
    console.error(`FAIL: decrypted json still has ${f}`);
    failed = true;
  } else {
    console.log(`  OK: ${f} absent after decrypt`);
  }
}

// ── 7. Cleanup ─────────────────────────────────────────────────────────────────

rmSync(TMP, { recursive: true });
console.log('\nTmp dir cleaned up.');

if (failed) {
  console.error('\nVERIFICATION FAILED');
  process.exit(1);
} else {
  console.log('\nAll checks passed.');
}
