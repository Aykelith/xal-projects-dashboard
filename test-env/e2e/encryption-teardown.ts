import { execSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export default function teardown() {
  try {
    execSync('node scripts/decrypt.mjs', {
      cwd: ROOT,
      env: { ...process.env, ENCRYPT_PASSWORD: 'testpass123' },
      stdio: 'inherit',
    });
  } catch {
    console.warn('Teardown: decrypt failed — content may remain encrypted. Next setup run will fix it.');
  }

  // Remove test image files created by setup (both original and encrypted forms).
  const allProjectIds = ['xal-test-project', ...Array.from({ length: 29 }, (_, i) => `test-proj-${String(i + 1).padStart(2, '0')}`)];
  for (const id of allProjectIds) {
    for (const rel of [
      `public/photos/home_page/${id}.jpg`,
      `public/photos/home_page/${id}.enc`,
      `public/photos/covers/${id}.jpg`,
      `public/photos/covers/${id}.enc`,
    ]) {
      const p = join(ROOT, rel);
      if (existsSync(p)) rmSync(p);
    }
  }
}
