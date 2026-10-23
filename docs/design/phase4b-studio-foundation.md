# Phase 4B — Liquid Glass Studio Foundation

## Design decisions

The workbench opens on **B · Spatial Workspace**, uses **A · Frosted Studio** for a small number of clear glass surfaces, and keeps **C · Aurora Glass** as two static, low-opacity workspace background glows. The form controls remain opaque, and the synthetic A4 preview remains white in both themes. There is no A/B/C direction selector in this phase.

The production `/` editor remains on its existing app tree. `/design/phase4b` is selected in `src/main.tsx` and its page is loaded with `React.lazy`; the route imports its own CSS after that chunk is requested. The prototype uses no production resume store, workspace storage, AI provider, interview session, import/export service, print renderer, or real resume content.

## FSD structure and state boundary

| Layer      | Location                    | Responsibility                                                                                                                                                |
| ---------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared`   | `src/shared/ui/studio/`     | Scoped design tokens, glass surface and button, form, card, dialog, popover, toast, segmented control, and inline icon primitives. No business store imports. |
| `features` | `src/features/studio-demo/` | Synthetic resume fields, module order/visibility, template choice, interview presentation state, and provider-settings demo. State is page memory only.       |
| `widgets`  | `src/widgets/studio-shell/` | Header, stable desktop navigation, compact navigation, responsive workspace, mobile switcher, A4 frame, and preview scale control.                            |
| `pages`    | `src/pages/phase4b-studio/` | Lazy route and composition of the demo panels with the studio shell.                                                                                          |

CSS variables are prefixed `--studio-*` and declared only on `.studio-root`; component selectors use the same root namespace. The project already uses Tailwind 4's CSS-first build. Phase 4B keeps its runtime tokens as scoped CSS custom properties instead of adding global `@theme` entries, so the experiment cannot alter production theme values.

Demo state is split between `useDemoStudio` (resume data, modules, template) and local shell or panel state (theme, selected navigation, mobile view, dialog, toast, preview zoom, interview answer). Switching between edit and preview hides the inactive panel without unmounting it. Nothing is persisted.

## Phase 4C component migration map

| Phase 4B component                                                                | Production counterpart                               | Phase 4C integration                                                                                                                                          |
| --------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StudioShell`                                                                     | `EditorPageShell`                                    | Replace visual shell only; retain the existing page controller and providers.                                                                                 |
| `StudioHeader`                                                                    | `Topbar`                                             | Adapt existing action callbacks and status props; do not reproduce import, export, or persistence logic.                                                      |
| `StudioSidebar`                                                                   | `EditorSidebarPane`                                  | Connect to existing module state and preserve current selection and ordering contracts.                                                                       |
| `StudioWorkspace` / `StudioEditorPanel`                                           | `EditorPageShell` / editor content pane              | Provide presentation containers around existing editor sections; retain validation and editing callbacks.                                                     |
| `StudioPreviewPanel`                                                              | `EditorPreviewPane`                                  | Replace the demo frame with the production `ResumePreviewView` and keep its current preview controls.                                                         |
| `StudioMobileNavigation`                                                          | `MobileSwitcherBar`                                  | Keep the selected edit/preview state in the existing editor controller and maintain focus/scroll position across switches.                                    |
| `StudioPaperFrame`                                                                | No direct production counterpart                     | Treat as a synthetic content container only. Do not connect it to export or printing.                                                                         |
| `GlassSurface`, buttons, fields, cards, dialog, popover, toast, segmented control | Existing shared UI and business dialogs              | Reuse visual primitives after API and accessibility review; keep confirmation and business state in existing features.                                        |
| `DemoResumeEditor`, `DemoModuleManager`, `DemoTemplateSelector`                   | `ModulesPanel`, `SectionManager`, `TemplateSelector` | Replace only after adapters are written to the current feature models and production tests cover ordering, visibility, custom templates, undo and validation. |
| `DemoInterview`, `DemoProviderSettings`                                           | AI interview and provider settings features          | Do not migrate their demo state; restyle the existing session/provider components behind explicit presentation adapters.                                      |

### Reuse readiness

- **Ready as visual references:** `StudioShell`, `StudioHeader`, `StudioSidebar`, `StudioWorkspace`, `StudioMobileNavigation`, `StudioPreviewPanel`, and the isolated primitives. Their props describe display state and callbacks rather than store APIs.
- **Demo-only:** every `Demo*` panel, `useDemoStudio`, `StudioPaperFrame`, sample strings, template swatches, and preview scale. They must not become business data or print code.
- **Future adapters required:** shell action callbacks, editor-field changes, module ordering/visibility, template selection, preview state, and AI/provider panel presentation.
- **Migration risks:** existing undo/redo and ABA behavior, current selection after module changes, custom sections and templates, AI session isolation, human fact confirmation, provider-key protection, narrow-screen focus restoration, and existing print/export contracts.

### Preserving A4 and printing

Phase 4C must keep `ResumePreviewView` and the production print CSS as the only source for page margins, page breaks, pagination and exported output. The Studio paper is not a print view. Before changing the production preview shell, compare the same synthetic fixture and representative long-content cases against current browser preview and generated PDF output, including page count, Chinese line wrapping, margins and page breaks. Any print discrepancy blocks replacing the production renderer.

## Responsive and accessibility notes

- At 1240px and wider, use the full navigation, editor and preview workbench. At 1001–1279px, the navigation rail contracts while both content columns remain. At 769–1000px, a two-column editor/preview layout uses compact navigation. At 768px and below, a single panel uses the bottom Edit, Preview, Templates and More controls.
- Mobile form controls use 16px text, supporting text is at least 12px, and main navigation and module controls have at least 44px hit areas. The bottom switcher reserves safe-area padding and hides while a focused text control is covered by a resized visual viewport.
- Native form labels, radio inputs and a native modal `<dialog>` provide names, radio-key behavior, Escape handling and a focus trap. The menu supports Arrow Up/Down, Home/End and Escape. Module order has explicit keyboard-accessible move buttons.
- The local CSS includes reduced-motion, reduced-transparency, forced-colors, and no-`backdrop-filter` fallbacks. The paper and controls remain readable without blur.

## Visual artifacts and scope

The `phase4b-studio-visual-review` GitHub Actions artifact is uploaded only for pull requests whose head branch starts with `design/phase4b-`. It contains fresh Phase 4B screenshots (desktop light/dark, 1024px, 768px, 390px, 320px, modules, templates, dialog, A4 preview); they are review evidence, not a legacy pixel-parity baseline. No `visual-parity` label is required or added.
