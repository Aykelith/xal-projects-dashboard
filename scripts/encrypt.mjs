/**
 * Encrypts all project content for public deployment.
 *
 * Usage:
 *   ENCRYPT_PASSWORD=secret node scripts/encrypt.mjs
 *   node scripts/encrypt.mjs --password secret
 *
 * Reads plaintext from data/ (gitignored), writes encrypted to committed locations:
 *   - data/content/tasks/**\/*.md    → src/content/tasks/**\/*.enc.md
 *   - data/content/posts/**\/*.md    → src/content/posts/**\/*.enc.md
 *   - data/content/descriptions/*.md → src/content/descriptions/*.enc.md
 *   - data/projects/*.json           → data-encrypted/projects/*.enc.json
 *   - public/photos/home_page/*.jpg  → public/photos/home_page/*.enc
 *   - public/photos/covers/*.jpg     → public/photos/covers/*.enc
 *
 * Originals in data/ are left untouched.
 * Produces public/enc/config.json with the global PBKDF2 salt.
 * Run pnpm decrypt to restore data/ from the encrypted files.
 */

import { webcrypto } from 'crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, mkdirSync } from 'fs';
import { join, resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const { subtle } = webcrypto;
const getRandomValues = (buf) => webcrypto.getRandomValues(buf);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// --- crypto ---

async function deriveKey(password, saltHex) {
  const raw = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: Buffer.from(saltHex, 'hex'),
      iterations: 300_000,
      hash: 'SHA-256',
    },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
}

async function encryptData(key, data) {
  const iv = getRandomValues(new Uint8Array(12));
  const payload = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);
  return {
    iv: Buffer.from(iv).toString('hex'),
    data: Buffer.from(ct).toString('base64'),
  };
}

// --- fs helpers ---

function walkDir(dir) {
  if (!existsSync(dir)) return [];
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkDir(full));
    else results.push(full);
  }
  return results;
}

// --- main ---

const password =
  process.env.ENCRYPT_PASSWORD ||
  (() => {
    const idx = process.argv.indexOf('--password');
    return idx !== -1 ? process.argv[idx + 1] : null;
  })();

if (!password) {
  console.error('Error: set ENCRYPT_PASSWORD env var or pass --password <pass>');
  process.exit(1);
}

console.log('Encrypting content…');

const saltHex = process.env.ENCRYPT_SALT ?? Buffer.from(getRandomValues(new Uint8Array(16))).toString('hex');
mkdirSync(join(ROOT, 'public', 'enc'), { recursive: true });

const key = await deriveKey(password, saltHex);

const check = await encryptData(key, 'xal-dashboard-v1');
writeFileSync(join(ROOT, 'public', 'enc', 'config.json'), JSON.stringify({ salt: saltHex, check }));

// 1. Content MD files (tasks, posts, descriptions)
//    data/content/**/*.md → src/content/**/*.enc.md
const dataContentBase = join(ROOT, 'data', 'content');
const srcContentBase = join(ROOT, 'src', 'content');
for (const file of walkDir(dataContentBase).filter((f) => f.endsWith('.md'))) {
  const raw = readFileSync(file, 'utf-8');
  const parsed = matter(raw);
  if (!parsed.content.trim()) continue;
  parsed.data.enc_body = await encryptData(key, parsed.content);
  const rel = file.slice(dataContentBase.length + 1);
  const encFile = join(srcContentBase, rel.replace(/\.md$/, '.enc.md'));
  mkdirSync(dirname(encFile), { recursive: true });
  writeFileSync(encFile, matter.stringify('', parsed.data));
  console.log(`  encrypted: ${rel} → ${encFile.replace(ROOT + '/', '')}`);
}

// 2. Project JSONs — data/projects/*.json → data-encrypted/projects/*.enc.json
const encProjectsDir = join(ROOT, 'data-encrypted', 'projects');
mkdirSync(encProjectsDir, { recursive: true });
const ENCRYPTED_PROJECT_FIELDS = ['title', 'stage', 'started_at', 'last_activity_at', 'last_task_id', 'last_post_id', 'home_description'];
for (const file of walkDir(join(ROOT, 'data', 'projects')).filter((f) => f.endsWith('.json'))) {
  const proj = JSON.parse(readFileSync(file, 'utf-8'));
  for (const field of ENCRYPTED_PROJECT_FIELDS) {
    const val = proj[field];
    if (val != null && val !== '') {
      proj[`enc_${field}`] = await encryptData(key, String(val));
      proj[field] = null;
    }
  }
  const encFile = join(encProjectsDir, basename(file).replace(/\.json$/, '.enc.json'));
  writeFileSync(encFile, JSON.stringify(proj, null, 2) + '\n');
  console.log(`  encrypted: data/projects/${basename(file)} → data-encrypted/projects/${basename(encFile)}`);
}

// 3. Images — public/photos/**/*.jpg → *.enc (original deleted)
for (const subdir of ['home_page', 'covers']) {
  const imgDir = join(ROOT, 'public', 'photos', subdir);
  for (const file of walkDir(imgDir).filter((f) => f.endsWith('.jpg'))) {
    if (basename(file).startsWith('placeholder')) continue;
    const binary = readFileSync(file);
    const envelope = await encryptData(key, binary);
    writeFileSync(file.replace(/\.jpg$/, '.enc'), JSON.stringify(envelope));
    unlinkSync(file);
    console.log(`  encrypted image: ${file.replace(ROOT + '/', '')}`);
  }
}

console.log('Done. src/content/ and data-encrypted/ updated. Commit and push.');
