# Official JAMB UTME CBT Web Examination Platform

A production-grade, high-performance, secure, and offline-resilient computer-based test (CBT) web platform modeled after the official Joint Admissions and Matriculation Board (JAMB) terminal interface. Built to run with zero external UI dependencies and optimized for 100% free hosting on Vercel.

---

## 🚀 Key System Features

1. **Retro JAMB Aesthetics:** Faithful styling matching official legacy testing center screens using standard Tailwind CSS `#0A369D` Deep Blue, `#E9F1F7` Soft Blue-Grey background, and `#D9383A` Action Red.
2. **8-Key Keyboard Navigation:** Complete window-level keystroke navigation mapping standard JAMB CBT controls with default browser scroll-locking:
   - `A`, `B`, `C`, `D` — Select corresponding option choice.
   - `P` — Jump to the previous question.
   - `N` — Jump to the next question.
   - `S` — Open the Submit Exam overlay.
   - `Y` — Confirm submission (active only when the submission overlay is open).
3. **Advanced Anti-Cheating Proctoring Sandbox:**
   - **Fullscreen Enforcement:** Forces candidates to enter fullscreen to test. Exiting fullscreen logs an infraction.
   - **Focus / Tab-Blur Detection:** Monitors window blur and tab switching. Switched focus initiates a 15-second grace countdown timer; failure to return in time terminates the session.
   - **Webcam face monitoring:** Displays a floating webcam feed and simulates candidate presence tracking (0, 1, or 2+ faces in the stream) to trigger security alerts.
   - **Audio Analyser:** Periodically evaluates microphone dB levels and displays warnings if room quietness is violated.
   - **Infraction limit:** Accumulates warning infractions; reaching 3 infractions triggers an immediate auto-submission of the candidate's paper.
   - **Text Protection:** Right-clicks (`contextmenu`), text copy shortcuts (`copy`), and text selection (`selectstart`) are disabled across the workspace.
4. **Dynamic API & Offline Fallback:**
   - Proxies questions from the ALOC JAMB API (`https://aloc.ng`) using a server-side route (`/api/questions`) to protect credentials.
   - Supports multi-subject grouping and custom past question years.
   - Automatically degrades to a structured offline mock database if API access fails, times out, or if the API key is not configured.
5. **Score Slip Generator:** Builds a print-optimized candidate grading sheet complete with candidate biometric photo, official watermarks, and verification QR code.

---

## 📁 Project Directory Structure

```
prepify/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── questions/
│   │   │       └── route.ts         # Secure server-side query proxy & fallback normalizer
│   │   ├── exam/
│   │   │   └── page.tsx             # Active test workspace & keyboard controller
│   │   ├── results/
│   │   │   └── page.tsx             # Candidate dashboard & review grid
│   │   ├── globals.css              # Global styles & Tailwind base directives
│   │   ├── layout.tsx               # Root page layout template
│   │   └── page.tsx                 # Candidate registration portal & setup
│   ├── components/
│   │   ├── ModeSelector.tsx         # Component for selecting Single vs 4-Subject Mode
│   │   ├── QuestionCanvas.tsx       # Render active question text & choices list
│   │   ├── QuestionMap.tsx          # Numerical question status grid mapped by True IDs
│   │   ├── ResultSlipPDF.tsx        # Print-optimized result slip layout
│   │   ├── SubmissionModal.tsx      # Submission verification confirmation overlay
│   │   ├── TopHeader.tsx            # Candidate details header bar
│   │   └── WebCamMonitor.tsx        # Floating webcam stream & simulation controller
│   ├── data/
│   │   └── mockJambQuestions.ts     # Rich fallback question database for all subjects
│   ├── hooks/
│   │   ├── useAdvancedProctoring.ts # Unified proctoring, fullscreen, & event blockers hook
│   │   ├── useExamTimer.ts          # State timer tracker with auto-submit on 00:00
│   │   └── useJambKeybindings.ts    # Window-level keydown event listeners
│   └── types/
│       └── jamb.ts                  # Shared TypeScript interfaces & configurations
├── public/                          # Static public assets
├── tailwind.config.ts               # Color theme definitions
├── tsconfig.json                    # Compiler settings & path aliases mapping
├── next.config.mjs                  # Next.js router compilation flags
└── package.json                     # System dependencies & build scripts
```

---

## 🛠️ Local Development & Installation

### Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (v9.0.0 or higher)

### Steps

1. Clone or navigate into the workspace directory:
   ```bash
   cd prepify
   ```

2. Install the production dependencies:
   ```bash
   npm install
   ```

3. Create an environment configuration file:
   Create a `.env.local` file in the root folder and add your ALOC API key:
   ```env
   # Optional: Get your API access token at https://aloc.ng
   # If left blank, the platform automatically falls back to the offline mock bank.
   ALOC_API_KEY=your_aloc_access_token_here
   ```

4. Launch the local development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to access the CBT portal.

---

## 🚀 Production Build & Deployment

### Build Verification
Before deploying, verify the production build compiles successfully:
```bash
npm run build
```

### Vercel Deployment Strategy

To deploy this repository to Vercel:
1. Push your codebase to a remote git repository (GitHub, GitLab, Bitbucket).
2. Open the Vercel dashboard and click **Add New Project**.
3. Select this repository.
4. Under **Environment Variables**, add:
   - Key: `ALOC_API_KEY`
   - Value: `your_aloc_access_token`
5. Click **Deploy**. Vercel will automatically detect the Next.js App Router and complete the deployment.
