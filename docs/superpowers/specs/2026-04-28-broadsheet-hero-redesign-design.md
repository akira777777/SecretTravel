# Broadsheet Hero Redesign + Polish Pass · Design

**Status:** Approved 2026-04-28
**Scope:** 15 items in one bundled commit — supersedes the prior polish-pass spec by adding the V1 Broadsheet hero from the Claude Design bundle (`secrettravel-remix-remix`).
**Supersedes:** `2026-04-28-sprint-1-polish-pass-design.md`

---

## Goal

The Claude Design handoff (`secrettravel-remix-remix`) shipped three hero direction prototypes built on the existing Concierge Quarterly DNA. We're implementing **V1 — N°. 01 Broadsheet** — the natural evolution of the current site (refined typography, real masthead, issue numbering, hairline-bordered meta, circular issue stamp, restyled marquee). At the same time we ship the eight polish-pass items already approved (`.reveal` fix, FAQ +/− toggle, date validation, lang URL, marquee pause, focus rings, OG image as static file, Organization JSON-LD).

V2 (Stamp metaphor) and V3 (Departures Board) are **not** implemented as full hero treatments. V2's circular stamp is repurposed as the **OG image** (replaces the text-only tagline plan from the prior spec) — the rotating customs-stamp visual works far better as a social preview than abstract typography on a flat background.

---

## Items 1-8 · Polish Pass (unchanged from prior spec)

These ship as-is. Full rationale and code snippets in the prior spec; recapped here for completeness.

| # | Item | Approach |
|---|---|---|
| 1 | `.reveal` fix | Inverted cascade. Inline `<head>` script adds `documentElement.classList.add('js')`. CSS: `.reveal { opacity: 1 }` default; `html.js .reveal { opacity: 0; transform: translateY(14px); ... }` and `html.js .reveal.is-in { opacity: 1; transform: none }`. Same shape applied to `.hero-title .word`. |
| 2 | FAQ `+/−` toggle | `script.js` adds `toggle` event listener per `<details>` that swaps `.faq-icon` `textContent` between `+` and `−`. ~5 lines. |
| 3 | Date-range validation | `script.js` booking-form block adds `change` listeners on check_in / check_out that mutually update `min` / `max`. ~6 lines. |
| 4 | Lang-toggle URL update | `history.replaceState({}, '', location.pathname + '?lang=' + currentLang)` appended to existing lang-toggle click handler. 1 line. |
| 5 | Marquee pause | CSS: `.marquee:hover .marquee-track, .marquee:focus-within .marquee-track { animation-play-state: paused; }` + `@media (prefers-reduced-motion: reduce) { .marquee-track { animation-play-state: paused; } }`. |
| 6 | Focus-visible | `:where(input, select, textarea, button, a):focus-visible { outline: 2px solid var(--ox); outline-offset: 2px; border-radius: 2px; }`. Specificity-zero so it doesn't override existing button/lang-toggle focus styles. |
| 7 | OG image as static file | **Replaced — see Item 15** (Stamp-as-OG instead of text-tagline). |
| 8 | Organization JSON-LD | New `<script type="application/ld+json">` block in `<head>` with `@type: Organization`, `name`, `url`, `description`, `sameAs: ["https://t.me/secrettravel"]`, `paymentAccepted`, `areaServed`. No `founder`/`foundingDate`/`address` until verified values exist. |

---

## Item 9 · Masthead row (NEW)

**Goal.** A real broadsheet masthead above the hero — establishes the Concierge Quarterly identity and dates the issue.

**Markup.** Insert directly above `.hero` (after the `.top` header, before `<main>`):

```html
<div class="masthead" aria-hidden="true">
  <span class="masthead-left">
    <span data-i18n="masthead.title">The Concierge Quarterly · Вып. 01 · Весна</span>
    <em>✦</em>
    <span data-i18n="masthead.section">Том VI · Бронирование, Авиа, Экскурсии · Крипто-расчёт</span>
  </span>
  <span class="masthead-right" id="masthead-date"></span>
</div>
```

