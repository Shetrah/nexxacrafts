# NexxaCraft Design System — "Precision Craft"

This document is the single source of truth for how NexxaCraft looks, reads and behaves across the
public website, the customer workspace and the staff portal. Every screen should be built from the
tokens and components described here (`src/components/ui`, `src/components/charts`,
`src/components/brand`), not from one-off styles.

---

## 1. Concept

NexxaCraft sits where **digital craft meets physical production**: websites and software, graphic
design, large-format print, stickers, branded merchandise and laser fabrication. The visual language
borrows quietly from the production floor — spec sheets, registration marks, cutting-mat grids, ink on
paper — and renders it with the restraint of a modern SaaS product.

**Electric blue** (from the logo) does the work. **Signal red** appears only as brand punctuation.
Everything else is ink, paper and hairlines.

### Principles

1. **Clarity first.** Every page answers: *what is this, what can I do, what happens next?*
2. **Precision over decoration.** Hairline borders, aligned grids, measured spacing. No blobs, glows,
   floating orbs, gradient text or looping animation.
3. **One accent at a time.** Blue for action. Red only for the logo and tiny brand markers. Semantic
   colours only for status — always with a label or icon, never colour alone.
4. **Specs are content.** References (`NCO-261107-AB12C`), dimensions (`2.40 × 1.20 m`), quantities and
   statuses are typeset like a production docket: mono or tabular figures, aligned, scannable.
5. **Calm motion.** 150–200 ms ease-out on hover, focus, open/close. Nothing loops. Respect
   `prefers-reduced-motion`.
6. **Honest content.** Never invent statistics, ratings, client counts, testimonials, turnaround
   promises or prices. Use real platform capabilities and real data only.

---

## 2. Colour tokens (Tailwind names)

| Token | Use | Values |
|---|---|---|
| `brand-*` (Electric Blue) | primary actions, links, focus, active nav, key data | 50 `#EEF3FF` · 100 `#DCE6FF` · 200 `#BFD0FF` · 300 `#93AEFF` · 400 `#5F83FF` · 500 `#2F5BFE` · **600 `#0341FC` (brand)** · 700 `#0234D0` · 800 `#062BA6` · 900 `#0B2783` · 950 `#0A1A50` |
| `accent-*` (Signal Red) | logo, tiny brand markers (index ticks, notification dot). **Not** for buttons or large areas | 50 `#FEF2F2` · 100 `#FEE2E2` · 200 `#FECACA` · 300 `#FCA5A5` · 400 `#F87171` · 500 `#EF4444` · **600 `#DC2626` (brand)** · 700 `#B91C1C` · 800 `#991B1B` · 900 `#7F1D1D` |
| `ink-*` | dark surfaces: footer, dark sections, admin sidebar | 600 `#2A3552` · 700 `#1D2740` · 800 `#131B2E` · **900 `#0B1220`** · 950 `#070B16` |
| `slate-*` (Tailwind) | text and neutral UI on light surfaces | headings `slate-900`, body `slate-700`, secondary `slate-600`, meta `slate-500` (minimum for meaningful text), disabled/decorative `slate-400` |
| `paper` / `paper-2` | warm off-white canvas for alternating marketing sections | `#F7F7F4` / `#EFEEE9` |
| `canvas` | workspace/admin app background | `#F4F6F9` |
| `line` / `line-strong` | hairline borders / input borders | `#E3E7EE` / `#CBD3DF` |
| `success-*` | completed, paid, approved | emerald scale (50 `#ECFDF5`, 600 `#059669`, 700 `#047857`) |
| `warning-*` | needs attention, pending, awaiting | amber scale (50 `#FFFBEB`, 600 `#D97706`, 700 `#B45309`, 800 `#92400E`) |
| `danger-*` | errors, cancelled, failed, destructive | red scale (50 `#FEF2F2`, 600 `#DC2626`, 700 `#B91C1C`) |
| `info-*` | informational, under review | sky scale (50 `#F0F9FF`, 600 `#0284C7`, 700 `#0369A1`) |

`primary-*` and `secondary-*` remain as aliases of `brand-*` and `accent-*` for backwards compatibility.

**Contrast rules.** Body text ≥ 4.5:1. `brand-600` on white = 6.6:1 (OK for text and buttons).
Never use `slate-400` or lighter for meaningful text on white. On `ink-900`, body text is `slate-300`
or `white/70`+, headings white.

---

## 3. Typography

