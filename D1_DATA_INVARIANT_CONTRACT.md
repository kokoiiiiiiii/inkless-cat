# D1 Data Invariant Contract

## Scope

The only editable paths are `personal.fullName`, `personal.title`, `personal.email`, `personal.phone`, `personal.location`, and `personal.summary`, all optional strings in current Resume Schema v1 with the existing 30,000-character limit. The test fixture is explicitly synthetic and contains no real user data. Its full baseline and measured results are in `test-results/d1-domain/m01-s0-s3-data-invariant.json`; the browser uses a separate synthetic fixture in `test-results/d1-browser/synthetic-fixture.json`.

The baseline includes personal labels, a photo, extras, socials, experience, projects, education, skills, languages, interests, awards, a custom section, personal photo settings, `activeSections`, and UI `theme`/`templateId`. Only fields legal under the current schema are claimed as preserved; tests do not assert preservation of unknown keys that normalization strips.

## S0–S3 stages

| Stage | Captured value | Expected invariant | Observed result |
|---|---|---|---|
| S0 — Initial baseline | Valid synthetic Schema v1 Resume, `activeSections`, UI `theme` and `templateId`; persisted initial envelope. | Baseline equals the legal fixture and is persisted under the two current formal keys. | Passed. |
| S1 — Controller update | The six values are sent through official `useModuleEditor` / personal handlers, wired to `useResumeStore.updateResume`. | Only six `resume.personal.*` leaves change; Resume still parses as Schema v1; all other Resume/UI state is unchanged. | Passed. Structured S0→S1 diff contains exactly the six target paths. |
| S2 — Persistence | Read back the raw `inkless-cat/resume-store` and `inkless-cat/ui-store` envelopes from isolated localStorage. | The complete legal Resume, `activeSections`, `theme`, and `templateId` match S1. No runtime revision/generation metadata is persisted. | Passed. S1→S2 business-data diff is empty. |
| S3 — Rehydrate | Reset only test memory state, load the actual S2 serialized envelopes through official Store rehydration, then snapshot the resulting state. | All valid Resume/UI state and the preview inputs match S2. | Passed. S2→S3 business-data diff is empty; Resume validates as Schema v1. |

The snapshot script compares business state only. `workspaceGeneration` and `workspaceRevision` are in-memory change-tracking metadata and are intentionally excluded by the official persistence `partialize`; their absence is not data loss.

## Storage write failure

The isolated test throws from `localStorage.setItem` only for the formal resume-store key. The official storage wrapper catches the write exception and calls the existing persistence reporter. The assertions and `m01-storage-write-failure.json` show:

- the updated summary remains in the current in-memory Resume;
- the previously serialized durable Resume remains byte-for-byte unchanged;
- the existing user-visible storage failure alert is emitted;
- no success alert is emitted;
- other Resume fields, active sections, and UI state stay unchanged.

The formal behavior is not automatic memory rollback. A reload restores the last durable value. The M01 page does not render a saved/success claim.

## Evidence and test outcome

- `npm test -- --configLoader native --fsModuleCachePath /private/tmp/inkless-cat-d1-vitest-cache src/entities/resume/model/m01-personal-data-invariant.test.tsx src/features/edit-module/model/usePersonalEditor.m01.test.tsx`: 2 files / 3 tests, exit 0, Node 24.22.1/npm 11.20.0.
- Targeted ESLint for the two assigned test files: exit 0.
- Machine-readable synthetic snapshots, persisted payloads and structured path diffs: `test-results/d1-domain/m01-s0-s3-data-invariant.json`.
- Machine-readable storage failure memory/disk/feedback evidence: `test-results/d1-domain/m01-storage-write-failure.json`.

The test harness used Vitest's native config loader and a `/private/tmp` cache because the isolated worktree's default Vite `.vite-temp` directory is not writable without the approved worktree test permission. No production Store, Schema, migration, persistence key, or Controller behavior was changed to make these checks pass.