`#masthead-date` populated by JS at boot using `new Date().toUTCString()`-derived format (e.g. `Apr. 28 · 2026 / Sat / 22:18 UTC`):

```js
const d = new Date();
const pad = (n) => String(n).padStart(2, '0');
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const fmt = `${months[d.getUTCMonth()]}. ${d.getUTCDate()} · ${d.getUTCFullYear()} / ${days[d.getUTCDay()]} / ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
document.getElementById('masthead-date').textContent = fmt;
```

i18n keys (both languages):
- `masthead.title` — RU: `«The Concierge Quarterly · Вып. 01 · Весна»`, EN: `«The Concierge Quarterly · Iss. 01 · Spring»`
- `masthead.section` — RU: `«Том VI · Бронирование, Авиа, Экскурсии · Крипто-расчёт»`, EN: `«Vol. VI · Booking, Flights, Tours · Crypto-settled»`

**Styling.**
- Padding: `14px 36px` (mobile: `10px 18px`)
- Bottom border: `1px solid var(--ink)` — strong rule, signals "this is a published edition"
- Font: JetBrains Mono 10-11px, uppercase, letter-spacing 0.22em, color `var(--ink-3)`
- The `✦` separator + `em` text uses Fraunces italic, color `var(--ox)`, normal-case, 13px
- `aria-hidden="true"` because it's editorial dressing, not navigation. Screen readers skip it.

## Item 10 · Hero 2-column layout (NEW)

**Goal.** Replace the current single-column hero with the V1 Broadsheet's `1.2fr 0.6fr` grid: giant H1 left, editorial aside right.

**Markup transformation.**

```html
<!-- Before -->
<section class="hero">
  <p class="eyebrow reveal">...</p>
  <h1 class="reveal hero-title">...</h1>
  <p class="lede reveal">...</p>
  <div class="hero-cta reveal">...</div>
  <ul class="hero-meta reveal">...</ul>
  <div class="hero-orb"></div>
  <div class="hero-orb hero-orb--alt"></div>
</section>

<!-- After -->
<section class="hero">
  <div class="hero-main">
    <p class="eyebrow reveal">...</p>
    <h1 class="reveal hero-title">...</h1>
  </div>
  <aside class="hero-aside reveal">
    <span class="hero-issue">N°. 01</span>
    <p class="hero-lede">...</p>
    <div class="hero-cta">...</div>
  </aside>
  <ul class="hero-meta reveal">...</ul>
  <div class="hero-orb" aria-hidden="true"></div>
  <div class="hero-orb hero-orb--alt" aria-hidden="true"></div>
</section>
```

**Styling.**
- Hero grid: `display: grid; grid-template-columns: 1.2fr 0.6fr; gap: 48px; padding: 56px 36px 44px;`
- Bottom border: `1px solid var(--ink)` (strong — editorial)
- `.hero-main` H1 — Fraunces, font-weight 300, font-size `clamp(56px, 8vw, 120px)`, line-height 0.92, letter-spacing -0.05em, `font-variation-settings: "opsz" 144`, max-width 11ch
- `.hero-aside` — left-aligned, padded-left 32px, `border-left: 1px solid var(--rule)`
- `.hero-issue` — Fraunces italic, font-weight 300, font-size `clamp(40px, 5vw, 64px)`, color `var(--ox)`, line-height 0.9, letter-spacing -0.03em
- `.hero-lede` — Fraunces italic, weight 300, color `var(--ink-2)` (new var, see "Vars" section), font-size 18px, line-height 1.45, max-width 36ch
- Mobile (≤900px): grid collapses to single column. Aside flows below main. Border-left becomes border-top.

**Reveal compatibility.** `.hero-main`, `.hero-aside`, `.hero-meta` keep `.reveal` class. The IO observer continues working unchanged (per Item 1, only the default-state CSS changes — the selectors and `.is-in` class still apply).

## Item 11 · Hero-meta 4-column with hairlines (NEW)

**Goal.** Replace the current flat `<ul>` with the V1 broadsheet 4-column grid with vertical hairline rules and editorial typography.

**Markup.**

```html
<ul class="hero-meta reveal" aria-label="Key facts">
  <li><span class="k" data-i18n="hero.meta.1.k">100%</span><span class="v" data-i18n="hero.meta.1.v">предоплата</span></li>
  <li><span class="k" data-i18n="hero.meta.2.k">USDT · BTC</span><span class="v" data-i18n="hero.meta.2.v">расчёт</span></li>
  <li><span class="k" data-i18n="hero.meta.3.k">Booking · Expedia</span><span class="v" data-i18n="hero.meta.3.v">прямое подтверждение</span></li>
  <li><span class="k" data-i18n="hero.meta.4.k">Возврат</span><span class="v" data-i18n="hero.meta.4.v">если не вышло</span></li>
