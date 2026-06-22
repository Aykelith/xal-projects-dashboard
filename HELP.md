# xal-dashboard Help

This page describes how to add and manage content in the dashboard.

---

## Adding a New Project

1. Create a JSON file at `data/projects/[project-id].json` with this structure:

```json
{
  "id": "my-project",
  "title": "My Project",
  "stage": "planning",
  "started_at": "2026-06-19T00:00:00.000Z",
  "last_activity_at": "",
  "last_task_id": null,
  "last_post_id": null,
  "home_description": "<p>Short HTML description shown on the home page.</p>"
}
```

**Stage values:** `idea` · `planning` · `in_progress` · `in_production` · `done` · `abandoned`

2. (Optional) Add a long-form description at `data/content/descriptions/[project-id].md` — body-only MDX, no frontmatter required.

3. (Optional) Add a thumbnail at `public/photos/home_page/[project-id].jpg` and a cover image at `public/photos/covers/[project-id].jpg`.

4. Run `pnpm generate && pnpm build` — the generated fields (`last_activity_at`, `last_task_id`, `last_post_id`) are computed automatically.

---

## Adding a Task

1. Generate a ULID for the task (e.g. using `ulidx` or an online generator).
2. Create the file at `data/content/tasks/[project-id]/[task-ulid].md`:

```mdx
---
id: 01JX0V2PK8ABCDEF0000000001
stage: planned
started_at: "2026-06-19T09:00:00.000Z"
last_activity_at: "2026-06-19T09:00:00.000Z"
---

Describe what this task involves here.
```

**Stage values:** `planned` · `started` · `done`

**Note:** Only one task per project should have `stage: started` at a time — this is the "active task" shown on the project page.

The `last_activity_at` field is automatically updated by `pnpm generate` based on the file's last-modified time.

---

## Creating a Blog Post

1. Generate a ULID for the post.
2. Create the file at `data/content/posts/[project-id]/[post-ulid].md`:

```mdx
---
id: 01JX0V2PK8ABCDEF0000000002
title: "My First Post"
project_id: my-project
published_at: "2026-06-19T10:00:00.000Z"
tags: [update, progress]
---

The first paragraph becomes the excerpt shown in the blog list.

Continue writing the full post here.
```

**Tags** must be lowercase alphanumeric strings, optionally with hyphens (e.g. `my-tag`).

The optional `updated_at` field can be set when editing an already-published post.

---

## Build Workflow

```bash
pnpm generate   # compute last_activity_at, last_task_id, last_post_id
pnpm build      # runs generate then builds the static site
pnpm dev        # start development server (does not run generate)
pnpm test       # run Playwright end-to-end tests
```

---

## Encryption & Decryption

Content is encrypted before committing so the repository can be hosted publicly. Encryption is AES-256-GCM; the key is derived from a password via PBKDF2 (300 000 iterations, SHA-256).

### What gets encrypted

`data/` is the plaintext source (gitignored). `pnpm encrypt` reads from it and writes to committed locations:

| Plaintext source (`data/`, gitignored) | Encrypted output (committed) | What's encrypted |
|---|---|---|
| `data/projects/*.json` | `data-encrypted/projects/*.enc.json` | `home_description` → `enc_home_description` |
| `data/content/tasks/**/*.md` | `src/content/tasks/**/*.enc.md` | Body → `enc_body` frontmatter field |
| `data/content/posts/**/*.md` | `src/content/posts/**/*.enc.md` | Body → `enc_body` frontmatter field |
| `data/content/descriptions/*.md` | `src/content/descriptions/*.enc.md` | Body → `enc_body` frontmatter field |
| `public/photos/home_page/*.jpg` | `public/photos/home_page/*.enc` | Binary → JSON envelope |
| `public/photos/covers/*.jpg` | `public/photos/covers/*.enc` | Binary → JSON envelope |

`public/enc/config.json` is written with the PBKDF2 salt (and a check value). Commit this file — it is needed to decrypt.

`pnpm decrypt` is the inverse: reads committed encrypted files, restores `data/` for local editing. Encrypted files are never deleted — they stay committed.

### Encrypt (before committing)

```bash
ENCRYPT_PASSWORD=secret pnpm encrypt
# or
pnpm encrypt --password secret
```

### Decrypt (after cloning or pulling)

```bash
ENCRYPT_PASSWORD=secret pnpm decrypt
# or
pnpm decrypt --password secret
```

Requires `public/enc/config.json` to exist (created by encrypt). If the password is wrong, the script exits with an error on the first file.

### Typical workflow

```
# after cloning or pulling — restore plaintext for editing
pnpm decrypt           # populates data/ from src/content/*.enc.md + data-encrypted/

# edit content in data/projects/*.json and data/content/**/*.md

pnpm generate          # update generated fields (last_activity_at etc.)
pnpm encrypt           # writes src/content/**/*.enc.md + data-encrypted/projects/*.enc.json
bash scripts/commit.sh "your message"   # commit + push
```

**Never commit plaintext.** `data/` is gitignored. The build reads only encrypted files.
`pnpm build` and `pnpm dev` both work directly from committed encrypted files — no decrypt needed to build.

---

## Date Format

All dates are displayed as `DD/MM/YYYY HH:MM` with leading zeros.

---

## Photos

| Path | Usage |
|---|---|
| `public/photos/home_page/[project-id].jpg` | Thumbnail shown on the home page card |
| `public/photos/covers/[project-id].jpg` | Full-width cover on the project page |
| `public/photos/placeholder_home.svg` | Fallback when no home-page thumbnail exists |
| `public/photos/placeholder_cover.svg` | Fallback when no cover image exists |

Photos are optional. If a file doesn't exist, the card renders without an image (home cards show a placeholder icon; cover images are hidden).
