# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static landing page for **SecretTravel**, a concierge booking service (hotels, apartments, flights, tours, car rentals) with crypto payment (USDT TRC-20, BTC — ERC-20 not currently accepted). The site is a single Russian/English bilingual page derived verbatim from `C:\Users\fear7\Desktop\Текстовый документ (2).txt` — that file is the source-of-truth for pricing percentages (50/60/65/70%), the ₽12,000 minimum, the excluded countries list (Egypt, Maldives, India, Vietnam, Dubai), and the Russia/CIS flight restriction. **Do not invent terms, percentages, or guarantees that are not in that document.**

**Currency convention:** Pricing is denominated in **USD** ("в нашу сторону" = our fee, not rack rate). Minimum service fee is **$270** (our take, RUB equivalent computed at the day's rate). Per-booking ceiling is **$7,000** (above is case-by-case). The booking form sets `preferred_currency` to `RUB` for `currentLang === 'ru'` and `USD` for `'en'`. If the minimum or ceiling changes, update **both** languages (`prices.c1.li3`, `prices.c2.li1`, `chat.r.prices`, `chat.r.limit`, `faq.a3`) **and** the system prompts in `api/chat.js` (RU + EN) simultaneously.

**Production:** https://secrettravel.vercel.app — deployed to Vercel from `main` (`origin/main` is `https://github.com/akira777777/SecretTravel.git`).

**Backend:** anonymous booking requests are POSTed to a Supabase `bookings` table via raw `fetch()` from `script.js`. RLS allows `INSERT only` for `anon` (SELECT/UPDATE/DELETE revoked). Supabase project ref: `jvdshxutzgxhxopcgifj` (region eu-west-1). The publishable key (`sb_publishable_…`) is **intentionally** embedded in `script.js` — it is the browser-safe key, equivalent to `pk_live_…` in Stripe; the secret key (`sb_secret_…`) must **never** appear in any browser-shipped file.

## Running and previewing

There is **no build step and no runtime dependencies**. `package.json` exists but is minimal — it only declares `engines.node: "24.x"` so Vercel pins the serverless runtime for `/api/chat` to Node 24. There is no `dependencies`, no `devDependencies`, no lockfile. The site itself is still plain HTML/CSS/JS served as-is:

```bash
# Easiest: open index.html directly in a browser (file:// works fine)
# For language detection / localStorage in some browsers, prefer a local server:
python -m http.server 8080    # then visit http://localhost:8080
```

The `/api/chat` serverless function cannot run from `file://` or `python -m http.server` — for end-to-end chat testing use `vercel dev` (or push a preview deploy). Reload the page after any edit. There is no test suite, no linter wired up, no CI.

## Architecture

Four coupled front-end files plus a Supabase schema and one Vercel serverless function (`api/chat.js`). The coupling between front-end files is by convention only — there is no module system.

### `index.html` — semantic skeleton with i18n attributes

Markup is mostly static. Every translatable text node carries one of:

- `data-i18n="key"` — replaces `textContent`.
- `data-i18n-html="key"` — replaces `innerHTML` (used when the translation contains tags like `<strong>` / `<em>` / `<a>`).
- `data-i18n-attr="attr1:key1; attr2:key2"` — sets named attributes (e.g. `placeholder:chat.placeholder`, `content:meta.description` on `<meta>` tags, `aria-label:chat.send`).

The default contents in HTML are the Russian originals — they exist as a fallback before JS runs and as the editable source when adding new sections. The `<head>` carries OG tags, Twitter card, hreflang alternates, JSON-LD `TravelAgency` and `FAQPage` schema (the FAQ block has `id="faq-jsonld"` because `applyI18n()` rebuilds it on language change), and a data-URI SVG OG image — all wired to i18n where applicable. An `Organization` JSON-LD block is **scheduled but not yet shipped** per `docs/superpowers/specs/2026-04-28-broadsheet-hero-redesign-design.md`.

Spotlight effects are opt-in via `data-spotlight-group` on a wrapper, and `data-magnetic` on a button. These are read by `script.js`.

### `styles.css` — dark editorial aesthetic (committed POV)

The visual direction is **"The Concierge Quarterly"** — letterpress travel journal × crypto private club, rendered as a **dark theme**. This is intentional. When editing styles:

- **Palette is fixed** (dark): deep navy `--paper` (`oklch(11%)`), `--paper-deep` (8%), `--paper-card` (14%), `--paper-ink` (17%) for layered surfaces; near-white `--ink` (`oklch(92%)`); oxblood `--ox` for editorial flourishes; `--gold` reserved for the contact card and chat avatar. Do not add purple/teal/generic gradients.
- **Type stack is intentional**: Fraunces (display, italic at high opsz), Manrope (body), JetBrains Mono (eyebrow / tag / numbers / buttons). Don't introduce Inter or Space Grotesk.
- **Shadows on raised dark surfaces only** — chat FAB, chat panel, and `.contact-inner` use `oklch(0% 0 0 / α)` pure-black shadows. No shadows on flat section surfaces.
- **Old-style numerals everywhere**: `font-feature-settings: 'onum' 1` is set globally.
- **Section heads auto-number** via CSS counters (`tile-counter`, etc.); adding a tile re-numbers automatically.
- Animations use `transform`, `opacity`, and the individual CSS `translate`/`rotate` properties. Individual transform properties and `transform` are separate cascade properties — they stack, which is what allows CSS keyframe float (`translate`) and JS parallax (`transform`) to run simultaneously on the hero orbs. Motion lives inside `@media all { … }` blocks (intentionally not gated on `prefers-reduced-motion: no-preference` — desktop visitors with the OS toggle enabled were getting a static page while mobile animated). The `prefers-reduced-motion: reduce` block at the end is now a soft safety net (only `scroll-behavior: auto`), not a wildcard kill.
- **Selector ordering gotcha for compound animations**: when one rule sets `animation: a, b` on `.marquee-track` and a sibling needs `animation: c, b` on `.marquee-track--rev`, the unscoped rule will override the modifier rule because of equal specificity + later-declared. Scope the base rule to `:not(.marquee-track--rev)` (or hoist the `--rev` rule below). Same shape applies to any `.x` / `.x--variant` pair in the motion section.
- **Pointer-driven motion stays on the compositor**: don't write `top`/`left` per `requestAnimationFrame` — that triggers layout each frame. Pattern in use: JS sets `--tx`/`--ty` custom properties, CSS consumes them via `translate: calc(var(--tx) - 50%) calc(var(--ty) - 50%)` (see `.hero-trail`). Same applies to any future cursor-following effects.
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

Language detection priority (first match wins): `?lang=ru|en` URL parameter → `localStorage['st-lang']` → `navigator.language` (anything starting with `ru` → Russian, else English). The `?lang=` override exists so hreflang alternates and shared links can pin a language regardless of stored preference. The toggle persists to `localStorage` and re-renders the chat in the new language. Storage access is wrapped in try/catch (`safeStorageGet` / `safeStorageSet`) for private-mode browsers.

When adding new copy: add the appropriate `data-i18n*` attribute to the markup AND keys to **both** `I18N.ru` and `I18N.en`.

#### Chat manager (rule-based first, AI fallback)

The chat runs a deterministic intent classifier first, then falls through to the AI proxy on `'fallback'`. The `INTENTS` array is an ordered list of `{ intent, re }` regex pairs covering both Cyrillic and Latin variants (e.g. `цен|стоим|тариф|price|cost|fee`); ordering matters — narrower intents (`samedy`, `limit`) come before broader ones (`prices`, `timing`). `detectIntent(text)` returns the first matching intent or `'fallback'`. For matched intents the reply is `I18N[lang]['chat.r.X']`. For `'fallback'`, `script.js` POSTs to `/api/chat` (see Serverless function below) and renders the model's reply; if the function errors, the chat falls back to the static `chat.r.fallback` string.

Adding a new chat topic requires:

1. A new entry in `INTENTS` with a both-language regex.
2. A `chat.r.<intent>` key in both `I18N.ru` and `I18N.en`.
3. Optionally, a `chat.chip.<intent>` label and a `[label, intent]` pair in `CHIP_KEYS` for the quick-reply chip.

The `link` intent matches URLs and booking aggregators (`booking.com`, `airbnb.`, `expedia`, `skyscanner`, `kayak`) and routes to a "I'll forward this to the manager on Telegram" reply. User input is always escaped via `escapeHtml` before being inserted as a message; bot replies are inserted as HTML so the dictionary can include `<a>` tags.

### `api/chat.js` — Vercel serverless AI proxy

Single-file Node 24 serverless function (`module.exports = async function handler(req, res)`). Triggered by `script.js` `callAI()` only when the rule-based classifier returns `'fallback'`. Calls Anthropic Messages API server-side so the API key never reaches the browser.

- **Model:** `claude-haiku-4-5`, `max_tokens: 400`. Do **not** swap to Opus/Sonnet — Haiku's latency and cost profile is what makes the fallback viable; the system prompt does the heavy lifting.
- **Env:** requires `ANTHROPIC_API_KEY` set in Vercel project env (Production + Preview). The function returns 503 `{error: 'Service unavailable'}` if it's missing or empty after `.trim()`.
- **System prompts:** `RU_SYSTEM` and `EN_SYSTEM` constants at the top of the file are the **Tripper-style operator voice** — terse, transactional, "проверим / касса / в нашу сторону", no greetings after first message, no emoji. They encode the same pricing/exclusion rules as the rule-based replies (50/60/65/70%, $270 minimum, $7,000 ceiling, excluded countries, RU/CIS flight restriction). **Keep these in sync with `chat.r.*` keys and visible copy** when rates change.
- **Origin allowlist (`ALLOWED_ORIGINS`):** regex array — `secrettravel.vercel.app`, `secrettravel-*.vercel.app` (preview deploys), `localhost`, `127.0.0.1`. Anything else returns 403. If you change the production domain, **add the new pattern** and (after migration) drop the old one.
- **Rate limit:** per-instance only — 12 req/min per IP, 200 req/min global, 60s window. Stored in a `Map` on the function instance. Vercel Fluid Compute reuses instances across invocations so this catches burst abuse from a warm instance, but it is **not** a global limit (cold instances reset their counters). For a true global limit we'd need Upstash Redis; treat the current limit as a cheap first line of defence.
- **Timeout:** 10s `AbortController` on the upstream call. Returns 504 `{error: 'Timeout'}` on abort.
- **Error envelope:** 405 (non-POST), 403 (origin), 429 (rate), 400 (missing message), 503 (no key), 502 (upstream non-OK or empty reply, includes `code` field with upstream HTTP status), 504 (timeout), 500 (catch-all). The `error` field is intentionally short — never leak upstream response bodies to the client.
- **Body parsing:** the function defensively re-parses `req.body` from the raw stream if Vercel hasn't already populated it (covers the case where `vercel.json` doesn't auto-parse JSON).

