"use client";

import { useAuth } from "@/hooks/useAuth";
import { useProductionMode } from "@/components/ProductionModeProvider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PortalLoading() {
  return (
    <div className="min-h-screen bg-[#E9F1F7] flex flex-col items-center justify-center font-mono select-none">
      <div className="w-10 h-10 border-4 border-[#0A369D] border-t-transparent rounded-full animate-spin mb-3"></div>
      <p className="text-[#0A369D] font-bold text-xs uppercase tracking-wider">Loading…</p>
    </div>
  );
}

// useSearchParams() requires a Suspense boundary for static prerendering.
export default function CandidatePortalPage() {
  return (
    <Suspense fallback={<PortalLoading />}>
      <PortalContent />
    </Suspense>
  );
}

function PortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productionMode = useProductionMode();
  const { user, loading, configured, signUpWithPassword, signInWithPassword, signInWithEmail, signOut } = useAuth();

  const [mode, setMode] = useState<"register" | "signin">("signin");
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const redirectTarget = searchParams.get("redirect") || "/setup";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setMessage("");

    // Client-side validation
    if (!form.fullName.trim()) {
      setStatus("error");
      setMessage("Full name is required.");
      return;
    }
    if (!EMAIL_RE.test(form.email)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }
    if (form.password.length < 6) {
      setStatus("error");
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("sending");
    const { ok, error, needsConfirmation } = await signUpWithPassword(form.email, form.password, {
      fullName: form.fullName.trim(),
      phone: form.phone.trim() || undefined,
    });

    if (!ok) {
      setStatus("error");
      setMessage(error || "Registration failed. Please try again.");
      return;
    }

    if (needsConfirmation) {
      setStatus("sent");
      setMessage("Registration successful! Check your inbox to confirm your email, then sign in below.");
      setMode("signin");
      setForm({ fullName: "", email: form.email, phone: "", password: "", confirmPassword: "" });
    } else {
      // Signed in immediately (email confirmation not required).
      setStatus("sent");
      router.push(redirectTarget);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setMessage("");

    if (!EMAIL_RE.test(form.email)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }
    if (!form.password.trim()) {
      setStatus("error");
      setMessage("Password is required.");
      return;
    }

    setStatus("sending");
    const { ok, error } = await signInWithPassword(form.email, form.password);

    if (!ok) {
      setStatus("error");
      setMessage(error || "Sign-in failed. Check your credentials and try again.");
      return;
    }

    setStatus("sent");
    router.push(redirectTarget);
  };

  const handleMagicLink = async () => {
    setStatus("idle");
    setMessage("");

    if (!EMAIL_RE.test(form.email)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }

    setStatus("sending");
    const { ok, error } = await signInWithEmail(form.email);

    if (!ok) {
      setStatus("error");
      setMessage(error || "Could not send the magic link.");
      return;
    }

    setStatus("sent");
    setMessage("Check your inbox for a magic sign-in link.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E9F1F7] flex flex-col items-center justify-center font-mono select-none">
        <div className="w-10 h-10 border-4 border-[#0A369D] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-[#0A369D] font-bold text-xs uppercase tracking-wider">Loading…</p>
      </div>
    );
  }

  // Graceful degrade: accounts not configured on this deployment.
  if (!configured) {
    return (
      <div className="min-h-screen bg-[#E9F1F7] flex flex-col font-sans">
        <header className="bg-[#0A369D] text-white sticky top-0 z-40 shadow-lg border-b-4 border-[#FFC107]">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-[#FFC107] shadow overflow-hidden">
                <img src="/logo.png" alt="Prepify" className="w-full h-full object-contain p-1" onError={(e) => { const t = e.currentTarget as HTMLImageElement; t.onerror = null; t.src = "/prepify-logo.svg"; }} />
              </div>
              <div>
                <span className="font-extrabold text-lg uppercase tracking-wide block leading-tight">Prepify</span>
                <span className="text-[10px] text-gray-200 font-mono">UTME CBT Practice</span>
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md bg-white border-2 border-gray-300 rounded-lg shadow-lg p-6 text-center">
            <h1 className="text-xl font-black text-[#0A369D] uppercase mb-2">Accounts Not Available</h1>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Sign-in is not enabled on this deployment (authentication not configured). You can still use the practice platform anonymously.
            </p>
            <Link href="/setup" className="inline-block px-6 py-2.5 bg-[#0A369D] hover:bg-blue-900 text-white text-xs font-bold uppercase rounded shadow">
              Continue Without an Account
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Already signed in — show account summary.
  if (user) {
    return (
      <div className="min-h-screen bg-[#E9F1F7] flex flex-col font-sans">
        <header className="bg-[#0A369D] text-white sticky top-0 z-40 shadow-lg border-b-4 border-[#FFC107]">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-[#FFC107] shadow overflow-hidden">
                <img src="/logo.png" alt="Prepify" className="w-full h-full object-contain p-1" onError={(e) => { const t = e.currentTarget as HTMLImageElement; t.onerror = null; t.src = "/prepify-logo.svg"; }} />
              </div>
              <div>
                <span className="font-extrabold text-lg uppercase tracking-wide block leading-tight">Prepify</span>
                <span className="text-[10px] text-gray-200 font-mono">UTME CBT Practice</span>
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md bg-white border-4 border-[#0A369D] rounded-lg shadow-2xl p-6">
            <h1 className="text-2xl font-black text-[#0A369D] uppercase text-center mb-2">You're Signed In</h1>
            <div className="bg-[#E9F1F7] rounded p-4 mb-4 text-sm font-mono">
              {user.fullName && <p className="mb-1"><span className="text-gray-600">Name:</span> <span className="font-bold text-[#0A369D]">{user.fullName}</span></p>}
              <p><span className="text-gray-600">Email:</span> <span className="font-bold text-[#0A369D]">{user.email || "—"}</span></p>
            </div>
            <div className="flex flex-col gap-2">
              <Link href={redirectTarget} className="w-full py-2.5 bg-[#0A369D] hover:bg-blue-900 text-white text-xs font-bold uppercase rounded shadow text-center">
                Continue to Practice
              </Link>
              <button
                onClick={signOut}
                className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold uppercase rounded"
              >
                Sign Out
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Anonymous — show register/sign-in forms.
  return (
    <div className="min-h-screen bg-[#E9F1F7] flex flex-col font-sans">
      <header className="bg-[#0A369D] text-white sticky top-0 z-40 shadow-lg border-b-4 border-[#FFC107]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-[#FFC107] shadow overflow-hidden">
              <img src="/logo.png" alt="Prepify" className="w-full h-full object-contain p-1" onError={(e) => { const t = e.currentTarget as HTMLImageElement; t.onerror = null; t.src = "/prepify-logo.svg"; }} />
            </div>
            <div>
              <span className="font-extrabold text-lg uppercase tracking-wide block leading-tight">Prepify</span>
              <span className="text-[10px] text-gray-200 font-mono">UTME CBT Practice</span>
            </div>
          </Link>
        </div>
      </header>

      <section className="bg-[#0A369D] text-white py-10 px-4">
        <div className="max-w-md mx-auto text-center space-y-3">
          <span className="inline-block bg-[#FFC107] text-[#0A369D] text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-widest shadow">
            Candidate Portal
          </span>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-none">
            {mode === "register" ? "Create Your Account" : "Sign In"}
          </h1>
          <p className="text-sm text-gray-200 leading-relaxed">
            {mode === "register"
              ? "Register to access the practice platform and track your progress."
              : "Welcome back. Enter your credentials to continue."}
          </p>
        </div>
      </section>

      <main className="flex-1 flex items-center justify-center px-4 py-10 -mt-6">
        <div className="max-w-md w-full bg-white border-4 border-[#0A369D] rounded-lg shadow-2xl p-6 md:p-8">

          {/* Mode toggle */}
          <div className="flex border-b-2 border-gray-200 mb-6">
            <button
              type="button"
              onClick={() => { setMode("signin"); setStatus("idle"); setMessage(""); }}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                mode === "signin" ? "bg-[#0A369D] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setStatus("idle"); setMessage(""); }}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                mode === "register" ? "bg-[#0A369D] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Register
            </button>
          </div>

          {/* Status messages */}
          {message && (
            <div className={`mb-4 p-3 rounded border text-xs font-bold ${
              status === "sent"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-[#D9383A]"
            }`}>
              {message}
            </div>
          )}

          {mode === "register" ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="ADEBAYO, OLUMIDE CHUKWUEMEKA"
                  className="w-full p-3 border-2 border-gray-300 rounded font-mono text-sm focus:border-[#0A369D] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Email Address *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full p-3 border-2 border-gray-300 rounded font-mono text-sm focus:border-[#0A369D] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Phone (Optional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="080XXXXXXXX"
                  className="w-full p-3 border-2 border-gray-300 rounded font-mono text-sm focus:border-[#0A369D] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Password *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="w-full p-3 border-2 border-gray-300 rounded font-mono text-sm focus:border-[#0A369D] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Confirm Password *</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Re-enter your password"
                  className="w-full p-3 border-2 border-gray-300 rounded font-mono text-sm focus:border-[#0A369D] outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full py-3 bg-[#0A369D] hover:bg-blue-900 disabled:opacity-60 text-white text-xs font-extrabold uppercase rounded shadow transition-colors"
              >
                {status === "sending" ? "Creating Account…" : "Create Account"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full p-3 border-2 border-gray-300 rounded font-mono text-sm focus:border-[#0A369D] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Your password"
                  className="w-full p-3 border-2 border-gray-300 rounded font-mono text-sm focus:border-[#0A369D] outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full py-3 bg-[#0A369D] hover:bg-blue-900 disabled:opacity-60 text-white text-xs font-extrabold uppercase rounded shadow transition-colors"
              >
                {status === "sending" ? "Signing In…" : "Sign In"}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-500 uppercase font-bold">Or</span></div>
              </div>

              <button
                type="button"
                onClick={handleMagicLink}
                disabled={status === "sending"}
                className="w-full py-3 bg-white border-2 border-[#0A369D] hover:bg-[#E9F1F7] disabled:opacity-60 text-[#0A369D] text-xs font-extrabold uppercase rounded shadow transition-colors"
              >
                Email Me a Magic Link Instead
              </button>
            </form>
          )}

        </div>
      </main>

      <footer className="bg-[#0A369D] text-white py-4 text-center text-[11px] font-mono border-t-2 border-[#FFC107]">
        © {new Date().getFullYear()} Prepify • UTME CBT Practice
      </footer>
    </div>
  );
}
