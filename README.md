# 🎓 Campus Connect — College Leave Management System

A static, single-page web app (HTML / CSS / vanilla JS) with a small **Cloudflare Worker** backend that adds an AI-powered document-authenticity check.

**Live:** https://site-4cef1867d6fb4cca8fbe8a78d9bc8210.freebuff.page

## Features

- 🎬 Animated splash screen → **Enter Campus**
- 👥 Role-based logins: **Student**, **Staff/Teacher**, **HOD**
- 📝 Students apply for leave with optional document attachment
- 🔔 Notifications for every status change
- 👤 Student/staff profile pages
- 🌸 Pastel UI theme, animated wave background
- ✅ Staff forwards applications to the HOD; **HOD accepts / rejects** (works on `pending` and `forwarded` applications)
- 🤖 **AI fake-letter detection** — the server calls Groq's vision model to check an uploaded certificate/letter before the staff forwards it to the HOD
- 🕵️ **Duplicate certificate detector** — fingerprints an uploaded document and flags a student re-submitting the same file
- 🚫 OTP / outing-request feature intentionally removed

## Project structure

```
.
├── index.html        # App shell (splash + app screens)
├── css/style.css     # Theme, components, AI panel styles
├── js/app.js         # All app logic (roles, leave flow, AI check)
├── js/waves.js       # Animated background
├── worker.js         # Cloudflare Worker: /api/ai-check endpoint
├── manifest.json     # Freebuff Sites deploy manifest
└── public/           # Deployed copy of the static assets
    ├── index.html
    ├── css/style.css
    └── js/{app.js,waves.js}
```

`public/` is what gets deployed as static assets. **Edit the source files** (`index.html`, `css/`, `js/`) **then sync them:**

```bash
cp index.html public/index.html
cp js/app.js js/waves.js public/js/
cp css/style.css public/css/
```

## Local preview

Any static server works:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

(The AI check needs the Worker, so it only works once deployed.)

## Deploying (Freebuff Sites)

```bash
# manifest.json points at worker.js (Worker) and ./public (static assets)
```

Deploy with Freebuff Sites, then add these **secrets** (server-side only — never commit them):

| Secret name     | Value                                   |
| --------------- | --------------------------------------- |
| `OPENAI_API_KEY`| Your Groq API key (`gsk_...`)           |
| `AI_API_BASE`   | `https://api.groq.com/openai/v1`        |
| `AI_MODEL`      | `qwen/qwen3.8-27b`                      |

The browser never sees the key — `worker.js` calls Groq server-side and returns only `{ok, verdict, confidence, reasons}`.

## AI check contract

`POST /api/ai-check`

```json
{
  "image": "data:image/png;base64,...",
  "context": { "student": "...", "reason": "...", "dates": "..." }
}
```

Response: `200 {"ok":true,"verdict":"likely_genuine|likely_fake|uncertain","confidence":87,"reasons":["..."]}`

Errors: `400` bad request, `404`/`400` model issues, `429` rate-limited (auto-retried twice), `503` `no_key`.

Requirements: images must be ≥ 32 px per dimension; Groq's free tier allows roughly 2 checks/min.