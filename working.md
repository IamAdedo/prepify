# Prepify — Working Document

Living status doc for the Prepify UTME CBT practice platform. Updated as work
progresses. Legend: ✅ done · 🟡 in progress · ⬜ not started.

> **Prepify** — "Prepare you for UTME." A free, proctored CBT practice platform.
> Not affiliated with any examination board; all documents are practice-only.

---

## 1. Scope / Requirements

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Fix liveness capture (camera on but no image shown) | ✅ |
| 2 | Fix floating webcam proctor feed (same bug) | ✅ |
| 3 | Results: consolidate security event log to one line per event type + count | ✅ |
| 4 | Exam mode: always fullscreen until exam finishes | ✅ |
| 5 | Add platform logo (`public/logo.png`) to result page (+ headers) | ✅ |
| 6 | Export/Print result slip → download as PDF immediately | ✅ |
| 7 | Simultaneously download the answer review & key breakdown PDF | ✅ |
| 8 | Watermark answer-review PDF with site name + candidate name | ✅ |
| 9 | Landing homepage before the exam/setup page | ✅ |
| 10 | Leaderboard on homepage | ✅ |
| 11 | Weekly challenge; its results populate the leaderboard | ✅ |
| 12 | Two leaderboard types: Full UTME + by-subject | ✅ |
| 13 | No leaderboard shown for a subject with zero participants | ✅ |
| 14 | Database decision + Supabase schema | ✅ |
| 15 | Rebrand: remove "JAMB"/official board naming → Prepify | ✅ |
| 16 | Registration number format `3271` + `HHmmss` + 2 letters | ✅ |
| 17 | Contact form via Resend | ✅ |
| 18 | Production-ready (build clean, graceful fallbacks) | ✅ |
| 19 | Exit fullscreen after successful submission | ✅ |
| 20 | Remove "Simulation Admin" from live proctor feed | ✅ |
| 21 | Biometric verification snapshot below the live feed | ✅ |
| 22 | Remove all demo/simulation artifacts (real product) | ✅ |
| 23 | No-person detection: "candidate left", auto-submit after 1 min | ✅ |
| 24 | Release camera + mic immediately on submit (not on unmount) | ✅ |
| 25 | Dedicated `/leaderboard` page; "View Leaderboard" links to it | ✅ |
| 26 | Exclude "Clear Session" button from answer-review PDF | ✅ |
| 27 | Watermark more transparent + spaced (no overlap) | ✅ |
| 28 | Full-JAMB electives chosen by candidate (not preselected) | ✅ |
| 29 | Server-authoritative scoring (leaderboard no longer spoofable) | ✅ |
| 30 | Pre-fetch & cache questions before exam; resilient load | ✅ |
| 31 | Resume in-progress exam after refresh/crash | ✅ |
| 32 | Performance analytics / weak-subject breakdown on results | ✅ |
| 33 | Optional accounts (magic-link) + attempt history `/history` | ✅ |
| 34 | Camera/biometric consent notice (gates capture) | ✅ |
| 35 | Email result slip via Resend | ✅ |
| 36 | Rate-limit `/api/contact` (+ `/api/email-result`) | ✅ |

---

## 2. Implemented

### Bug fixes
- **Camera feed race** — `srcObject` was assigned before the `<video>` mounted.
  Now stored in a ref and attached in an effect after mount.
  - `src/components/WebCamMonitor.tsx`
  - `src/app/setup/page.tsx` (liveness wizard)

### Routing / pages
- `/` — new **landing homepage** (hero, weekly challenge, leaderboard, features, contact).
- `/setup` — candidate setup (moved from `/`), supports `?challenge=weekly`.
- `/exam` — enforced fullscreen gate + auto-request.
- `/results` — logo, consolidated events, dual PDF export, weekly-challenge submit.

### De-demo (real product, not a simulation/demo)
- **Live proctor feed** (`WebCamMonitor.tsx`) — removed the "Simulation Admin"
  manual face-count buttons; face counting now uses the native `FaceDetector`
  API with a graceful `—` when unsupported. Biometric setup snapshot rendered
  below the feed under "Verified Identity".
- **Fullscreen exit on submit** — `executeSubmission` flags an intentional exit
  (`beginSubmission`/`isSubmittingRef`) then `exitFullscreen()` so no false
  "exited fullscreen" violation is logged (`exam/page.tsx`, `useAdvancedProctoring.ts`).
- Removed the **admin bypass** button + handler from setup (now a conditional
  "Retry Camera" on camera error).
