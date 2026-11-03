# D1 Adapter Contract

## Frozen page API

`M01ProfilePage` is a presentation-only component with this contract:

```ts
type M01ProfilePageProps = {
  personal: ResumePersonal;
  previewResume: ResumeData;
  activeSections: ActiveSectionKey[];
  templateStyle: string;
  accentColor?: string;
  theme?: TemplateTheme;
  themeMode?: 'light' | 'dark';
  onPersonalChange: PersonalHandlers['handlePersonalChange'];
};
```

The form reads only the six approved editable keys from `personal`. It passes a field and string value directly to `onPersonalChange`. It does not keep a Resume copy, call storage, create a Store, add validation, show a save-success signal, or initialize demo content. The preview receives `previewResume` and the official template props.

`theme` is the active template's `TemplateTheme` for ResumePreview. `themeMode` is the independent UI Store appearance mode for Studio primitives; they are passed separately so styling does not conflate template styling with application appearance.

## Official controller path

The App-level `M01ProfileSliceRuntime` calls the existing `useEditorPageController` under the existing application providers. It passes:

- `controller.resume.personal` as the current canonical form value;
- `controller.modulesPanelController.handlePersonalChange` as the existing personal editor handler;
- `controller.deferredResume` and `controller.deferredActiveSections` to the preview, matching the current editor's deferred rendering behavior;
- `controller.templatePanel.activeTemplate.previewStyle`, `accentColor`, and `theme` to the preview.
- `controller.panelState.theme` to the page root as `themeMode`, preserving the current UI Store appearance in the existing Studio token scope.

That existing handler is composed by `useModulesPanelController` → `useModuleEditor` → `usePersonalEditor`; its update callback is `useResumeActions.updateResume`. The callback mutates only the selected property on the existing Resume draft. It preserves the rest of `personal`, all other Resume fields, `activeSections`, and the UI Store.

## Persistence and error behavior

The Store's existing synchronous localStorage middleware attempts a write after the in-memory state transition. A write failure leaves the new value in memory, leaves the old stored value intact when the storage operation throws before committing, and surfaces the existing persistence alert. There is no successful-save indicator in this screen. No new persistence contract is introduced.

## Page-owned behavior

The page may own transient focus or display state only. It may not clone or persist Resume data, call `replaceState`, set either localStorage key, or alter the formal controller's length/feedback behavior. A missing capability that would require a core Store, Schema, persistence or Controller semantic change blocks that extension and requires an ADR; this M01 slice does not require such a change.
