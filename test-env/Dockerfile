FROM mcr.microsoft.com/playwright:v1.61.0-noble
WORKDIR /app
RUN npm install -g pnpm@10.11.0
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
# Pre-encrypt all test fixtures at build time so the webServer's pnpm build
# has content to work with (webServer starts before globalSetup in Playwright).
# Also removes the committed production project enc.json so only test projects
# appear (avoids an unexpected 31st project on the home page).
RUN cp -r test-env/fixtures/data/. data/ && \
    rm -f data-encrypted/projects/xal-ai-projects.enc.json && \
    ENCRYPT_PASSWORD=testpass123 \
    ENCRYPT_SALT=e2e0e2e0e2e0e2e0e2e0e2e0e2e0e2e0 \
    node scripts/encrypt.mjs
CMD ["pnpm", "exec", "playwright", "test", "--config", "test-env/playwright.config.ts"]
