# D1 Data Flow

```text
M01 controlled field
  → existing modulesPanelController.handlePersonalChange
  → usePersonalEditor length guard and field mutator
  → useModuleEditor updateDraft callback
  → useResumeActions.updateResume
  → useResumeStore.updateResume (Immer, canonical ResumeData)
  ├─→ current Store value → form value
  ├─→ deferred Resume/sections + current active template → ResumePreview
  └─→ existing Zustand persistence → inkless-cat/resume-store localStorage key
        → browser reload → persisted-state sanitizer/rehydration → same Store and preview
```

`activeSections` is persisted beside Resume and unchanged by these six property updates. UI `theme` and `templateId` remain in `useUIStore` under `inkless-cat/ui-store`; the current appearance mode scopes Studio tokens while `templatePanel.activeTemplate` supplies independent ResumePreview props. There is one authoritative Resume object and no M01 draft store.

On a storage write exception, the in-memory edit still appears in the current Store and preview. The official persistence reporter presents an error alert that says the latest edits were not saved. No save-success state is rendered. Reload recovers the last successfully persisted Resume. This behavior is tested explicitly and is not presented as an automatic memory rollback.
