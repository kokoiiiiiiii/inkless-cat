# Inkless Cat 🐾

![Inkless Cat logo](src/assets/Inkless%20Cat.png)

Inkless Cat is a zero-backend, ready-to-use open source resume editor. It organizes content with a modular-section plus template model, provides live preview, offline persistence, Resume/Workspace JSON and Markdown export, and one-click browser printing to PDF. It works well for both individual use and collaborative resume maintenance.

Language: English | [简体中文](./README.md)

Live Demo: <https://inkless-cat.pages.dev>

## Features

- Modular editing: enable/disable standard sections, reorder via drag & drop.
- Live preview: edit on the left, preview on the right.
- Templates & themes: multiple built‑in templates; create/update/delete your own custom templates (colors, fonts, theme tokens).
- Multiple exports: export Resume JSON, Workspace JSON, and Markdown; print to PDF via the browser.
- Import & samples: auto-detect Resume / Workspace JSON; built‑in sample resumes for engineer/designer/product roles.
- Local autosave: official persistence is handled by Zustand `persist`; legacy localStorage keys are migrated on startup.
- Mobile friendly: quick toggle between Editor and Preview on small screens.
- Hotkeys: when the Module Manager is open, use Ctrl/⌘+Z to undo the last sort.

## Tech Stack

- React 19 + TypeScript
- Vite 7 (dev/build)
- Tailwind CSS + PostCSS Nesting (styling)
- Immer (immutable updates)
- Zustand + `persist` (entity/UI stores with browser persistence)
- FSD‑inspired layering (pages/widgets/features/entities/shared) + path aliases

## How To Use

- Top bar actions: Load Sample, Clear, Import (JSON), Export (Resume JSON / Workspace JSON / Markdown), Print/PDF, Theme toggle.
- Module Manager: enable/disable standard sections, add custom sections (fields/list/text), drag to sort, restore original order, undo last sort.
- Template panel: switch styles, load template samples, save/update/delete custom templates.
- Print/PDF: click Print/PDF and choose "Save as PDF". On small screens the UI switches to preview before printing.
- Persistence: official writes go to `inkless-cat/resume-store` and `inkless-cat/ui-store`; legacy keys are read once for migration only.

## Quickstart

Requirements: Node.js `^20.19.0` or `>=22.12.0`, npm 10+ (or an equivalent package manager)

```bash
npm install           # install dependencies
npm run dev           # start dev server (defaults to http://localhost:5173)
npm run build         # build static assets to ./dist
npm run preview       # preview the production build locally
npm run lint          # run ESLint checks
npm test              # run Vitest regression tests (store persist, schema/migration, import/export, module interactions)
npm run test:watch    # run tests in watch mode
npm run test:bench    # run lightweight store benchmarks
```

## Architecture & Structure

This project follows an FSD‑inspired layering to prevent cross‑layer coupling and path penetration: pages → widgets → features → entities → shared. Import only via each layer's public `index.ts`. Path aliases are configured for both Vite and TypeScript: `@app/*`, `@pages/*`, `@widgets/*`, `@features/*`, `@entities/*`, `@shared/*`, `@/*`.

```text
src/
  app/                    # Providers and app wiring
  pages/
    editor/               # Route-level page (composition only)
  widgets/
    topbar/               # Top bar and actions
    modules-panel/        # Module manager and editors
    template-selector/    # Template selection and customization
  features/
    editor-shell/         # Editor controller, template panel, scroll sync, IO actions
    resume-preview/       # Live resume preview
    export-resume/        # Export Resume JSON / Workspace JSON / Markdown
    import-resume/        # Import Resume JSON / Workspace JSON
    sort-modules/         # Sorting (drag/restore/undo)
    edit-module/          # Editing logic (forms/lists)
  entities/
    resume/               # Resume schema, migrations, selectors, factory, normalizers
    module/               # Module definitions/order/drag utilities
    template/             # Template types, schema, migrations, built‑in samples
    ui/                   # UI store (theme/template toggles)
    workspace/            # Workspace schema, migrations, persist compatibility
  shared/                 # Generic hooks/lib/config/ui
  styles/                 # Global and print styles
  assets/                 # Images/icons/fonts
  main.tsx                # Entry
```

