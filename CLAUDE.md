# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page marketing/commerce site for "Yard Connect" (an event in Ghana, prices in GHS) plus one Netlify serverless function that relays orders to the site owner. There is no build step, no framework, no tests, and no linter.

## Commands

```
npm install                 # installs twilio + nodemailer for the function only
netlify dev                 # local server with functions at /.netlify/functions/order
netlify deploy --prod       # deploy
```

Netlify Drop (drag-and-drop) will **not** work — it serves static files only and silently drops the function, breaking checkout. Deploy via CLI or a Git-connected site.

Function logs live in the Netlify dashboard under **Site > Functions > order > Logs**.

## Architecture

### `index.html` — the entire frontend

One 1.3 MB file: `<style>` (lines ~10–683), markup (~687–1019), `<script>` (~1021–1430). No external assets except Google Fonts and the two `hero-bg*.mp4` files.

The file is large because **every product photo and the event flyer are inlined as base64 WebP data URIs**. A handful of lines are 100–450 KB each. This matters constantly:

- Never `cat` or Read the whole file. Use `sed -n 'A,Bp'` on a known range, and pipe through `cut -c1-200` when a range might contain an image line.
- `grep -n` for an id/class first to find the line, then read around it.
- Adding or replacing a product image means swapping a base64 blob, not adding a file.

### Product data lives in the DOM, not in JS

There is no product array. Each `.product` card in the merch grid carries its own data, and the modal reads it back off the card when clicked:

- `data-name`, `data-price` (integer GHS)
- `data-sizes` — comma-separated, defaults to `L,XL,XXL`
- `data-color-label-white` / `-black`, `data-color-swatch-white` / `-black` — override the two fixed colorways
- Images are sibling `<img>` elements found by class: `.product-img img` (white front), `.product-back-img`, `.product-black-front-img`, `.product-black-back-img`. Missing black photos fall back to the white ones.
- Behaviour flags are classes, not attributes: `product-no-size`, `product-no-color`, `product-no-back`, `product-no-hover`.

To add a product, clone an existing `.product` block and edit these — nothing in the script needs touching. The whole card is the click target (the "Add" button just bubbles up); there is no separate `.add-to-cart` handler.

The cart line item name is composed at add-time as `Name — Color / Size`, so cart, order payload, WhatsApp message and email all show variants as one flattened string. Cart state is `[{name, price, qty}]` persisted to `localStorage` under `yc_cart`, wrapped in try/catch because storage may be blocked.

Ticket cards (`.ticket`) also carry `data-name`/`data-price` but are **not** wired to the cart — tickets sell through an external egotickets.com link. Don't assume the attributes are live.

### Checkout flow

`#checkoutBtn` validates name and phone (digit count per country, from `data-min`/`data-max` on the `#orderCountry` options; a leading `0` is stripped when a dial code is selected), then POSTs `{name, phone, items[], total}` to `/.netlify/functions/order`. On success the form is swapped for `#cartConfirm` and the cart cleared. On failure the user sees a fallback phone number — the customer never sees anything about WhatsApp or email.

### `netlify/functions/order.js`

Validates the payload, formats one plain-text message, then attempts **both** Twilio WhatsApp and SMTP email independently. Each channel is wrapped in its own try/catch; the handler returns 200 if *either* succeeds and 502 only if both fail. Keep that both-channels-are-fallbacks-for-each-other property when editing.

Env vars (set in Netlify, redeploy to pick up changes): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `OWNER_WHATSAPP_TO`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (optional), `SMTP_FROM_NAME` (optional), `OWNER_EMAIL_TO`. See [README-SETUP.md](README-SETUP.md) for how to obtain them.

On the Twilio sandbox, the receiving number must re-send the join code periodically or WhatsApp delivery silently stops — an email-only 200 is the symptom.

## Conventions

Design tokens are CSS custom properties on `:root` (`--black`, `--paper`, `--orange`, `--rust`, `--grey`, `--radius:0px` — the brand is deliberately square). Anton for headings, Archivo for body. Modals lock scroll via `body.modal-open`. The hero picks `hero-bg-mobile.mp4` vs `hero-bg.mp4` in JS at load from a `(max-width:700px)` media query, not from `<source>` elements.