| Role | Font | Notes |
|---|---|---|
| Display & headings | **Manrope** 700/800 (`font-display`) | tracking −0.02 to −0.035em; never all-caps |
| UI & body | **Inter** 400/500/600/700 (`font-sans`, default) | `tabular-nums` for numbers in tables/KPIs |
| Specs & references | **JetBrains Mono** 400/500 (`font-mono`) | references, dimensions, eyebrows, kbd hints |

Scale (utility classes defined in `index.css`):

| Class | Size | Use |
|---|---|---|
| `.text-display` | clamp(2.5rem → 3.75rem) / 1.05 | homepage hero only |
| `.text-h1` | clamp(2rem → 2.75rem) / 1.1 | page titles (public) |
| `.text-h2` | clamp(1.625rem → 2.25rem) / 1.15 | section titles |
| `.text-h3` | 1.25rem / 1.3 | card & panel titles |
| `.text-lead` | 1.125rem / 1.7, `slate-600` | intro paragraphs (max ~65ch) |
| body | 1rem / 1.65 | default |
| small | 0.875rem / 1.55 | secondary copy, admin body |
| `.eyebrow` | 0.75rem mono uppercase, tracking 0.12em, `brand-700` | section labels: `01 — Services` |

Staff portal: page titles `text-2xl font-display font-bold`, body `text-sm`, table header cells
`text-xs font-semibold uppercase tracking-wide text-slate-500`.

Use British English (colour, organisation, catalogue, personalise). Currency is KES via `money()`.

---

## 4. Space, layout, shape, elevation, motion

- **Grid:** 4 px base. Container `.container-page` = max-width 1240px, gutters 16px (mobile) / 24px
  (tablet) / 32px (desktop). Staff portal content max-width 1440px, padding 16px mobile / 24–32px desktop.
- **Section rhythm (public):** `py-16 md:py-24`. Section header → content gap 40–48px.
- **Radius:** `rounded-md` 6px badges & small controls · `rounded-lg` 8px buttons & inputs ·
  `rounded-xl` 12px cards, panels, menus · `rounded-2xl` 16px modals & large media. `rounded-full`
  only for avatars, counters, switches. **No 24–32px "bubble" cards.**
- **Elevation:** borders first. `shadow-xs` cards on paper · `shadow-md` popovers/menus ·
  `shadow-lg` modals/drawers. No coloured glows.
- **Z-index:** header 40 · dropdown/popover 50 · drawer/modal 60 · toast 70.
- **Motion:** `transition duration-150|200 ease-out`. Hover lifts ≤ 2px. Always add
  `motion-reduce:transition-none` / `motion-reduce:transform-none` on transforms.

---

## 5. Signature motifs (use sparingly — at most one or two per page)

- **Spec eyebrow** — `<Eyebrow index="01">Services</Eyebrow>` renders `01 — SERVICES` in mono with a
  short red tick. Section labels across the site.
- **Crop marks** — `<CropFrame>` draws four thin corner ticks around featured media (print registration).
- **Precision grid** — `.bg-grid` hairline 32px grid, masked with a radial fade. Hero backgrounds only.
- **Spec list** — `<SpecList>` key/value rows with dotted leaders and mono values, used for order
  configurations, job sheets and checkout summaries.

---

## 6. Imagery & icons

- Real production photography relevant to the service (printers, banners, stickers, mugs, laser
  machines, design work, code). Image manifest: `src/content/media.ts`; service images in `src/lib/catalog.ts`.
- Consistent aspect ratios: 4:3 cards · 16:10 features · 3:2 portfolio · 1:1 thumbnails.
  `object-cover`, 1px inner hairline (`ring-1 ring-inset ring-black/5`), no heavy overlays.
- Always `loading="lazy" decoding="async"` below the fold; the hero image is eager with
  `fetchPriority="high"`. Always reserve space (aspect-ratio box) to avoid layout shift. Use
  `srcSet`/`sizes` via the helpers in `src/content/media.ts`.
- Icons: **lucide-react only**, `strokeWidth={1.75}`. Sizes: 16 inline/small, 18 buttons, 20 nav,
  24 feature tiles. Feature icon tile: 40px `rounded-lg bg-brand-50 text-brand-700`.

---

## 7. Component inventory

Import from `@/components/ui` (barrel). The authoritative props are in the source; the summary below
is maintained alongside it. **Do not restyle components per page — extend the component instead.**