</ul>
```

(Markup minimally changes — adds `class="k"` and `class="v"` spans on existing list items.)

**Styling.**
- `.hero-meta { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--ink); border-bottom: 1px solid var(--ink); padding: 24px 36px; margin: 0; }`
- `.hero-meta li { list-style: none; padding-right: 24px; border-right: 1px solid var(--rule); display: flex; flex-direction: column; gap: 6px; }`
- Last child: `border-right: 0`
- `.k` — Fraunces italic, weight 300, font-size 30px, color `var(--ink)`, letter-spacing -0.01em, line-height 1
- `.v` — JetBrains Mono uppercase, letter-spacing 0.1em, font-size 10px, color `var(--ink-3)`
- Mobile (≤720px): collapses to single column, each `<li>` becomes a row with `k` and `v` aligned `space-between`, hairlines become horizontal.

## Item 12 · Circular issue stamp (NEW)

**Goal.** Top-right of the hero — slowly rotating circular stamp, oxblood outline, Concierge Quarterly text. Editorial flourish, not functional.

**Markup.** Inside `.hero` after `.hero-meta`:

```html
<div class="hero-stamp" aria-hidden="true">
  <span data-i18n="hero.stamp">Concierge · Worldwide · Crypto-Settled</span>
</div>
```

**Styling.**
- Position absolute, `right: 36px`, `top: -30px` (overlaps masthead bottom border slightly — characteristic broadsheet flourish)
- 140×140, `border: 1px solid var(--ox)`, `border-radius: 50%`
- Inner double border: `::before` with `inset: 8px; border: 1px solid var(--ox); opacity: 0.4`
- Text inside: `display: grid; place-items: center; padding: 0 12px; max-width: 90px; text-align: center;`
- Font: JetBrains Mono uppercase, font-size 9px, letter-spacing 0.18em, color `var(--ox)`, line-height 1.5, opacity 0.7
- Animation: `slow-spin 60s linear infinite` (defined alongside other motion in `styles.css` motion section)
- Mobile (≤720px): hide entirely. Hero is too dense to fit it.
- `prefers-reduced-motion: reduce`: stamp stays visible but stops rotating.

`@keyframes slow-spin { to { transform: rotate(360deg); } }`

i18n key: `hero.stamp` — Latin string for both languages (Concierge · Worldwide · Crypto-Settled).

## Item 13 · Marquee restyle (NEW)

**Goal.** The current marquee uses JetBrains Mono spaced text. The V1 design uses **Fraunces italic 30px** — same scrolling cities, but rendered as editorial type.

**CSS changes** to existing `.marquee-track`:
- `font-family: var(--serif)`
- `font-style: italic`
- `font-weight: 300`
- `font-size: 30px`
- `gap: 24px` between cities and dots
- Dots get `color: var(--ox)`

The dot separator handling — current markup has `<span aria-hidden="true">·</span>`. V1 wraps each in `<span class="dot">·</span>` for color targeting. Add the `dot` class to existing dot spans in `index.html`.

Mask edges already in current CSS (`-webkit-mask-image`); keep as-is.

Marquee pause behaviors from Item 5 still apply.

## Item 14 · Mobile broadsheet (NEW)

**Goal.** Mobile layout follows V1's M1 artboard — compact masthead, single-column hero, vertical k/v meta rows.

**Layout.**
- Top bar (`.top`) — unchanged from current (already mobile-aware)
- Masthead row (Item 9) — collapses: shorter title, only `N°. 01` chip on right, no date/UTC
- Hero — single column, padding 32px 18px:
  - Eyebrow
  - H1 (54px Fraunces 300, line-height 0.95)
  - Aside content flows inline below H1 (issue chip stays as `N°. 01` between eyebrow and H1, smaller — 18px Fraunces italic, color oxblood, top of `.hero-aside`)
  - Lede
  - CTAs stacked (full-width)
  - Meta — vertical k/v rows separated by hairlines (`.hero-meta` becomes `flex-direction: column`, each `<li>` is `flex-direction: row; justify-content: space-between` with hairline below)
- Stamp (Item 12) — hidden on ≤720px

Single media query block, ~30 CSS lines.

## Item 15 · OG image — Stamp variant (REPLACES prior Item 7)

**Goal.** Replace the data-URI OG with a static `og.svg` rendering of V2's circular customs stamp on dark navy. Strong visual identity in social previews.

**Composition (1200×630 SVG, root file).**
- Background: solid `oklch(11% 0.018 270)` — same `--paper` as site
- Centered circular stamp, 480×480:
  - Outer ring: 2px solid oxblood `oklch(58% 0.19 25)`, radius 240
  - Inner ring: 1px solid oxblood, radius 226, opacity 0.4
  - Outermost dashed ring: 1px dashed oxblood, radius 258, opacity 0.25
  - Curved top textPath: `SECRETTRAVEL · CONCIERGE BOOKING SOCIETY` in JetBrains Mono uppercase, oxblood, letter-spacing 0.32em, font-size ~16px
  - Curved bottom textPath: `EST. 2019 · WORLDWIDE · CRYPTO-SETTLED · APPROVED` in JetBrains Mono, same style
  - Center stack:
    - `✦` (Fraunces italic, 56px, oxblood)
    - `S T` with italic T (Fraunces italic, 140px, oxblood, letter-spacing -0.03em)
    - Hairline divider 80×1, oxblood
    - `APPROVED` (JetBrains Mono, 14px, near-white, letter-spacing 0.28em)
- Bottom hairline + caption: `BOOKING · FLIGHTS · TOURS · USDT · BTC` in JetBrains Mono ~24px, near-white at 60% opacity, centered

**HTML head update.**

```html
<meta property="og:image" content="https://secrettravel.vercel.app/og.svg" />
<meta property="og:image:type" content="image/svg+xml" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="SecretTravel · The Concierge Quarterly · Issue 01" />
```

Same SVG-vs-PNG note as before: most modern OG scrapers handle SVG; if Telegram preview breaks post-deploy, follow up with a PNG rasterization in a separate small PR.

---

## CSS variables to add

A few values referenced above don't currently exist in `styles.css`:
- `--ink-2`: `oklch(76% 0.010 80)` — secondary ink (lede, meta `.v`)
- `--ink-3`: `oklch(56% 0.008 80)` — tertiary ink (masthead chrome)
- `--rule`: `oklch(92% 0.010 80 / 0.10)` — hairline rules
- `--rule-strong`: `oklch(92% 0.010 80 / 0.30)` — accent rules

`--paper`, `--paper-deep`, `--paper-card`, `--paper-ink`, `--ink`, `--ox`, `--gold`, `--serif`, `--sans`, `--mono` already exist. `--ox-warm` is **not added** — only used in V2/V3 which we're not implementing.

---

## Files touched

| File | Change |
|---|---|
| `index.html` | `<head>`: extend inline script with `documentElement.classList.add('js')`; replace `og:image` content + add `og:image:alt`/`width`/`height`; add Organization JSON-LD. `<body>`: insert masthead row above hero; restructure hero into `.hero-main` + `.hero-aside` + `.hero-stamp` + restyled `.hero-meta`. Marquee `<span aria-hidden>·</span>` gets `class="dot"` for color targeting. |
| `styles.css` | Add `--ink-2`, `--ink-3`, `--rule`, `--rule-strong` to `:root`. Invert `.reveal` and `.hero-title .word` cascades (Item 1). Append: `.masthead` styles, hero grid + aside + issue + lede styles, `.hero-meta` 4-col grid, `.hero-stamp` rotating circle, marquee Fraunces restyle, `.dot` color. Append marquee pause + reduced-motion (Item 5). Append `:where(...) :focus-visible` (Item 6). Mobile breakpoint additions for all of the above (Item 14). |
| `script.js` | Set `#masthead-date` text on boot. FAQ `toggle` listener for `+/−`. Booking-form `change` listeners for date min/max. Lang-toggle handler `history.replaceState`. Add i18n keys: `masthead.title`, `masthead.section`, `hero.stamp` to both `I18N.ru` and `I18N.en`. |
| `og.svg` | New file, 1200×630, stamp composition per Item 15. |

