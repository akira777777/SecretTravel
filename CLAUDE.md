# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static landing page for **SecretTravel**, a concierge booking service (hotels, apartments, flights, tours, car rentals) with crypto payment (USDT TRC-20/ERC-20, BTC). The site is a single Russian/English bilingual page derived verbatim from `C:\Users\fear7\Desktop\Текстовый документ (2).txt` — that file is the source-of-truth for pricing percentages (50/60/65/70%), the ₽12,000 minimum, the excluded countries list (Egypt, Maldives, India, Vietnam, Dubai), and the Russia/CIS flight restriction. **Do not invent terms, percentages, or guarantees that are not in that document.**

## Running and previewing

There is **no build step, no package.json, no dependencies**. The whole site is three files served as-is:

```bash
# Easiest: open index.html directly in a browser (file:// works fine)
# For language detection / localStorage in some browsers, prefer a local server:
python -m http.server 8080    # then visit http://localhost:8080
```

Reload the page after any edit. There is no test suite, no linter wired up, no CI.

## Architecture

Three coupled files. The coupling is by convention only — there is no module system.

### `index.html` — semantic skeleton with i18n attributes

Markup is mostly static. Every translatable text node carries one of:

- `data-i18n="key"` — replaces `textContent`.
- `data-i18n-html="key"` — replaces `innerHTML` (used when the translation contains tags like `<strong>` / `<em>` / `<a>`).
- `data-i18n-attr="attr1:key1; attr2:key2"` — sets named attributes (e.g. `placeholder:chat.placeholder`, `content:meta.description` on `<meta>` tags, `aria-label:chat.send`).

The default contents in HTML are the Russian originals — they exist as a fallback before JS runs and as the editable source when adding new sections. The `<head>` carries OG tags, Twitter card, hreflang alternates, JSON-LD `TravelAgency` schema, and a data-URI SVG OG image — all wired to i18n where applicable.

Spotlight effects are opt-in via `data-spotlight-group` on a wrapper, and `data-magnetic` on a button. These are read by `script.js`.

### `styles.css` — dark editorial aesthetic (committed POV)

The visual direction is **"The Concierge Quarterly"** — letterpress travel journal × crypto private club, rendered as a **dark theme**. This is intentional. When editing styles:

- **Palette is fixed** (dark): deep navy `--paper` (`oklch(11%)`), `--paper-deep` (8%), `--paper-card` (14%), `--paper-ink` (17%) for layered surfaces; near-white `--ink` (`oklch(92%)`); oxblood `--ox` for editorial flourishes; `--gold` reserved for the contact card and chat avatar. Do not add purple/teal/generic gradients.
- **Type stack is intentional**: Fraunces (display, italic at high opsz), Manrope (body), JetBrains Mono (eyebrow / tag / numbers / buttons). Don't introduce Inter or Space Grotesk.
- **Shadows on raised dark surfaces only** — chat FAB, chat panel, and `.contact-inner` use `oklch(0% 0 0 / α)` pure-black shadows. No shadows on flat section surfaces.
- **Old-style numerals everywhere**: `font-feature-settings: 'onum' 1` is set globally.
- **Section heads auto-number** via CSS counters (`tile-counter`, etc.); adding a tile re-numbers automatically.
- Animations use `transform`, `opacity`, and the individual CSS `translate`/`rotate` properties. Individual transform properties and `transform` are separate cascade properties — they stack, which is what allows CSS keyframe float (`translate`) and JS parallax (`transform`) to run simultaneously on the hero orbs. All motion is inside `@media (prefers-reduced-motion: no-preference)`. The `prefers-reduced-motion: reduce` block at the end kills everything with `!important`.
- `.is-in` (added by `IntersectionObserver`) gates `.reveal` transitions and eyebrow line draw-ins. Selector pattern: `.eyebrow.is-in::before` (hero, where the eyebrow itself has `.reveal`) and `.section-head.is-in .eyebrow::before` (other sections).
- The body grain (`body::before` with `mix-blend-mode: screen`) is dropped on screens ≤720px. Dark theme requires `screen` not `multiply` — do not revert this blend mode.
- `content-visibility: auto` on `section`; keep `.hero` overridden to `visible`.

### `script.js` — single IIFE, no modules

All site behavior lives inside one `(() => { ... })();`. When adding features, stay inside the closure. The IIFE wires up, in order:

1. `IntersectionObserver` for `.reveal` elements (one-shot `.is-in` toggle) + stagger index assignment (`--stagger-i` custom property set on direct `.reveal` children of `.tiles`, `.bento`, `.timeline`, `.pay-grid`).
2. rAF-throttled scroll progress bar (`--progress` CSS var) + scroll-direction nav hide (`.top--hidden` toggled on `.top` when scrolling down >8px, removed when scrolling up or `scrollY < 80`).
3. Mobile menu (bilingual `aria-label` via `menuLabels` lookup on `<html lang>`).
4. rAF-throttled pointer effects: spotlight groups and magnetic buttons — both gated on `pointer: fine` && `prefers-reduced-motion: no-preference`.
5. **Hero mouse parallax** — `pointermove` on `.hero`, moves `.hero-title` at −7px depth, `.hero .lede` at −3px, and each `.hero-orb` at +20/+30px (opposite = foreground). Uses `style.transform`; compatible with CSS `translate` animation on orbs because they are separate CSS properties.
6. Active-nav-link via a second `IntersectionObserver` on `main section[id]`.
7. **FAQ smooth accordion** — intercepts `<summary>` clicks, animates `<p>` height/opacity using explicit `offsetHeight` reflow commits before setting transitions. Gated on `!prefersReduced`.
8. **Hero stat count-up** — `IntersectionObserver` on `[data-i18n="hero.meta.1.k"]`, animates 0→100% with cubic ease-out on first intersection. i18n's `applyI18n()` will reset `textContent` to the translated value on language toggle — that's intentional.
9. **i18n** — see below.
10. **Chat manager** — see below.

