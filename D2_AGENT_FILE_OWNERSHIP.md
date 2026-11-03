# D2 Agent File Ownership

All work starts from frozen D1 commit `bfd80932b31c41779f4a0577bee7c130898419dc` on branch `codex/v3-d2-m01-visual-fidelity`. Agents must not edit outside their assigned paths. Do not modify schema, persistence, canonical store, controller, feature gate, default editor, or M02–M10.

| Owner | Assigned paths | Explicit exclusions |
|---|---|---|
| Main agent — Integration Architect | `D2_AGENT_FILE_OWNERSHIP.md`; remaining `D2_REVIEW/*` reports not assigned below; package README, package assembly, hashes, integration, final status | Do not rewrite the D1 business/data chain or source reference assets in the original worktree. |
| Subagent A — Design Evidence & Fidelity Auditor | `D2_REVIEW/D2_DESIGN_PROVENANCE.md`; `D2_REVIEW/D2_FIDELITY_SPEC.md` | No production UI, test, or source-reference modifications. |
| Subagent B — M01 React Visual Engineer | `src/pages/m01-profile-slice/M01ProfilePage.tsx`; `src/pages/m01-profile-slice/m01-profile-slice.css` | No route/runtime wiring, Store, Schema, Controller, feature gate, tests, global tokens, or other feature pages. |
| Subagent C — Chromium QA & Regression Engineer | `e2e/m01-visual-regression.d2.ts`; `playwright.m01-visual.config.ts`; `tsconfig.e2e.json` (include only); `tsconfig.eslint.json` (include only); `D2_REVIEW/D2_VISUAL_DIFF_REPORT.md`; `D2_REVIEW/D2_INTERACTION_REPORT.md`; `D2_REVIEW/D2_DATA_REGRESSION.md`; `D2_REVIEW/D2_TEST_RESULTS.md`; test evidence under `D2_REVIEW/evidence/`; screenshots/comparisons under `D2_REVIEW/visual/` | No React/CSS implementation, D1 baseline tests/config, store/controller/schema, feature gate, or TypeScript compiler/lint changes beyond adding the D2 visual config to each include list. Coordinate route and selectors with the main agent before adding tests. |

The existing D1 tests and default route checks are frozen regression inputs; add D2 tests without weakening their assertions. Resolve any required cross-owner edit through the main agent before changing files.

The D2 visual test uses the `.d2.ts` suffix so Playwright's default `*.spec.ts` discovery does not run it with the M01 feature gate closed. `playwright.m01-visual.config.ts` explicitly matches this file; the shared default Playwright config remains unchanged.