- Removed the seeded/demo **leaderboard rows**; fallback uses only this device's
  real submissions. "Demo rankings" label → "Your device".
- Copy cleanup: `ModeSelector` "Simulates the authentic…" → "Full … practice exam".

### Libraries (`src/lib/`)
- `week.ts` — ISO week key, challenge title, countdown to week end.
- `registration.ts` — `3271` + `HHmmss` + 2 random letters.
- `securityEvents.ts` — groups raw infraction logs → typed counts.
- `pdf.ts` — DOM → multi-page A4 PDF via html2canvas + jsPDF, optional watermark.
- `leaderboard.ts` — submit/fetch with Supabase, seed + localStorage fallback.
- `supabaseClient.ts` — anon browser client (null when unconfigured).

### Components
- `Leaderboard.tsx` — Full-UTME + By-Subject tabs; empty subjects hidden.
- `WeeklyChallengeCard.tsx` — live countdown, CTA into `/setup?challenge=weekly`.
- `ContactForm.tsx` — posts to `/api/contact` (Resend).
- `ResultSlipPDF.tsx` — Prepify branding, logo, consolidated event table, PDF export.

### API routes
- `POST /api/contact` — Resend email; logs + succeeds when unconfigured. Rate-limited (5 / 10 min / IP).
- `POST /api/grade` — **server-authoritative grading**. Decrypts the per-exam
  answer token, scores each question, computes per-subject scaled scores +
  aggregate (/400), and writes the weekly leaderboard entry server-side (service
  role). Returns `GradeResult { aggregateScore, totalCorrect, subjectScores,
  breakdown[], leaderboardRecorded }`.
- `POST /api/email-result` — emails a candidate their result summary via Resend
  (HTML slip); logs + succeeds when unconfigured. Rate-limited.
- `GET /api/questions` — ALOC + mock fallback. **Now strips `answer`/`explanation`
  from the client payload** and returns an encrypted `answerToken` instead, so the
  answer key never reaches the browser during the exam.

### Server-authoritative scoring & anti-spoof (new)
- `src/lib/examCrypto.ts` — AES-256-GCM encrypt/decrypt of the answer key using a
  SHA-256 of `EXAM_SIGNING_SECRET` (insecure dev default when unset). Token layout
  `iv(12)|tag(16)|ciphertext`, base64url.
- `src/lib/supabaseServer.ts` — `getServerSupabase()` prefers the service-role key,
  falls back to anon, then null.
- Flow: setup pre-fetches questions → caches `jamb_questions` + `jamb_answer_token`
  → exam reads cache (no answers client-side) → results POSTs to `/api/grade` →
  renders from the returned `breakdown`. Leaderboard is written by the server; the
  client `submitLeaderboardEntry` only runs as a localStorage fallback when the
  server didn't record it (`leaderboardRecorded === false`).

### Resilience / resume (new)
- Setup **pre-fetches & validates** questions before entering the exam, with a
  launch spinner + inline error on failure (`isLaunching` / `launchError`).
- Exam reads questions from cache first, falls back to a live fetch; persists
  `jamb_current_index` + `jamb_visited` so a refresh/crash **resumes** in place.

### Accounts & history (new, all optional)
- `src/hooks/useAuth.ts` — magic-link (OTP) auth; reports `configured:false` and
  no-ops when Supabase is absent. Anonymous flow unaffected.
- `src/lib/history.ts` — `saveAttempt` (localStorage always, Supabase when signed
  in) + `loadAttempts` (merge remote+local, dedupe, newest first).
- `/history` page — progress summary (attempts / best / average), attempts table,
  and an optional magic-link sign-in panel.

### Privacy / consent (new)
- Setup gates all camera/mic access behind an explicit **consent checkbox** with an
  expandable "what is collected" notice; the biometric snapshot button is disabled
  until consent is given.

### Results analytics (new)
- Per-subject progress bars (green/amber/red), a **weak-subject "focus next on"**
  callout for subjects < 50%, link to `/history`, and an **email-my-result** panel.

### Database
- `supabase/schema.sql` — `weekly_challenges`, `leaderboard_entries`,
  `leaderboard_subject_scores`, ranked views, RLS, current-week seed, **plus the
  new `attempts` table** (per-account history, RLS scoped to `auth.uid()`,
  `unique(user_id, client_attempt_id)` for idempotent re-sync).

---

## 3. Configuration (env)

Set these in `.env` / hosting env for full production behavior. All optional —
the app falls back gracefully when absent.