If you add a new env var or upstream call, also update the CSP `connect-src` in `vercel.json` to allow it from the browser side (the chat itself talks to same-origin `/api/chat`, so no CSP change needed for chat alone).

#### Booking form → Supabase

`#booking` is a server-less form that POSTs to Supabase REST. The wiring lives at the bottom of the IIFE in `script.js`:

- Constants `SUPABASE_URL` and `SUPABASE_KEY` are inlined (publishable key is browser-safe; see Project section).
- Submit handler reads `FormData`, runs the honeypot check (`name="website_url"` — bots auto-fill it), then `bookingForm.checkValidity()` + `reportValidity()`.
- Payload is built field-by-field, normalising empty strings to `null`, clamping `guests` to `[1, 50]`, and stamping `preferred_currency`/`language`/`source_page`/`user_agent`.
- POST goes to `${SUPABASE_URL}/rest/v1/bookings` with `apikey`, `Authorization: Bearer …`, `Content-Type: application/json`, and `Prefer: return=minimal` (must stay `minimal` — `representation` requires SELECT, which is revoked).
- 15-second `AbortController` timeout. `AbortError` is logged as `'timeout'`, not as raw object.
- Status messages flow through `setStatus(key, kind)` which calls `t(key)` — so `booking.status.{sending,ok,err,invalid}` keys must exist in **both** languages.

