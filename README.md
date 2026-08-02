# Retro JAMB UTME CBT Web Simulation Platform

A high-performance, secure, offline-resilient JAMB UTME Computer-Based Test (CBT) web simulation platform modeled after official Nigerian examination conditions.

## 🚀 Key Features
* **JAMB 8-Key Navigation Engine:** Fully supports single-key operations (`A`, `B`, `C`, `D`, `N`, `P`, `S`, `Y`) with full scroll lock.
* **Proctoring Anti-Cheating Sandbox:** Automatic tab-blur tracking, required fullscreen enforcement, context-menu restrictions, and auto-submission upon 3 security infractions.
* **Resilient API Architecture:** Proxies remote ALOC JAMB API requests server-side with zero key exposure and automatic fallback to a local question bank if the remote API fails or times out.
* **Responsive Retro Palette:** Built with official deep blue (`#0A369D`), gold, and soft blue-grey tones mimicking legacy CBT testing center terminals.
* **0-Dependency Infrastructure:** Powered entirely by Next.js 14, React Hooks, Context, and Tailwind CSS. Zero external UI component library bloat.

## 🛠️ Environment Configuration

Create a `.env.local` file in the project root:

```env
# Optional: Get your key at [https://aloc.ng](https://aloc.ng)
# If left blank, system automatically uses internal fallback mock bank.
ALOC_API_KEY=your_aloc_access_token_here
