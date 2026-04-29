# Telegram Forms via Cloudflare Worker

This project sends form submissions to Telegram through a Cloudflare Worker, so the bot token is never exposed in frontend code.

## 1) Create Worker

```bash
npm create cloudflare@latest eleonorlab-forms
```

Choose **Worker only**.

Then replace the generated Worker source with [`telegram-form-worker.js`](./telegram-form-worker.js).

## 2) Configure Worker secrets

```bash
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
```

Optional CORS allow-list (comma-separated):

```bash
wrangler secret put ALLOWED_ORIGINS
```

Example value for `ALLOWED_ORIGINS`:

```text
https://eleonorlab.com,https://www.eleonorlab.com
```

## 3) Deploy Worker

```bash
wrangler deploy
```

Point a custom route to the Worker, for example:

- `https://eleonorlab.com/api/telegram/*`

## 4) Frontend endpoint mapping

Frontend forms read endpoint from:

- `window.__ELEONORLAB_TELEGRAM_ENDPOINT__` (if present)
- or `<meta name="telegram-form-endpoint" content="...">`

The project currently uses:

```html
<meta name="telegram-form-endpoint" content="/api/telegram/submit">
```

If you use another Worker URL, update this meta tag on pages with forms.

## 5) Test

Submit any form from:

- homepage contact block
- `/contacts/`
- `/project-sp/`
- `/project-sp2/`

You should receive Telegram messages in the configured chat/group.

## 6) Cache rules for fresh deploys (no stale HTML)

If you use Cloudflare in front of GitHub Pages, configure cache rules so HTML is never served stale while static assets stay fast.

### Rule A: Bypass cache for HTML/doc routes

**Expression (Custom filter):**

```text
(http.request.method eq "GET")
and not (
  http.request.uri.path matches "(?i).*\.(css|js|mjs|png|jpg|jpeg|webp|avif|svg|ico|woff|woff2|ttf|eot|pdf|xml|txt)$"
)
```

**Action:**

- Cache eligibility: `Bypass cache`

This covers `/`, `/about/`, `/project-kp*/` and any route that resolves to HTML.

### Rule B: Cache static files aggressively

**Expression (Custom filter):**

```text
(http.request.method eq "GET")
and (
  http.request.uri.path matches "(?i).*\.(css|js|mjs|png|jpg|jpeg|webp|avif|svg|ico|woff|woff2|ttf|eot|pdf|xml|txt)$"
)
```

**Action:**

- Cache eligibility: `Eligible for cache`
- Edge TTL: `1 month` (or higher)
- Browser TTL: `1 month` (or higher)

Because CSS/JS are versioned with `?v=...`, long TTL is safe.

### Deploy checklist

1. Deploy/push site updates.
2. Cloudflare -> Caching -> Purge cache -> `Purge Everything` (once after release).
3. Hard refresh on test device (`Ctrl+F5`).
4. Verify that HTML is fresh and static files come from cache.
