# Typography Roles

Tailwind provides the primitive scale, spacing, weights, tracking, and colors.
`src/styles/typography.css` composes those primitives into semantic roles. Use
the role class when content has a known editorial job; do not repeat individual
`text-*`, `font-*`, `leading-*`, `tracking-*`, and color utilities together.

| Role | Use it for |
| --- | --- |
| `font-eyebrow` | Short section label; uppercase with expanded tracking in English only |
| `font-home-hero-title` | Home page’s main heading |
| `font-hero-title` | Standard page-hero heading |
| `font-page-title` | Page heading outside a hero; use `font-page-title-inverse` on a dark hero |
| `font-section-title` | Section heading |
| `font-subsection-title`, `font-card-title` | Subsections and card headings; add `font-card-title-display` for the large card-title variant |
| `font-status-title` | Success, empty, and error page headings |
| `font-hero-lede`, `font-page-lede`, `font-home-hero-lede` | Supporting copy paired with a title; use `font-page-lede-inverse` on a dark hero |
| `font-paragraph` | Paragraphs and sustained reading copy; use `font-paragraph-foreground`, `font-paragraph-muted`, or `font-paragraph-compact` only for the documented variant |
| `font-bullet`, `font-quote` | Standalone list copy and pull quotes; generated rich text applies these recipes automatically |
| `font-meta`, `font-caption`, `font-badge`, `font-code` | Metadata, captions, badges, and monospace identifiers; `font-meta-compact` is for fixed-height badges only |
| `font-nav`, `font-button` | Navigation and button labels |
| `font-label`, `font-input` | Form labels and editable field text |
| `font-table-head`, `font-table-cell` | Table header and table-cell text |
| `font-stat-value`, `font-stat-label` | Hero statistics |

The role sets family, size, weight, leading, tracking, and a default semantic
color. Use the documented role variant for an intentional alternate treatment;
do not override a role's type properties with raw utilities in component markup.
`content-prose` and `content-table` are structural helpers only: pair either
with `font-paragraph` and let their descendants inherit the matching semantic
heading, quote, code, and table roles. Do not combine them with Tailwind's
`prose` classes on public content; that introduces a competing type system.

## Adoption Boundary

Use a semantic role in shared primitives, repeated UI patterns, public page
templates, and all editor-generated content. A one-off component may use
Tailwind's standard typography utilities when no documented role describes its
job; those utilities remain tokenized primitives, not custom values. Do not add
arbitrary typography values such as `text-[...]`, `leading-[...]`, or
`tracking-[...]` without first extending this role system.

## Reading and Task Contexts

- **Expressive roles** (`font-home-hero-title`, `font-hero-title`, and page
  ledes) are for public entry points and reading-led content. They may scale
  across viewports, but never sit in fixed-height text containers.
- **Productive roles** (`font-nav`, `font-button`, `font-label`, `font-input`,
  `font-table-head`, and `font-table-cell`) are for controls, forms, and dense
  data. Keep the role pairing intact within a component or task region.
- **Language metrics** stay in `:root` and `:root[lang="ne"]`. English can use
  modest negative heading tracking; Nepali resets it, uses a wider hero measure,
  and receives more leading for Devanagari marks.

## Accessibility Checks

All public text uses relative units through Tailwind's scale. Keep text
containers height-auto and avoid clipping, so browser zoom and user text
spacing overrides can expand content. Before release, verify public pages at
200% browser zoom and with at least `1.5` line height, `2em` paragraph spacing,
`0.12em` letter spacing, and `0.16em` word spacing.

## English and Nepali

All roles have English and Nepali versions selected by the document language.
The i18n configuration keeps `html[lang]` in sync with the active language;
the initial document uses Nepali because it is the server-rendered default.

- English uses the system sans-serif stack and tighter display rhythm.
- Nepali uses the bundled `Noto Sans Devanagari` variable font, relaxed heading
  and reading leading, and no Latin-only uppercase/expanded label tracking.
- Do not add language checks to individual components. Add any script-specific
  adjustment to the role in `src/styles/typography.css` under `:root[lang="ne"]`.
- `font-code` is intentionally language-invariant: it is reserved for Latin
  identifiers and uses the monospace stack's fixed metrics.

## Layout helpers

Use `layout-container` for a normal page gutter and `layout-container-wide` for
denser data or media. `measure-reading`, `measure-prose`, `measure-intro`, and
`measure-heading` wrap Tailwind’s existing max-width scale for readable text.
