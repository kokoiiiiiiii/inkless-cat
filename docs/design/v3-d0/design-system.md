# Inkless-Cat V3 D0 · Design System

This token set belongs to the isolated prototype root `data-studio-v3`. It is not a proposal to replace production theme tokens until the user chooses a direction.

## Foundations

### Color

| Token | Draftbook light | Pageboard light | Dark theme base | Use |
|---|---|---|---|---|
| Canvas | `#f1f1eb` | `#f1f1eb` | `#171c18` | Studio work surface |
| Surface | `#fffefa` | `#fffefa` | `#202722` | Work panes and dialogs |
| Quiet surface | `#f7f7f1` | `#f7f7f1` | `#252e28` | Hover and secondary controls |
| Ink | `#1e2821` | `#1e2821` | `#f0f2ee` | Primary text |
| Muted | `#536158` | `#536158` | `#c2ccc4` | Supporting text |
| Strong divider | `#bcc8bd` | `#bcc8bd` | `#526358` | Input borders and structure |
| Accent | `#285a40` | `#8c492f` | `#a7d3ad` / `#f0b99d` | Primary action and active task |
| Accent wash | `#e8f0e9` | `#f2e8e1` | `#29392e` / `#402f29` | Selected or highlighted state |
| Focus | `#1f65b6` | `#1f65b6` | `#83b9ff` | Keyboard focus ring |
| Danger | `#a33e35` | `#a33e35` | `#f6a99f` | Error text and feedback |
| Success | `#276b49` | `#276b49` | `#9dd2aa` | Confirmed local action |
| Resume paper | `#fffefa` | `#fffefa` | `#f8f6ef` | Paper stays light for readable contrast |

Direction B uses a warm terracotta accent while Direction A uses forest green. Accent differences reinforce two separate task models; the layouts and navigation also differ.

### Typography

- Studio interface: Inter when available, then system sans-serif fallbacks. Body default is 16px / 1.5.
- Resume identity and chapter headings: Georgia/Times serif. Chinese characters use system CJK fallbacks.
- Form labels and secondary metadata: 12–13px, medium or semibold; labels remain visible above inputs.
- Resume body: 11–13px depending on paper presentation; mobile content reflows to available width rather than scaling a fixed A4 page.
- No custom font download or external font request is made by the prototype.

### Spacing, shape, elevation, and rules

| Scale | Values |
|---|---|
| Spacing | 4, 8, 12, 16, 20, 24, 32, 40px |
| Radius | 5px compact controls, 9px panels, 15px rare large surface |
| Elevation | One soft surface shadow for paper/dialog; no stacked card shadows |
| Divider | 1px semantic divider; strong control outline for inputs |
| Focus ring | 3px solid semantic focus token with 3px offset |

Direction A uses the chapter rail and quiet rules to support long writing sessions. Direction B uses page and section rules to make résumé content itself the navigation surface. Neither direction relies on glass blur, glow, gradients, or nested dashboard cards.

## Responsive rules

- `≤700px`: independently composed phone navigation and content; no fixed desktop sidebars.
- `≤380px`: compact brand header wraps the direction switch into its own row; action targets stay at least 44px tall.
- Landscape tablet/phone (`≤900px` wide and `≤500px` high): reduce only the navigation height; keep the same content and task hierarchy.
- Direction A: mobile section picker, one active section, full-width fields, readable preview task.
- Direction B: mobile résumé canvas at phone width; selecting a section opens an editing sheet that can return to its anchor.
- Input heights are at least 46px. Reorder, visibility, entry, template, and navigation controls are at least 44×44 CSS px on mobile.
- Dialogs use a bottom sheet for general actions and a full-height editing sheet on mobile. Bottom padding includes `env(safe-area-inset-bottom)`.

## Interaction states

| Component | States exercised or defined |
|---|---|
| Button | Primary, secondary, quiet, danger; hover, active, visible focus, disabled |
| Field | Rest, focus ring, required, placeholder, disabled; explicit visible label |
| Template option | Unselected, selected, hover, keyboard focus |
| Module row | Visible/hidden, first/last reorder disabled, enabled reorder, local add |
| AI sample | Idle, loading, suggestion, error/retry, explicitly applied |
| Dialog/sheet | Open, focused, Escape/close, focus contained with Base UI guards, trigger restoration |
| Save/export/import | Honest `Demo · not saved`, sample-only input, no fake file or PDF success |

## Motion

| Motion | Duration | Purpose |
|---|---:|---|
| Button color/border | 120ms | Immediate hover/pressed recognition |
| Work-mode swap | 160ms | Small opacity and 4px vertical continuity cue |
| Dialog overlay | 140ms | Establish modal layer |
| Dialog panel | 160ms | Short 5px entry; no animated document text |
| AI loading mark | 800ms loop only while labelled demo loading | Indicate the local sample delay |

Motion for React is the sole React animation engine. CSS owns simple hover/color changes and the small loading indicator. `MotionConfig reducedMotion="user"`, `useReducedMotion()`, and a scoped reduced-motion CSS rule remove transforms/smooth scrolling and shorten all motion to 0.01ms when requested.

## Accessibility targets and measured palette checks

Calculated contrast ratios for representative token pairs (sRGB relative luminance):

| Pair | Ratio | Target |
|---|---:|---:|
| Light body `#536158` / canvas `#fffefa` | 6.47:1 | 4.5:1 |
| Light body / canvas `#f1f1eb` | 5.75:1 | 4.5:1 |
| Light field label `#34423a` / white control | 10.48:1 | 4.5:1 |
| White label / Draftbook primary `#285a40` | 7.99:1 | 4.5:1 |
| Dark body `#c2ccc4` / dark surface `#202722` | 9.26:1 | 4.5:1 |
| Dark field label `#d5ded7` / dark surface | 11.10:1 | 4.5:1 |
| Dark primary `#18231b` / green accent `#a7d3ad` | 9.70:1 | 4.5:1 |
| Dark primary `#39241c` / terracotta accent `#f0b99d` | 8.41:1 | 4.5:1 |
| Light control border `#89968c` / paper `#fffefa` | 3.06:1 | 3:1 non-text |
| Dark control border `#87958a` / field `#252e28` | 4.46:1 | 3:1 non-text |
| Light focus `#1f65b6` / paper | 5.79:1 | 3:1 non-text |
| Dark focus `#83b9ff` / field | 6.90:1 | 3:1 non-text |

Keyboard and modal behavior is browser-tested. The 200% font-enlargement browser test is an app-root text scaling simulation, not page zoom. True browser-level 200% zoom is recorded separately in the validation report. Real iPhone Safari remains pending.

## Implementation boundary

- Tokens live in CSS Modules under the V3 page root as `--studio-v3-*`; no `@theme`, `:root`, `html`, `body`, global reset, or formal print CSS edits are made.
- CSS Module class names scope component and layout rules. `@reference` only reads existing Tailwind definitions; it does not emit Tailwind utilities or alter their global output.
- Dialog portals mount within the V3 root so theme and component styles continue to inherit.
- Component code is local to `src/shared/ui/v3/`; it does not depend on formal Resume entities or Store schema.
