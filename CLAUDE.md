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

### `styles.css` — editorial paper aesthetic (committed POV)

The visual direction is **"The Concierge Quarterly"** — letterpress travel journal × crypto private club. This is intentional, not a placeholder. When editing styles:

- **Palette is fixed**: cream paper (`--paper`), ink near-black (`--ink`), oxblood accent (`--ox`) used for editorial flourishes, gold (`--gold`) reserved **only** for the dark contact card and chat avatar. Do not add purple/teal/generic gradients.
- **Type stack is intentional**: Fraunces (display, italic at high opsz), Manrope (body), JetBrains Mono (eyebrow / tag / numbers / buttons). Don't introduce Inter or Space Grotesk.
- **No box shadows on light surfaces.** Depth comes from `1px solid var(--rule)` hairlines and ink borders. The dark `.contact-inner` and chat panel are the only places shadows appear.
- **Old-style numerals everywhere**: `font-feature-settings: 'onum' 1` is set globally. Numerals in the bento price tiles, hero stats, and step numbers must render as oldstyle figures.
- **Section heads auto-number** via CSS counters (`tile-counter`, etc.); adding a tile re-numbers automatically.
- Animations are constrained to `transform` and `opacity` only. Reveal is gated by an `.is-in` class added by JS via `IntersectionObserver`. The `prefers-reduced-motion: reduce` block disables everything.
- `content-visibility: auto` is set on `section` for paint perf — keep `.hero` overridden to `visible` so above-the-fold renders eagerly.
- The body grain (`body::before` with `mix-blend-mode: multiply`) is dropped on screens ≤720px for scroll performance — keep that media query when refactoring.

### `script.js` — single IIFE, no modules

All site behavior lives inside one `(() => { ... })();`. When adding features, stay inside the closure. The IIFE wires up, in order:

1. `IntersectionObserver` for `.reveal` elements (one-shot `.is-in` toggle).
2. `requestAnimationFrame`-throttled scroll progress bar via `--progress` CSS variable.
3. Mobile menu (with bilingual `aria-label` via `menuLabels` lookup based on `<html lang>`).
4. rAF-throttled pointer effects: spotlight groups and magnetic buttons. Both are gated on `pointer: fine` and `prefers-reduced-motion: no-preference`.
5. Active-nav-link via a second `IntersectionObserver` on `main section[id]`.
6. **i18n** — see below.
7. **Chat manager** — see below.

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