---

## Out of scope

- V2 full hero (visa-stamp as page centerpiece) — only stamp aesthetic borrowed for `og.svg`
- V3 full hero (Departures Board) — saved for possible future experiment
- Wallet / email / Telegram-handle replacements — pending real values
- Booking-form editorial restyle (still Sprint 2)
- Worked-example block, About / social proof — Sprint 2/3
- `/api/chat.js` SDK migration — separate spec

---

## Verification checklist

| # | Test | Pass criteria |
|---|---|---|
| 1 | Open `index.html` via `file://` | All sections visible, no black space below hero |
| 2 | Prod URL with JS disabled | Same as #1 minus animations |
| 3 | chrome-devtools-mcp full-page screenshot, 1440×900 + 390×844 | Every section rendered visibly, masthead present, hero is 2-col on desktop and 1-col on mobile |
| 4 | Click each FAQ summary | `+` → `−` → `+` |
| 5 | Booking form: pick check_in | check_out's earliest date updates; submitting check_out before check_in surfaces validation |
| 6 | Click lang toggle RU↔EN | URL contains `?lang=ru`/`?lang=en`; back button doesn't replay; masthead text and `hero.stamp` text and `hero.lede` text all swap correctly |
| 7 | Hover marquee | Pauses; remove cursor → resumes; `prefers-reduced-motion: reduce` keeps it paused |
| 8 | Tab through booking form | Visible oxblood `outline` on each field |
| 9 | OpenGraph debugger (opengraph.xyz) on prod URL | `og:image` resolves to `og.svg`, preview renders the stamp |
| 10 | Google Rich Results test on prod URL | Detects `Organization`, `TravelAgency`, `FAQPage` — no errors |
| 11 | Visual: masthead row above hero | Renders with all three text segments + date right-aligned, hairline rule below |
| 12 | Visual: hero | 2-col layout desktop, big H1 left, `N°. 01` + lede + CTAs in right aside, hairline border between |
| 13 | Visual: hero-meta | 4 columns desktop with vertical hairlines between, `.k` in serif italic 30px, `.v` in mono uppercase 10px |
| 14 | Visual: stamp top-right of hero | Slowly rotating, oxblood outline, ~140×140, hidden on ≤720px |
| 15 | Visual: marquee | Fraunces italic 30px, oxblood dots between cities, scrolling smoothly |
| 16 | Visual: mobile (≤720px) | Hero becomes single-column, meta becomes vertical k/v rows, stamp hidden, masthead has compact form |

---

## Rollout

Single PR. Squash-merge to `main`. Vercel auto-deploys. Post-deploy run checklist 1-16 against `https://secrettravel.vercel.app`. If Telegram-specific OG preview is broken, follow-up PR with rasterized `og.png`.
