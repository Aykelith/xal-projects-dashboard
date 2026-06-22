/**
 * Unit tests for the AES-256-GCM crypto used by encrypt.mjs and decrypt.mjs.
 * Run: node --test scripts/test-crypto.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

const { subtle } = webcrypto;

// Crypto helpers — same logic as encrypt.mjs / decrypt.mjs.
// Uses 1 PBKDF2 iteration to keep tests fast (correctness, not hardness, tested here).
async function deriveKey(password, saltHex, usage) {
  const raw = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', salt: Buffer.from(saltHex, 'hex'), iterations: 1, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage],
  );
}

async function encryptData(key, data) {
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const payload = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);
  return { iv: Buffer.from(iv).toString('hex'), data: Buffer.from(ct).toString('base64') };
}

async function decryptData(key, envelope) {
  return subtle.decrypt(
    { name: 'AES-GCM', iv: Buffer.from(envelope.iv, 'hex') },
    key,
    Buffer.from(envelope.data, 'base64'),
  );
}

// Shared salt for tests (fresh per run, same within run)
const SALT = Buffer.from(webcrypto.getRandomValues(new Uint8Array(16))).toString('hex');
const PASSWORD = 'test-password-abc123';

test('text round-trip', async () => {
  const encKey = await deriveKey(PASSWORD, SALT, 'encrypt');
  const decKey = await deriveKey(PASSWORD, SALT, 'decrypt');
  const original = 'Hello, encrypted world! Special chars: <>&"\' 🔐';
  const envelope = await encryptData(encKey, original);
  const plain = await decryptData(decKey, envelope);
  assert.equal(new TextDecoder().decode(plain), original);
});

test('binary round-trip (image bytes)', async () => {
  const encKey = await deriveKey(PASSWORD, SALT, 'encrypt');
  const decKey = await deriveKey(PASSWORD, SALT, 'decrypt');
  // Fake JPEG/PNG header bytes including null bytes and high bytes
  const original = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const envelope = await encryptData(encKey, original);
  const plain = await decryptData(decKey, envelope);
  assert.deepEqual(Buffer.from(plain), original);
});

test('multiline markdown round-trip', async () => {
  const encKey = await deriveKey(PASSWORD, SALT, 'encrypt');
  const decKey = await deriveKey(PASSWORD, SALT, 'decrypt');
  const original = '# Heading\n\nParagraph with **bold** and `code`.\n\n- item 1\n- item 2\n';
  const envelope = await encryptData(encKey, original);
  const plain = await decryptData(decKey, envelope);
  assert.equal(new TextDecoder().decode(plain), original);
});

test('wrong password → decrypt rejects', async () => {
  const encKey = await deriveKey(PASSWORD, SALT, 'encrypt');
  const wrongKey = await deriveKey('completely-wrong-password', SALT, 'decrypt');
  const envelope = await encryptData(encKey, 'secret content');
  await assert.rejects(() => decryptData(wrongKey, envelope));
});

test('wrong salt → decrypt rejects', async () => {
  const encKey = await deriveKey(PASSWORD, SALT, 'encrypt');
  const wrongSalt = Buffer.from(webcrypto.getRandomValues(new Uint8Array(16))).toString('hex');
  const wrongKey = await deriveKey(PASSWORD, wrongSalt, 'decrypt');
  const envelope = await encryptData(encKey, 'secret content');
  await assert.rejects(() => decryptData(wrongKey, envelope));
});

test('IV is unique per encryption (no nonce reuse)', async () => {
  const encKey = await deriveKey(PASSWORD, SALT, 'encrypt');
  const e1 = await encryptData(encKey, 'same plaintext');
  const e2 = await encryptData(encKey, 'same plaintext');
  assert.notEqual(e1.iv, e2.iv, 'IVs must differ between runs');
  assert.notEqual(e1.data, e2.data, 'ciphertexts must differ when IVs differ');
});

test('envelope fields are hex/base64 strings', async () => {
  const encKey = await deriveKey(PASSWORD, SALT, 'encrypt');
  const envelope = await encryptData(encKey, 'test');
  assert.match(envelope.iv, /^[0-9a-f]{24}$/, 'iv must be 12-byte hex (24 chars)');
  assert.match(envelope.data, /^[A-Za-z0-9+/]+=*$/, 'data must be valid base64');
});

test('empty string round-trip', async () => {
  const encKey = await deriveKey(PASSWORD, SALT, 'encrypt');
  const decKey = await deriveKey(PASSWORD, SALT, 'decrypt');
  const envelope = await encryptData(encKey, '');
  const plain = await decryptData(decKey, envelope);
  assert.equal(new TextDecoder().decode(plain), '');
});
