# Sprint 1 — Polish Pass · Design

**Status:** SUPERSEDED 2026-04-28 — see `2026-04-28-broadsheet-hero-redesign-design.md`. The 8 items below are subsumed (1-6 unchanged, 7-8 expanded into a 15-item bundle that adds the V1 Broadsheet hero redesign and a stamp-as-OG image).
**Scope:** 8 items shipped as one bundled commit
**Out of scope:** content/data placeholders (wallets, email, Telegram handle), Sprint 2/3 items

---

## Goal

Close three classes of problem in a single coordinated change:

1. **One critical rendering bug** — `.reveal { opacity: 0 }` waits for `IntersectionObserver` to mount `.is-in`, which means crawlers without JS, screenshot tools that don't trigger viewport intersection, and JS-disabled visitors all see a blank page below the hero. Confirmed via full-page Chrome DevTools screenshot at desktop and mobile viewports — every section below `.hero` rendered as black space.
2. **Five small UX/accessibility gaps** — FAQ icon stays `+` even when the section is open; date inputs accept check-out before check-in; language toggle never reflects in the URL (so the `hreflang` alternates the head advertises don't actually serve different content); marquee continues animating on hover or when keyboard focus enters it (WCAG 2.2 fail); form fields rely on browser-default focus rings that read poorly on the dark background.
3. **Two SEO scaffolding gaps** — OG image is a `data:` URI (Telegram, historically Slack, and several OG scrapers reject these); JSON-LD covers `TravelAgency` and `FAQPage` but not `Organization`, so the site is not eligible for Knowledge Graph entries.

All eight items are independent. They are bundled into one design and one PR because they share a single review pass and because the `.reveal` fix touches CSS that several other items also touch.

---

## Item 1 · `.reveal` fix — inverted cascade

**Problem.** `.reveal { opacity: 0; transform: translateY(14px) }` is the default. JS adds `.is-in` via `IntersectionObserver` once the element enters the viewport. This breaks for any consumer that doesn't run JS, doesn't trigger IO (e.g., headless full-page screenshots that scroll-via-stitching rather than scroll-via-viewport), or runs JS slowly enough that crawlers give up before the observer fires.

**Fix.** Invert the cascade. Default is visible; the hide-then-reveal animation only applies when JS has explicitly opted in.

1. Extend the existing inline `<head>` script (which already sets `documentElement.lang`) to also add a `js` class:
   ```js
   document.documentElement.classList.add('js');
   ```
2. CSS — change two existing rules:
   ```css
   /* Before */
   .reveal { opacity: 0; transform: translateY(14px); transition: ...; }
   .reveal.is-in { opacity: 1; transform: none; }

   /* After */
   .reveal { opacity: 1; transform: none; }
   html.js .reveal { opacity: 0; transform: translateY(14px); transition: ...; }
   html.js .reveal.is-in { opacity: 1; transform: none; }
   ```
3. Apply the same shape to `.hero-title .word` (currently `opacity: 0; transform: translateY(0.5em) rotateX(-15deg)` by default → move under `html.js`).
4. The existing `.eyebrow.is-in::before` and `.section-head.is-in .eyebrow::before` selectors already gate on `.is-in` — leave them; they only run when JS is present and adds the class. No FOUC risk because the inline script runs before any rendering.

**Verification.** Take a full-page screenshot via chrome-devtools-mcp at 1440×900 and 390×844 after deploy. Every section (`#how`, `#prices`, `#scope`, `#order`, `#booking`, `#pay`, `#faq`, `#contact`) must be fully rendered. Sanity check with JS disabled in browser DevTools: the page should look the same as with JS enabled, minus the entrance animations.

## Item 2 · FAQ `+/−` toggle

**Problem.** Each `<details class="faq-item">` has `<span class="faq-icon">+</span>` with literal text content. CSS cannot replace inner text via `[open]`; pseudo-element `content` would require migrating six markup occurrences. JS path is shorter.

**Fix.** In `script.js`'s existing FAQ block (where the smooth-accordion height animation lives), add one `toggle` event listener per `<details>` that swaps the `.faq-icon` text:

```js
faqItems.forEach((item) => {
  item.addEventListener('toggle', () => {
    const icon = item.querySelector('.faq-icon');
    if (icon) icon.textContent = item.open ? '−' : '+';
  });
});
```

Five lines including the loop. Native `<details>` `toggle` event fires on both open and close — no separate handlers needed.

## Item 3 · Date-range validation

**Problem.** `<input type="date" name="check_in">` and `name="check_out"` accept any value independently. A user can submit a request where check-out predates check-in.

**Fix.** In `script.js`'s booking-form block, add two `change` listeners that update each input's `min`/`max` from the other's value. Six lines:

```js
const checkIn  = bookingForm.querySelector('[name="check_in"]');
const checkOut = bookingForm.querySelector('[name="check_out"]');
if (checkIn && checkOut) {
  checkIn.addEventListener('change',  () => { checkOut.min = checkIn.value; });
  checkOut.addEventListener('change', () => { checkIn.max  = checkOut.value; });
}
```

Browsers enforce `min`/`max` on submit; the existing `reportValidity()` call in submit-handler will surface the error message in the user's locale.

## Item 4 · Lang-toggle updates URL

**Problem.** `<head>` advertises `<link rel="alternate" hreflang="ru" href=".../?lang=ru">` and the same for `en`, but clicking the lang-toggle button only flips `localStorage` — the URL never changes. A user copying the URL with intent to share their language preference shares nothing.

**Fix.** In the existing lang-toggle `click` handler in `script.js` (which already calls `applyI18n()` and `renderChat()`), append:

```js
history.replaceState({}, '', location.pathname + '?lang=' + currentLang);
```

`replaceState` (not `pushState`) — back-button shouldn't replay every language flip. One line.

## Item 5 · Marquee pause

**Problem.** The cities marquee animates indefinitely. WCAG 2.2 SC 2.2.2 requires moving content lasting more than 5 seconds to be pauseable. Hover and keyboard-focus pause are also UX-standard.

**Fix.** Append to `styles.css` motion section:

```css
.marquee:hover .marquee-track,
.marquee:focus-within .marquee-track { animation-play-state: paused; }

@media (prefers-reduced-motion: reduce) {
  .marquee-track { animation-play-state: paused; }
}
```

Targets both directions of the marquee (`.marquee-track` covers the base and `.marquee-track--rev` inherits since both are children of `.marquee`).

## Item 6 · Focus-visible on form fields

**Problem.** `<input>`, `<select>`, `<textarea>` rely on browser-default focus rings. On `oklch(11%)` background, the default Chromium blue ring reads weakly. Keyboard-only users have a degraded experience.

**Fix.** Append to `styles.css`:

```css
:where(input, select, textarea, button, a):focus-visible {
  outline: 2px solid var(--ox);
  outline-offset: 2px;
  border-radius: 2px;
}
```

`:where` keeps specificity at zero — won't override existing `.btn:focus-visible` or `.lang-toggle:focus-visible` rules. `var(--ox)` is the editorial oxblood already used as primary accent. `outline-offset` separates the ring from the input border for clarity.

## Item 7 · OG image — `og.svg` (dark + tagline)

**Problem.** Current `og:image` is a `data:image/svg+xml` URL. Several scrapers (Telegram historically, some Slack rules) reject `data:` URIs and fall back to no preview. The image content is also inconsistent with the dark site theme: cream paper background, when the actual page is dark navy.

**Fix.** Create `og.svg` (1200×630) at the project root. Composition:

- Background: solid `oklch(11% 0 0)` (matches `--paper`).
- Top-left eyebrow: JetBrains Mono uppercase, `oklch(45% 0.13 27)` (oxblood `--ox`), text `№ 01 · THE TRAVEL DESK`.
- Center-left, three lines, Fraunces italic ~120px, near-white `oklch(92% 0 0)`:
  - *Direct bookings.*
  - *Paid in crypto.*
  - *Discreet by design.*
- Bottom hairline + mono caption: `BOOKING · FLIGHTS · TOURS · USDT · BTC` in JetBrains Mono ~24px, near-white at 60% opacity.

Update `index.html` `<head>`:
- Replace `og:image` content with `https://secrettravel.vercel.app/og.svg`.
- Replace `twitter:card` already covers it; add `twitter:image` mirror if not present (it inherits from `og:image` in most parsers, but explicit is safer).

**Risk note.** SVG as `og:image` is supported by Twitter/X, LinkedIn, Slack, and most OG scrapers. Telegram historically prefers PNG. If post-deploy testing shows Telegram preview is broken, follow up by rasterizing `og.svg` to `og.png` (1200×630) — this can be done with any headless-Chromium tool and does not block Sprint 1.

## Item 8 · Organization JSON-LD

**Problem.** `<head>` includes `TravelAgency` and `FAQPage` JSON-LD blocks but no `Organization`. Google's Knowledge Graph and several search-result rich features key on `Organization`.

**Fix.** Add a third `<script type="application/ld+json">` block to `<head>`:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "SecretTravel",
  "url": "https://secrettravel.vercel.app",
  "description": "Concierge booking of hotels, apartments, flights, tours and car rentals. Crypto payments accepted.",
  "sameAs": ["https://t.me/secrettravel"],
  "paymentAccepted": "USDT (TRC-20, ERC-20), Bitcoin",
  "areaServed": "Worldwide except select resort regions"
}
```

Deliberately omit `founder`, `foundingDate`, `address`, `logo` — no verified values; placeholder schema data is worse than absent fields (search engines flag fake schema and suppress rich results).

When real values become available (real Telegram handle from CLAUDE.md placeholder list, real founding info), update the `sameAs` array and add the missing fields in a follow-up.

---

## Files touched

| File | Change |
|---|---|
| `index.html` | `<head>`: extend inline script with `documentElement.classList.add('js')`; replace `og:image` `data:` URI with `/og.svg` reference; add `Organization` JSON-LD block. |
| `styles.css` | Invert `.reveal` cascade (default visible, `html.js` hides); same for `.hero-title .word`; append marquee pause rules (hover, focus-within, reduced-motion); append `:where(...) :focus-visible` rule. |
| `script.js` | FAQ block: add `toggle` listener for `+/−` swap. Booking-form block: add `change` listeners for date min/max coupling. Lang-toggle handler: append `history.replaceState`. |
| `og.svg` | New file. 1200×630 SVG, dark theme + three-line tagline. |

---

## Out of scope

- **Wallet placeholders** (`TYourUSDTtrc20AddressHereXyz`, `1YourBitcoinAddressHereAbc`) — pending real addresses.
- **Email** (`hello@secrettravel.vercel.app` doesn't deliver) — pending real mailbox or removal.
- **Telegram handle** (`@secrettravel`) — pending verification.
- **Hero-meta visual hierarchy** — Sprint 2.
- **Worked-example block ("how we calculate, on a real booking")** — Sprint 2.
- **About / social proof / Issue 01 section** — Sprint 3.
- **Booking-form editorial restyle** — Sprint 2.
- **`/api/chat.js` SDK migration** — separate brainstorm/spec.

---

## Verification checklist

| # | Test | Pass criteria |
|---|---|---|
| 1 | Open `index.html` directly via `file://` in browser | All sections visible immediately, no black space below hero |
| 2 | Open prod URL with JS disabled (DevTools Settings → Disable JavaScript → reload) | Same as #1, minus entrance animations |
| 3 | `chrome-devtools-mcp navigate + take_screenshot fullPage` at 1440×900 and 390×844 | Every section rendered visibly, no large black areas |
| 4 | Click each FAQ `<details>` summary | Icon swaps `+` → `−` on open, `−` → `+` on close |
| 5 | Booking form: pick check_in date | check_out's earliest selectable date updates; submitting check_out before check_in surfaces validation error |
| 6 | Click lang-toggle RU↔EN | URL bar shows `?lang=ru` / `?lang=en`; back button doesn't replay |
| 7 | Hover marquee | Animation pauses; remove cursor → resumes |
| 8 | Tab key through booking form | Each field shows visible oxblood `outline` |
| 9 | https://www.opengraph.xyz/ with prod URL | `og:image` resolves to `og.svg`, preview renders |
| 10 | https://search.google.com/test/rich-results with prod URL | Detects `Organization`, `TravelAgency`, `FAQPage` — no errors |

---

## Rollout

Single PR. Squash-merge to `main`. Vercel auto-deploys from `main`. Post-deploy run verification checklist 1-10 against `https://secrettravel.vercel.app`.

If Telegram link-preview turns out to need PNG (test #9 reveals broken preview specifically in Telegram), follow up with rasterized `og.png` in a separate small PR — does not block Sprint 1.
