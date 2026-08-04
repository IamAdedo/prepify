# Prepify — UTME CBT Practice Platform

> **Prepify** — "Prepare you for UTME." A free, proctored computer-based test (CBT)
> practice platform. **Not affiliated with any examination board**; all documents
> produced are practice-only.

A production-grade, secure, and offline-resilient CBT web platform that lets
candidates practice for the UTME under realistic testing-room conditions. Built on
the Next.js App Router with zero external UI dependencies and optimized for free
hosting on Vercel. Every integration (questions, database, email) degrades
gracefully, so the app builds and runs even with no secrets configured.

---

## 🚀 Key Features

1. **Two exam modes**
   - **Full UTME:** Use of English (**60 questions**) + 3 candidate-chosen electives
     (**40 questions** each). **120 minutes** total.
   - **Single Subject Drill:** **100 questions** on one subject. **90 minutes** —
     except Mathematics, Physics, and Chemistry, which get **120 minutes**.
2. **Equal-marks scoring (server-authoritative)**
   - Each subject is scaled to **100 marks** regardless of its question count. The
     aggregate is the **sum of subject scaled scores** — `/400` for a full UTME,
     `/100` for a single drill.
   - Grading happens on the server (`/api/grade`). The answer key is AES-256-GCM
     encrypted into a per-exam token and **never reaches the browser**, so scores
     and the leaderboard can't be spoofed client-side.
3. **8-Key keyboard navigation** with default-scroll locking:
   - `A` `B` `C` `D` — select an option · `P` / `N` — previous / next question ·
     `S` — open submit overlay · `Y` — confirm submission.
4. **Proctoring sandbox**
   - **Fullscreen enforcement** for the duration of the exam (clean exit on submit).
   - **Focus / tab-blur detection** with a grace countdown.
   - **Webcam monitoring** via the native `FaceDetector` API (graceful `—` when
     unsupported), plus a biometric verification snapshot below the live feed.
   - **No-person detection:** flags "candidate left" and auto-submits after 1 min.
   - **Audio analyser** for ambient-noise warnings (level only — nothing recorded).
   - **Infraction limit:** consolidated event log; repeated infractions auto-submit.
   - **Text protection:** right-click, copy, and text selection disabled.
   - Camera + microphone are released immediately on submit.
5. **Live questions with offline fallback**
   - Pulls past questions from the **ALOC developer portal**
     (`https://dev.aloc.com.ng/api/v1`) via the server route `/api/questions`,
     which paginates to the exact per-subject target count and shuffles for variety.
   - Falls back to a structured offline mock bank if the API fails, times out, or
     no key is configured.
   - Questions are **pre-fetched and cached** before the exam starts; a
     refresh/crash mid-exam **resumes in place**.
6. **Result slips & PDF export**
   - Print-optimized result slip with candidate biometric photo, dynamic score
     ceiling, consolidated security-event log, and a verification QR code.
   - One-click **dual PDF export**: the result slip and a **watermarked** answer
     review & key breakdown.
   - Optional **email result slip** via Resend.
7. **Homepage, leaderboard & weekly challenge**
   - Landing page with a live **weekly challenge** whose results feed the boards.
   - **Full-UTME** and **by-subject** leaderboards; a subject with zero
     participants shows no board. Dedicated `/leaderboard` page.
8. **Optional accounts & history**
   - Magic-link (OTP) sign-in. Attempt history syncs across devices when signed in
     (`/history`), and stays in `localStorage` otherwise. The anonymous flow is
     fully functional.
9. **Privacy & consent** — all camera/mic access is gated behind an explicit
   consent notice describing exactly what is collected.

---

## 📁 Project Structure

```
prepify/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── questions/route.ts    # ALOC proxy (paginated) + mock fallback + answer-token
│   │   │   ├── grade/route.ts        # Server-authoritative grading + leaderboard write
│   │   │   ├── contact/route.ts      # Contact form (Resend), rate-limited
│   │   │   └── email-result/route.ts # Email result slip (Resend), rate-limited
│   │   ├── exam/page.tsx             # Active test workspace & keyboard controller
│   │   ├── results/page.tsx          # Result dashboard, analytics & review grid
│   │   ├── setup/page.tsx            # Candidate setup, consent & biometric wizard
│   │   ├── leaderboard/page.tsx      # Full-UTME + by-subject leaderboards
│   │   ├── history/page.tsx          # Per-account attempt history + sign-in
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Landing homepage
│   ├── components/                   # ModeSelector, WebCamMonitor, ResultSlipPDF, …
│   ├── data/mockJambQuestions.ts     # Offline fallback question bank
│   ├── hooks/                        # Proctoring, timer, keybindings, auth
│   ├── lib/                          # examCrypto, leaderboard, pdf, week, registration, supabase
│   └── types/jamb.ts                 # Shared TypeScript interfaces
├── supabase/schema.sql              # Postgres schema (leaderboard, challenges, attempts) + RLS
├── public/                          # Static assets (drop your logo at public/logo.png)
└── package.json
```

---

## 🛠️ Local Development

### Prerequisites
- **Node.js** v18+ · **npm** v9+

### Steps

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` in the project root. **Everything is optional** — the app
   falls back gracefully when any value is absent:
   ```env
   # Questions (ALOC developer portal). Falls back to the offline mock bank if unset.
   ALOC_API_KEY=

   # Exam answer-key encryption (server-authoritative scoring).
   # Use a long random string in production; an insecure dev default is used if unset.
   EXAM_SIGNING_SECRET=

   # Supabase — leaderboard persistence + optional accounts/history.
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=        # server-only; lets /api/grade write the board authoritatively

   # Resend — contact form + result-slip email.
   RESEND_API_KEY=
   CONTACT_TO_EMAIL=
   CONTACT_FROM_EMAIL=Prepify <onboarding@resend.dev>
   ```
   > ⚠️ Server-only secrets must **not** use the `NEXT_PUBLIC_` prefix. Never commit
   > `.env*` files — they are gitignored.

3. (Optional) Apply the database schema to enable shared leaderboards and synced
   history:
   ```bash
   supabase db push   # or paste supabase/schema.sql into the Supabase SQL editor
   ```
   The schema is idempotent and safe to re-run.

4. Start the dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

## 🚀 Production Build & Deployment

Verify the build compiles before deploying:
```bash
npm run build
```

### Vercel

1. Push the codebase to a git remote (GitHub, GitLab, Bitbucket).
2. In the Vercel dashboard, **Add New Project** and select this repository.
3. Under **Environment Variables**, add any of the keys from the `.env.local`
   block above that you want live (all optional). For production, set at least
   `EXAM_SIGNING_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` so scoring and the
   leaderboard are authoritative.
4. **Deploy.** Vercel auto-detects the Next.js App Router.

---

Project ![Profile Views](https://visitor-badge.laobi.icu/badge?page_id=IamAdedo.agrilink&color=blue&label=Project%20Views) \
Total developer profile ![Profile Views](https://visitor-badge.laobi.icu/badge?page_id=IamAdedo.IamAdedo&color=blue&label=Total%20Profile%Visitor%20Count)