#### i18n pattern (critical)

Translation lives in the `I18N = { ru: { ... }, en: { ... } }` object inside `script.js`. **There is no JSON file.** Both languages must be kept in sync — adding a key to one without the other is a bug.

`applyI18n()` walks the DOM and:

- Sets `<html lang>` and `<title>`.
- For each `[data-i18n]`: replaces `textContent`.
- For each `[data-i18n-html]`: replaces `innerHTML`.
- For each `[data-i18n-attr]`: sets each listed attribute.
- Updates the `RU/EN` lang-toggle visual state.

Language is detected from `localStorage['st-lang']`, falling back to `navigator.language` (anything starting with `ru` → Russian, else English). The toggle persists to `localStorage` and re-renders the chat in the new language. Storage access is wrapped in try/catch (`safeStorageGet` / `safeStorageSet`) for private-mode browsers.

When adding new copy: add the appropriate `data-i18n*` attribute to the markup AND keys to **both** `I18N.ru` and `I18N.en`.

#### Chat manager (rule-based, not LLM)

The chat is a deterministic intent classifier — there is no API call. The `INTENTS` array is an ordered list of `{ intent, re }` regex pairs covering both Cyrillic and Latin variants (e.g. `цен|стоим|тариф|price|cost|fee`). `detectIntent(text)` returns the first matching intent or `'fallback'`. The reply for intent `X` is `I18N[lang]['chat.r.X']`.

Adding a new chat topic requires:

1. A new entry in `INTENTS` with a both-language regex.
2. A `chat.r.<intent>` key in both `I18N.ru` and `I18N.en`.
3. Optionally, a `chat.chip.<intent>` label and a `[label, intent]` pair in `CHIP_KEYS` for the quick-reply chip.

The `link` intent matches URLs and booking aggregators (`booking.com`, `airbnb.`, `expedia`, `skyscanner`, `kayak`) and routes to a "I'll forward this to the manager on Telegram" reply. User input is always escaped via `escapeHtml` before being inserted as a message; bot replies are inserted as HTML so the dictionary can include `<a>` tags.

## Production scaffolding (besides the three coupled files)

- `robots.txt` — allows all, disallows `/404.html`, points to `sitemap.xml`.
- `sitemap.xml` — single-URL sitemap with `xhtml:link rel="alternate" hreflang` for ru/en/x-default. Update `<lastmod>` when content changes.
- `404.html` — **self-contained**, inlines its own CSS variables (mirrors `--paper`/`--ink`/`--ox` from `styles.css`) and its own RU/EN dictionary inside an inline `<script>`. Does **not** load `styles.css` or `script.js`. **Fix-once-fix-twice applies**: if you change palette or copy in the main site, mirror it here. The page reads `localStorage['st-lang']` to match the visitor's language preference set on the main site.
- `.gitignore` — covers OS junk, IDE configs, env files, `node_modules`, `bot/` runtime artefacts, and Claude Code session caches.
- `bot/` — **empty placeholder directory** for a future Telegram-side bot (matching the chat manager's "forward to manager" intent). Currently unused — do not assume code lives there.

## Placeholders that must be replaced before publishing

- Telegram handle: `https://t.me/secrettravel` in `index.html` (contact section) and in `chat.r.contact` keys in both `I18N.ru` and `I18N.en`.
- Email: `hello@secrettravel.example` in `index.html`.
- Domain: `secrettravel.example` appears in **three files** — keep them in sync when changing the production domain:
  1. `index.html` — `<link rel="canonical">`, `<link rel="alternate" hreflang>`, `og:url`, JSON-LD `url`.
  2. `sitemap.xml` — `<loc>` and all `<xhtml:link href>`.
  3. `robots.txt` — `Sitemap:` directive.
  (`404.html` uses relative URLs — no domain reference there.)
- Crypto wallet addresses are not yet rendered — when adding them, place them in the `#pay` section and remember they may need different copy per network (TRC-20 vs ERC-20).

## Things to avoid

- Do not introduce a build step, npm dependencies, or framework. The "no tooling" constraint is a feature.
- Do not split `script.js` into modules without first switching the script tag to `type="module"` and unwinding the IIFE. The current file deliberately uses one closure.
- Do not extract translations to a separate JSON — the inlined dictionary keeps the site working from `file://` with zero fetch.
- Do not soften the editorial aesthetic into generic dark-luxury or template-y card grids. The hairline-rule + Fraunces-italic + oxblood direction is the differentiator.