- **Actions:** `Button`, `ButtonLink` (react-router), `IconButton` (always has `label`), `Kbd`.
- **Forms:** `Field` (label/hint/error/required wiring via `useId`), `Input`, `Textarea`, `Select`,
  `Checkbox`, `Switch`, `OptionGroup` (segmented/radio-card picker, PCBWay-style), `NumberField`
  (stepper + unit), `FileDropzone` + `FileItem`, `SearchInput`.
- **Display:** `Card` (+ `CardHeader`, `CardBody`, `CardFooter`), `Badge`, `StatusBadge`
  (domain statuses via `src/lib/status.ts`), `Avatar`, `SpecList`, `StatCard`, `Timeline`,
  `ProgressSteps`, `Disclosure`, `Skeleton`, `Spinner`.
- **Navigation:** `Tabs`, `NavTabs` (router-linked), `SegmentedControl`, `Breadcrumbs`, `Pagination`,
  `Stepper` (multi-step forms), `PageHeader`, `FilterBar`.
- **Overlays:** `Modal`, `Drawer`, `ConfirmDialog`, `DropdownMenu`, `Tooltip`.
- **Feedback:** `Alert`, `EmptyState`, `ErrorState`, `LoadingState`, `ToastProvider` + `useToast()`.
- **Data:** `DataTable` (sortable, loading skeleton, empty state, **stacked cards on mobile**).
- **Layout (public):** `Container`, `Section` (tone `white | paper | ink`), `SectionHeader`,
  `Eyebrow`, `CropFrame`, `SkipLink`, `VisuallyHidden`.
- **Charts** (`@/components/charts`): `BarChart`, `AreaChart`, `DonutChart`, `BarList`, `Sparkline`,
  `StackedBar`, `ChartLegend` — SVG, accessible, with hover tooltips; colours from the validated
  palette in `src/components/charts/palette.ts`.
- **Brand** (`@/components/brand`): `Logo` (full lockup) and `LogoMark`, colour and inverse tones.

---

## 8. Patterns

- **Page header (portal & admin):** breadcrumbs → title + one-line description → primary action on the
  right. One primary button per view.
- **Lists:** `FilterBar` (search + status filter + secondary filters) → `DataTable` → `Pagination`.
  Clicking a row opens a `Drawer` with details; destructive or state-changing actions confirm.
- **Forms:** labels above inputs; required fields marked; helper text under the field; inline errors
  on blur/submit with a summary `Alert` for multi-field failures; focus the first invalid field;
  primary action bottom-left on desktop, full-width sticky on mobile for long flows.
- **Multi-step flows:** `Stepper` at top, one concern per step, "Back"/"Continue" footer, persistent
  summary panel (sticky on desktop, collapsible bottom bar on mobile).
- **Status:** always `StatusBadge` (dot + label). Order progress uses `ProgressSteps`/`Timeline`.
- **Feedback:** success of an action → toast. Load failure → `ErrorState` with retry. Validation →
  inline. Nothing loaded yet → `Skeleton`/`LoadingState`. No data → `EmptyState` that explains what
  will appear and offers the next action.
- **Responsive:** design mobile-first; tables become stacked cards below `md`; sidebars become
  drawers; touch targets ≥ 40px; no horizontal page scroll at 360px.

---

## 9. Accessibility checklist (every screen)

- Landmarks: `header`, `nav[aria-label]`, `main#main-content`, `footer`; skip link first in the DOM.
- Every input has a visible `<label>` (via `Field`); errors linked with `aria-describedby`, `aria-invalid`.
- Visible focus on every interactive element (global `:focus-visible` outline; inputs use ring).
- Icon-only buttons have `aria-label` (enforced by `IconButton`'s required `label`).
- Dialogs/drawers trap focus, close on `Esc`, restore focus; menus support arrow keys.
- Toasts announce via `aria-live`; loading regions use `aria-busy`.
- Colour is never the only signal; status badges carry text.
- Headings are hierarchical (one `h1` per page).

---

## 10. Functional guard-rails (for anyone changing UI)

- Keep `src/lib/supabase.ts`, `src/lib/platform.ts`, `src/lib/pricing.ts`, `src/context/CartContext.tsx`
  behaviour intact; the order RPC (`create_customer_order`), quote insert, pricing estimate and file
  upload path (`<user-id>/drafts/<timestamp>-<name>`) must not change.
- Never change role names, the role → module access lists, RLS policies or migrations from the UI.
- Never show fabricated figures. Dashboards read real Supabase data and show empty states otherwise.
- Never place secrets in `VITE_*` variables or in the browser.