`bookings` table schema (Supabase project `jvdshxutzgxhxopcgifj`):
- `id`, `created_at`, `service_type` (enum: hotel/apartment/flight/tour/car_rental)
- `country`, `city`, `property_name`, `property_link`, `check_in`, `check_out`, `guests`
- `contact_email` (required), `contact_telegram`, `notes`
- `preferred_currency` (RUB/USD), `language` (ru/en), `source_page`, `user_agent`
- `status` (new/seen/contacted/done/rejected, default `new`)
- RLS policy `anon_insert_only`: anon can `INSERT` only, with `char_length` constraints that **mirror** the HTML `maxlength` attributes. **If you change a `maxlength` in the form, change the matching constraint** (and vice-versa) — drift will surface as RLS rejections without a clear client message.
- `revoke select, update, delete on public.bookings from anon` is part of the migration; do not grant them back without an auth model in front.

If you add a new field: (1) add `<input>` with `name=` matching the column, (2) add the column to the table via migration, (3) extend the RLS check, (4) add the field to `payload` in `script.js`, (5) add `data-i18n` keys for label in both languages.

## Production scaffolding (besides the four coupled files)

- `vercel.json` — Vercel deployment config. Read by the platform, not by site code. Three concerns live here:
  - **Security headers** on `/(.*)`: HSTS (2-year preload), CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP, X-Content-Type-Options. **CSP `connect-src` must include `https://*.supabase.co`** for the booking form. CSP keeps `script-src 'unsafe-inline'` because of the inline language-detection script in `<head>`; moving to nonce requires a server render and breaks the no-build constraint.
  - **Cache policy**: long-immutable cache is scoped to truly fingerprintable assets (`svg`, `woff2`, `png`, `ico`, …). Unfingerprinted `.css`/`.js`/`.html` are `must-revalidate` so a deploy is picked up immediately. Do not broaden the immutable rule back to `.css|.js` — it caused a real bug where browsers held a year-old `script.js` while a freshly deployed `index.html` referenced new i18n keys, surfacing as raw key strings on screen.
  - **Redirects + cleanUrls**: `cleanUrls: true`, plus `301 /home → /` and `/index → /`.
