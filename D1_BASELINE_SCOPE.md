# D1 Baseline and Scope

## Source baseline

- GitHub REST `refs/heads/main`: `7eac5487caf25610f5edcaf87524027595cfc754`.
- `git ls-remote origin refs/heads/main`: `7eac5487caf25610f5edcaf87524027595cfc754`.
- Isolated fetch and checkout: `refs/codex/d1/main` → branch `codex/v3-d1-m01-profile-slice`.
- Worktree starts clean at that exact SHA.
- Current checkout is `feat/ai-resume-generation` at `71d70bcfab225d8274a8fa8d69292475c4bba01f`, contains tracked and untracked user changes, and is not used for implementation.
- D0 lockfile reference at this worktree: `f7183acb546eb91442de09eef0dfaf3a14c1bb1afdee655386f15d5ecbddc250`.
- Project runtime: `.nvmrc` = Node `24.22.1`; `package.json` requires Node `24.x`, npm `>=11.6.2 <12`; package manager = npm `11.20.0`.

## Verified current-main contracts

- Resume Schema v1 contains the six target fields as optional strings in `personal`: `fullName`, `title`, `email`, `phone`, `location`, `summary`. The same object also contains labels, photo and extras; resume settings contain personal photo display settings.
- `MAX_RESUME_TEXT_LENGTH` is 30,000 characters. `usePersonalEditor` rejects over-limit values through existing feedback and updates the passed Resume draft through a callback.
- The official editor controller composes `usePersonalEditor` through `useModuleEditor` and `useModulesPanelController`; `useEditorPageController` supplies the current Resume and `useResumeActions.updateResume` callback.
- `useResumeStore.updateResume` applies an Immer mutator to the existing canonical `ResumeData`. It must receive only a field-level mutator; `replaceState` is not appropriate for M01.
- Resume and active-section persistence use `inkless-cat/resume-store`; `partialize` persists only `resume` and `activeSections`. In-memory `workspaceGeneration` and `workspaceRevision` are intentionally not persisted.
- UI persistence uses `inkless-cat/ui-store`; `partialize` persists `theme`, `templateId`, and `customTemplates`. Resume edits do not need to change these values.
- `ResumePreview` takes `ResumeData`, active sections, template style, accent color and theme as props. The official editor deliberately passes deferred Resume and section values to it.
- `createBrowserStorage` catches `localStorage.setItem` failures and calls `reportPersistenceIssue`, which pushes a user-visible 8-second error alert. The in-memory Store update remains applied; storage does not return a durable-save result. This page shows no success/save claim, so no new persistence status or core-store change is required. Reload after a failed write should restore the prior durable value.
- The current root App uses I18n, feedback, AI providers and Store providers; the M01 screen must be rendered inside the same providers.
- CI quality workflow runs Quality and, for pull requests, Firefox acceptance. It contains no deployment step. No Cloudflare Pages or other deployment workflow/configuration was found in the main worktree.

## In scope

- A gated internal M01 page with six controlled inputs.
- A page-level adapter reusing `useEditorPageController` and its existing personal handlers.
- The existing `ResumePreview`, fed by the same official Store state and active template configuration.
- Opt-in-only rendering in development when `VITE_ENABLE_M01_PROFILE_SLICE=true`.
- Synthetic test fixture and S0–S3 preservation checks, write-failure evidence, and isolated Chromium browser checks.
- D1-specific contracts, test evidence, rollback steps and a Draft PR if all local gates and external side-effect checks permit.

## Out of scope

- Default product navigation or replacement of the production Editor.
- Schema, migration, persist key, persistence core, Store, shared controller business semantics, CI workflow, production deploy, merge, or PoC storage changes.
- New email/phone validation rules, sample resume loading, automatic demo data, visual G3 approval, or M02–M10 integration.

## Exact feature gate

`import.meta.env.DEV && import.meta.env.VITE_ENABLE_M01_PROFILE_SLICE === 'true'`.

The standard dev server, default production build and default Playwright web server leave this false. The dedicated D1 Playwright config supplies the explicit environment flag to its isolated dev server. The gate is a release-isolation mechanism, not authentication.