```
# Supabase (leaderboard persistence + optional accounts/history)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-only; lets /api/grade write the board authoritatively

# Exam answer-key encryption (server-authoritative scoring)
EXAM_SIGNING_SECRET=            # long random string in prod; insecure dev default if unset

# Resend (contact form + result-slip email)
RESEND_API_KEY=
CONTACT_TO_EMAIL=
CONTACT_FROM_EMAIL=Prepify <onboarding@resend.dev>

# Questions (existing)
ALOC_API_KEY=
```

Also: drop your logo at `public/logo.png` (falls back to `prepify-logo.svg`).

---

## 4. Left to implement / follow-ups

- ⬜ Provide a real `public/logo.png` (currently falls back to SVG).
- ⬜ Apply `supabase/schema.sql` to a Supabase project + set env vars to make the
  leaderboard **and** cross-device history live (works on seed/local until then).
- ⬜ Set `EXAM_SIGNING_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` in production
  (grading works with a dev default + local leaderboard fallback until then).
- ⬜ Optional: server-side weekly-challenge rollover job / admin to create the
  next week's `weekly_challenges` row (seed currently covers the current week).
- ⬜ Optional: move the in-memory rate limiter to Redis/Upstash for multi-instance.
- ✅ Rate-limit `/api/contact` (+ `/api/email-result`).
- ✅ Final `next build` verification — compiles clean (exit 0), 13/13 pages, `tsc --noEmit` clean.

---

## 5. Changelog
- **Exam structure & scoring model (per spec):**
  - **Full UTME:** Use of English = **60 questions**, each other subject = **40**;
    120 min total. **Single drill:** **100 questions**, 90 min — except
    Mathematics/Physics/Chemistry, which get **120 min**.
  - **Equal marks:** every subject is scaled to **100 marks** regardless of its
    question count. Aggregate is now the **sum of subject scaled scores** (full =
    /400, single drill = /100) — no longer a per-question ratio
    (`grade/route.ts`).
  - `GET /api/questions` now takes a `mode` param and **paginates ALOC**
    (`limit=40`, cursor) to the exact per-subject target count, with a random-year
    pass for variety + all-years top-up, de-dupe, and shuffle. Dropped
    `random=true` (capped at 10/call). Mock fallback unchanged.
  - `ResultSlipPDF` aggregate ceiling is now **dynamic** (`subjects × 100`) instead
    of hardcoded `/400`; QR + "scaled" caption follow suit. `ModeSelector` copy
    updated to the new counts/durations.
  - **Launch button** recoloured **green** (`bg-green-600`).
- **Production fixes (post-deploy):**
  - **ALOC questions were falling back to mock in production** — the route
    targeted `questions.aloc.ng`, a dead/parked host (DNS `ENOTFOUND`
    everywhere, incl. Vercel). Switched to the live developer portal
    `dev.aloc.com.ng/api/v1/questions` with the `X-API-Key` header
    (verified against the real key), `random=true&limit=40`. Now parses the
    `{ data }` envelope + `{ text, options:{A..D}, correctAnswer }` shape and
    uses the correct subject slugs (`english-language`,
    `christian-religious-studies`, `literature-in-english`, …). `source` flag
    now reports `live` only when ALOC actually returned rows.
  - **schema.sql not idempotent (ERROR 42710)** — added `drop policy if exists`
    before every `create policy`, so the whole file re-runs cleanly.
  - **Git** — repo initialised, remote `origin`
    (`https://github.com/IamAdedo/prepify.git`) added, committed on top of the
    existing `main` and pushed (fast-forward). Local == remote verified; `.env`
    confirmed ignored/untracked. Added `.gitignore`, `AGENTS.md`, `CLAUDE.md`.
- **"Implement all" production hardening:** server-authoritative scoring
  (`examCrypto` + `/api/grade`; answer key encrypted, never sent to client),
  pre-fetch/cache questions in setup with resilient exam load + refresh resume,
  camera/biometric **consent gate**, per-account **attempt history** + `/history`
  page with optional magic-link auth, **performance analytics / weak-subject**
  breakdown, **email result slip** via Resend, rate-limited contact + email
  routes, `attempts` table (RLS) added to schema. `tsc` + `next build` clean.
- De-demo pass: removed Simulation Admin controls (native FaceDetector instead),
  biometric snapshot below live feed, fullscreen exits cleanly on submit, removed
  admin bypass + seeded leaderboard, copy cleanup. `next build` clean.
- Initial build: camera fix, rebrand, landing + leaderboard + weekly challenge,
  Supabase schema, registration format, Resend contact, fullscreen enforcement,
  consolidated security log, dual watermarked PDF export.
