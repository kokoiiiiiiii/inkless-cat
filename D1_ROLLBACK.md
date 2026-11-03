# D1 Rollback

1. Keep the feature gate off by leaving `VITE_ENABLE_M01_PROFILE_SLICE` unset. Production `DEV` is false, so the M01 import is removed from the default build.
2. To remove the candidate source, revert the D1 commit or remove the M01 page, App-level adapter, gated import, public controller barrel export, D1-only config/typecheck entries, tests and evidence docs.
3. Keep `useResumeStore`, `useUIStore`, Schema v1, migrations and both official persistence keys unchanged.
4. Do not clear or rewrite user localStorage. D1 adds no migration and makes no new storage writes outside the existing formal Resume/UI Stores.
5. The existing Editor entry remains the default when the gate is false.