## State Management & Persistence

- Single official persistence protocol: Zustand `persist` is the only official persistence layer; old keys are not written anymore.
- Store split: `entities/resume` persists `resume + activeSections`; `entities/ui` persists `theme + templateId + customTemplates`.
- Session state is not persisted: `hasResumeChanges`, `templatePanelOpen`, `modulePanelOpen`, and `mobileView` stay in-memory for the current session only.
- Startup migration: legacy localStorage keys are read once, normalized into the new persisted shape, then removed.
- DOM sync: theme changes update `document.documentElement` (`dark` class + `data-theme`) to avoid flicker.
- Observability: store logs are prefixed with `[store:resume]` / `[store:ui]` for quick troubleshooting.

## Import & Export Formats

### Resume JSON

- Contains only the resume body data.
- The root object includes `schemaVersion` for future migrations.
- Best suited for interoperability with other tools.

Example:

```json
{
  "schemaVersion": 1,
  "personal": {},
  "experience": [],
  "education": [],
  "projects": [],
  "skills": [],
  "socials": [],
  "languages": [],
  "interests": [],
  "awards": [],
  "customSections": []
}
```

### Workspace JSON

- Intended for full backup and restore of the editing workspace.
- Includes the active template, theme, custom templates, and section order/state.

Example:

```json
{
  "version": 1,
  "resume": {},
  "activeSections": [],
  "theme": "light",
  "templateId": "modern-blue",
  "customTemplates": []
}
```

### Import Pipeline

- Imports always follow: `parse JSON -> schema validate -> migrate -> normalize -> write store`
- Invalid JSON, missing fields, incorrect types, and unsupported future versions are rejected.
- The import entry auto-detects Resume JSON and Workspace JSON.

## Schema & Migration

- `resume.schemaVersion = 1`
- `workspace.version = 1`
- Migration entry points:
  - `entities/resume/migrations/resume.ts`
  - `entities/template/migrations/template.ts`
  - `entities/workspace/migrations/workspace.ts`
  - `entities/workspace/model/persist.ts`
- Future compatibility should be added in the migration layer instead of being scattered across stores, hooks, or pages.

## Extending

### Add a Module

1. Declare the section definition and default order in `src/entities/module/lib/sections.ts`.
2. Extend schema and normalization in `src/entities/resume/schema/resume.ts` and `src/entities/resume/lib/normalizers.ts`.
3. Add the matching UI in the editor and preview layers.
4. Add tests for import/export and migration behavior.

### Add a Template

1. Add the template definition in `src/entities/template/lib/templates.ts` or `src/entities/template/lib/samples/*`.
2. Reuse `TemplateTheme` and `normalizeTemplateTheme` when the template needs custom theme fields.
3. Update template migration tests if the change affects persistence compatibility.

## Quality & Tooling

- Linting: `eslint.config.js` integrates React/TS/import/jsx‑a11y/unicorn/security/tailwindcss, enforces import boundaries and alias usage.
- Tailwind content: configured to scan `features/entities/widgets/pages/shared/app` to avoid purging required classes in production.
- Build: Vite 7 + Terser; drops `console` and `debugger` in production builds.

## Data & Privacy

This is a pure front‑end application — no servers, no databases. Your resume never leaves your browser. Official persisted keys are:

- `inkless-cat/resume-store`
- `inkless-cat/ui-store`

Legacy keys such as `inkless-cat-data` and `resume-studio-data` are read only during migration and removed after a successful upgrade.

## Roadmap

- More built‑in templates and print layouts
- Enhanced Markdown export (configurable headings/separators)
- Template/theme sharing (import/export bundles)
- More hotkeys and accessibility improvements
- i18n and multi‑language content

## Contributing

We welcome issues and PRs for features, fixes, and docs:

1) Open an issue describing your intent and approach.
2) Fork the repo and implement on a feature branch.
3) Run `npm run lint` before submitting; describe your changes clearly.
4) Follow layering and public‑entry import rules (see Architecture & Structure).

## License

Apache License 2.0. See [LICENSE](./LICENSE).