- `robots.txt` — allows all, disallows `/404.html`, points to `sitemap.xml`.
- `sitemap.xml` — single-URL sitemap with `xhtml:link rel="alternate" hreflang` for ru/en/x-default. Update `<lastmod>` when content changes.
- `404.html` — **self-contained**, inlines its own CSS variables (mirrors `--paper`/`--ink`/`--ox` from `styles.css`) and its own RU/EN dictionary inside an inline `<script>`. Does **not** load `styles.css` or `script.js`. **Fix-once-fix-twice applies**: if you change palette or copy in the main site, mirror it here. The page reads `localStorage['st-lang']` to match the visitor's language preference set on the main site.
- `.gitignore` — covers OS junk, IDE configs, env files, `node_modules`, `bot/` runtime artefacts, and Claude Code session caches.
- `bot/` — **empty placeholder directory** for a future Telegram-side bot (matching the chat manager's "forward to manager" intent). Currently unused — do not assume code lives there.
- `docs/superpowers/specs/` — design specs produced by the `superpowers:brainstorming` workflow. Source of truth for in-flight features that haven't shipped yet. The current active spec is `2026-04-28-broadsheet-hero-redesign-design.md` (15-item bundle covering Sprint-1 polish + V1 Broadsheet hero). The earlier `2026-04-28-sprint-1-polish-pass-design.md` is marked SUPERSEDED and points to the broadsheet spec — keep that header pointer when superseding future specs so reviewers don't chase stale plans.

## Placeholders that must be replaced before publishing

- Telegram handle: `https://t.me/secrettravel` in `index.html` (contact section) and in `chat.r.contact` keys in both `I18N.ru` and `I18N.en`.
- Email: `secrettravelll@gmail.com` in `index.html` contact section (real mailbox; replace if rotated).
- Domain: `secrettravel.example` appears in **three files** — keep them in sync when changing the production domain:
  1. `index.html` — `<link rel="canonical">`, `<link rel="alternate" hreflang>`, `og:url`, JSON-LD `url`.
  2. `sitemap.xml` — `<loc>` and all `<xhtml:link href>`.
  3. `robots.txt` — `Sitemap:` directive.
  (`404.html` uses relative URLs — no domain reference there.)
- Crypto wallet addresses are live in `index.html` `#pay` section: USDT TRC-20 (`TVz2…`) and BTC (`3FBX…`). The `[data-copy]` click handler copies them on click. Only TRC-20 is accepted for USDT — do not re-introduce ERC-20 copy without a corresponding ERC-20 address (the networks are not interchangeable; sending USDT-ERC-20 to a TRC-20 address is unrecoverable).
- Supabase project (`jvdshxutzgxhxopcgifj`) and `bookings` table are **already provisioned** with RLS — the booking form is live and persists submissions. Use Supabase Dashboard → Table Editor → `bookings` to view incoming requests, or query via Supabase MCP.

## Things to avoid

- Do not introduce a build step, npm dependencies, or framework. The "no tooling" constraint is a feature. The Supabase REST API is consumed via raw `fetch()` for this reason — do **not** install `@supabase/supabase-js` or `@supabase/ssr` (the Supabase dashboard's onboarding snippet is for Next.js and is not applicable here).
- Do not split `script.js` into modules without first switching the script tag to `type="module"` and unwinding the IIFE. The current file deliberately uses one closure.
- Do not extract translations to a separate JSON — the inlined dictionary keeps the site working from `file://` with zero fetch.
- Do not soften the editorial aesthetic into generic dark-luxury or template-y card grids. The hairline-rule + Fraunces-italic + oxblood direction is the differentiator.
- Do not put `sb_secret_…` (the Supabase secret/service-role key) into `script.js`, HTML, CSS, env files, or any committed artefact — it bypasses RLS. Only the `sb_publishable_…` key belongs in browser-shipped code. If the secret key leaks, rotate immediately in Supabase Dashboard → Settings → API.
- Do not add `SELECT`, `UPDATE`, or `DELETE` privileges to the `anon` role on `public.bookings`. Reading and managing entries is for service-role / admin via the Supabase Dashboard or MCP.
- Do not apply long-immutable `Cache-Control` to `.css`/`.js`/`.html` — these files are unfingerprinted, and immutable cache strands users on stale versions. Use `must-revalidate` for them and reserve immutable for content-stable binaries (fonts/images).
- When changing the Supabase URL or anon key in `script.js`, also update `vercel.json` CSP `connect-src` to match the new origin (or revoke the old one).
- Do not commit `.audit-*.jpeg` / `.audit-*.png` — these are full-page screenshots produced by `chrome-devtools-mcp` for design audits and are already gitignored. They live in the repo root as throwaway artefacts.
- Do not change the `/api/chat` model from `claude-haiku-4-5` to a heavier tier (Opus/Sonnet) without a real reason — Haiku's latency and cost profile is what makes the AI fallback viable. The system prompt carries the operator voice; upgrading the model would not improve adherence and would make the fallback noticeably slower.
- Do not edit the `ALLOWED_ORIGINS` array in `api/chat.js` to add a wildcard or a non-Vercel domain without a matching CSP/CORS update on the consuming origin — the regex must match production *and* `secrettravel-*.vercel.app` preview URLs together, and adding `*` would defeat the API-key abuse protection.
- When adding new copy or i18n keys, run a parity audit before shipping. The recipe (kept in session memory, not committed):
  1. Find `i18nIdx = js.indexOf('I18N = {')` and bracket-balance to extract `ru: {…}` and `en: {…}` blocks.
  2. Collect `[data-i18n*]` keys from HTML and `t('…')` / `setStatus('…')` / `showToast('…')` literals from JS.
  3. Diff against both language dicts. The healthy state is: 0 missing in either language, 0 parity gaps, 0 unused.
