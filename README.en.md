# Inkless Cat 🐾

![Inkless Cat logo](src/assets/Inkless%20Cat.png)

Inkless Cat is a zero-backend, browser‑based resume editor. It organizes content with modular sections and templates, offers live preview, autosave, JSON/Markdown export, and one‑click print to PDF — great for maintaining resume versions solo or with a team.

Language: English | [简体中文](./README.md)

Live Demo: https://inkless-cat.pages.dev/

## Features

- Modular editing: enable/disable standard sections, reorder via drag & drop.
- Live preview: edit on the left, preview on the right.
- Templates & themes: multiple built‑in templates; create/update/delete your own custom templates (colors, fonts, theme tokens).
- Multiple exports: export JSON and Markdown; print to PDF via the browser.
- Import & samples: import JSON; built‑in sample resumes for engineer/designer/product roles.
- Local autosave: changes are persisted to localStorage; reset anytime.
- Mobile friendly: quick toggle between Editor and Preview on small screens.
- Hotkeys: when the Module Manager is open, use Ctrl/⌘+Z to undo the last sort.

## Tech Stack

- React 19 + TypeScript
- Vite 7 (dev/build)
- Tailwind CSS + SCSS (styling)
- Immer (immutable updates)
- FSD‑inspired layering (pages/widgets/features/entities/shared) + path aliases

## How To Use

- Top bar actions: Load Sample, Clear, Import (JSON), Export (JSON/Markdown), Print/PDF, Theme toggle.
- Module Manager: enable/disable standard sections, add custom sections (fields/list/text), drag to sort, restore original order, undo last sort.
- Template panel: switch styles, load template samples, save/update/delete custom templates.
- Print/PDF: click Print/PDF and choose "Save as PDF". On small screens the UI switches to preview before printing.
- Persistence: data is stored in localStorage keys like `inkless-cat-data`, `inkless-cat-theme`, `inkless-cat-template`.

## Quickstart

Requirements: Node.js 18+, npm 9+ (or an equivalent package manager)

```bash
npm install           # install dependencies
npm run dev           # start dev server (defaults to http://localhost:5173)
npm run build         # build static assets to ./dist
npm run preview       # preview the production build locally
npm run lint          # run ESLint checks
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
    editor-shell/         # Editor controller, storage sync, scroll sync
    resume-preview/       # Live resume preview
    export-resume/        # Export JSON/Markdown
    import-resume/        # Import JSON
    sort-modules/         # Sorting (drag/restore/undo)
    edit-module/          # Editing logic (forms/lists)
  entities/
    resume/               # Resume schema/selectors/factory/normalizers
    module/               # Module definitions/order/drag utilities
    template/             # Template types and built‑in samples
    ui/                   # UI store (theme/template toggles)
  shared/                 # Generic hooks/lib/config/ui
  styles/                 # Global and print styles
  assets/                 # Images/icons/fonts
  main.tsx                # Entry
```

## Quality & Tooling

- Linting: `eslint.config.js` integrates React/TS/import/jsx‑a11y/unicorn/security/tailwindcss, enforces import boundaries and alias usage.
- Tailwind content: configured to scan `features/entities/widgets/pages/shared/app` to avoid purging required classes in production.
- Build: Vite 7 + Terser; drops `console` and `debugger` in production builds.

## Data & Privacy

This is a pure front‑end application — no servers, no databases. Your resume never leaves your browser. Local persistence uses these keys:

- `inkless-cat-data`: current resume snapshot
- `inkless-cat-theme`: light/dark theme
- `inkless-cat-template`: active template ID
- `inkless-cat-sections`: enabled section order
- `inkless-cat-custom-templates`: custom template list

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

