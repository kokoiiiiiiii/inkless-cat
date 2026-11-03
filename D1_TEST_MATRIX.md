# D1 Test Matrix

All final local gates below ran against the final D1 source in the isolated worktree. Runtime: Node `24.22.1`; npm `11.20.0`; Playwright `1.61.1`; Chromium `149.0.7827.55` (Playwright-managed headless browser). The normal system Chrome profile was not used.

| Gate | Command | Result | Raw evidence |
|---|---|---|---|
| Locked dependency install | `npm ci` | PASS, exit 0; 460 packages installed. | Tool output recorded in task transcript; lockfile SHA remained `f7183acb546eb91442de09eef0dfaf3a14c1bb1afdee655386f15d5ecbddc250`. |
| Runtime dependency audit | `npm audit --omit=dev --audit-level=moderate` | PASS, exit 0; 0 vulnerabilities. | `logs/d1-audit-final.log` in review package. |
| TypeScript (app + E2E configs/specs) | `npm run typecheck` | PASS, exit 0. | `logs/d1-typecheck-final.log`. |
| ESLint | `npm run lint` | PASS, exit 0; 0 errors and 403 warnings (existing Tailwind order/style warnings plus scoped class-name diagnostics). | `logs/d1-lint-final.log`. |
| Full unit suite | `npm test` | PASS, exit 0; 50 files, 419 tests. | `logs/d1-full-unit-final.log`. |
| Production build | `npm run build` | PASS, exit 0. Default build contains no M01 runtime chunk or stylesheet. | `logs/d1-build-final.log`. |
| Full default Chromium suite | `npm run test:e2e -- --workers=1 --retries=0` | PASS, exit 0; 87 tests. Includes the default-off gate and the existing Editor route. | `logs/d1-full-default-chromium.log`, default Playwright results and attachments. |
| Opt-in M01 Chromium suite | `npm run test:e2e -- --config playwright.m01.config.ts --workers=1 --retries=0` | PASS, exit 0; 4 tests (flow/reload, existing length limit, failed write, mobile/focus/reduced motion). | `logs/d1-optin-chromium-final.log`, `test-results/d1-browser/opt-in-playwright-results.json`, screenshots and S0–S3 browser snapshot. |
| Focused domain evidence | Vitest focused controller/store tests | PASS, exit 0; 2 files, 3 tests. | `test-results/d1-domain/m01-s0-s3-data-invariant.json` and `m01-storage-write-failure.json`. |

The default Playwright run clears its `test-results/` output directory. Domain/browser evidence was copied to an isolated temporary staging folder before that run; the final review package combines the backed-up synthetic S0–S3 files with the final opt-in artifacts and final raw logs.

## Not run

- GitHub exact-head Quality, Chromium, and Firefox workflows were not run because no remote branch or pull request was created. Under the task's deployment boundary, the repository workflow is safe (Quality/Firefox only, no deployment step), but external Cloudflare Pages configuration is unavailable and the repository has no checked-in Cloudflare/Wrangler config. GitHub's public deployments endpoint returned an empty list; that does not prove what an external Pages integration would do for a new branch. Remote push and PR creation are held for explicit confirmation of that external boundary.
- Firefox acceptance was not run locally. The task's remote Firefox workflow was not triggered.
