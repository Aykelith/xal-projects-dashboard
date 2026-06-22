# test-env

All test infrastructure lives here so it stays committed and isolated from the app source.

---

## Why two Playwright configs?

### `playwright.config.ts` — standard tests

Runs the main E2E suite. Docker Compose service `test` mounts fixtures **read-only** (`:ro`), so tests cannot mutate content.

### `playwright.encryption.config.ts` — encryption tests

Runs only `e2e/encryption.spec.ts`. Kept separate because:

- Fixtures must be mounted **writable** — the setup/teardown encrypts and decrypts content on disk.
- Has its own `globalSetup` (`e2e/encryption-setup.ts`) and `globalTeardown` (`e2e/encryption-teardown.ts`) to prepare and clean up encrypted state.
- Runs on port **4322** (not 4321) to avoid conflicts if both suites run on the same host.
- `fullyParallel: false` — encryption state is shared, so tests must run sequentially.

Docker Compose service `test-encrypted` runs this config automatically.

---

## Directory layout

```
test-env/
├── Dockerfile                        # mcr.microsoft.com/playwright image + pnpm
├── docker-compose.yml                # `test` and `test-encrypted` services
├── playwright.config.ts              # standard suite (port 4321, read-only fixtures)
├── playwright.encryption.config.ts   # encryption suite (port 4322, writable fixtures)
├── e2e/
│   ├── encryption-setup.ts           # globalSetup: encrypts fixture content
│   ├── encryption-teardown.ts        # globalTeardown: restores fixture content
│   ├── encryption.spec.ts            # encryption-specific specs
│   └── *.spec.ts                     # standard specs
└── fixtures/
    ├── data/projects/                # xal-test-project.json
    └── src/content/                  # descriptions/, tasks/, posts/
```

---

## Running tests

```bash
# Standard suite
pnpm test

# Encryption suite
docker compose -f test-env/docker-compose.yml run --rm test-encrypted
```
