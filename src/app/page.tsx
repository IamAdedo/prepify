"use client";

import { ContactForm } from "@/components/ContactForm";
import { Leaderboard } from "@/components/Leaderboard";
import { WeeklyChallengeCard } from "@/components/WeeklyChallengeCard";
import Link from "next/link";

const FEATURES = [
  { icon: "🖥️", title: "Authentic CBT Interface", body: "8-key keyboard navigation, question map, and subject tabs that mirror the real UTME terminal." },
  { icon: "🛡️", title: "Live Proctoring", body: "Webcam liveness, background-noise detection, tab-focus tracking, and enforced fullscreen." },
  { icon: "📊", title: "Instant Result Slips", body: "Downloadable PDF result slip plus a watermarked answer review and key breakdown." },
  { icon: "🏆", title: "Weekly Challenge", body: "Compete on full-UTME and per-subject leaderboards that refresh every week." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#E9F1F7] flex flex-col font-sans">

      {/* Nav */}
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

          <nav className="hidden md:flex items-center space-x-6 text-xs font-bold uppercase tracking-wider">
            <a href="#leaderboard" className="hover:text-[#FFC107] transition-colors">Leaderboard</a>
            <a href="#features" className="hover:text-[#FFC107] transition-colors">Features</a>
            <a href="#contact" className="hover:text-[#FFC107] transition-colors">Support</a>
          </nav>

          <Link href="/setup" className="px-4 py-2 bg-[#D9383A] hover:bg-red-700 text-white font-bold text-xs uppercase rounded shadow transition-transform hover:scale-105">
            Start Practice
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#0A369D] text-white pt-14 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-5">
          <span className="inline-block bg-[#FFC107] text-[#0A369D] text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-widest shadow">
            100% Free UTME CBT Practice
          </span>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-none">
            Prepify
          </h1>
          <p className="text-lg md:text-2xl font-bold text-[#FFC107]">Prepare you for UTME.</p>
          <p className="text-sm md:text-base text-gray-200 max-w-2xl mx-auto font-serif leading-relaxed">
            Sit realistic, fully-proctored CBT practice exams. Take the weekly challenge, climb the
            leaderboards, and download a detailed result slip with an answer key breakdown — all free.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/setup" className="px-7 py-3.5 bg-[#D9383A] hover:bg-red-700 text-white font-extrabold uppercase tracking-wide text-sm rounded shadow-lg transition-transform hover:scale-105">
              Start a Practice Exam
            </Link>
            <Link href="/setup?challenge=weekly" className="px-7 py-3.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold uppercase tracking-wide text-sm rounded shadow transition-colors">
              This Week&apos;s Challenge
            </Link>
          </div>
        </div>
      </section>

      {/* Weekly challenge + Leaderboard */}
      <section id="leaderboard" className="px-4 -mt-12 pb-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <WeeklyChallengeCard />
          <Leaderboard />
        </div>
        <div className="max-w-6xl mx-auto text-center mt-6">
          <Link href="/leaderboard" className="inline-block text-xs font-bold text-[#0A369D] uppercase tracking-wider hover:underline">
            View full leaderboard →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-12 bg-white border-y border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-xs font-bold text-[#0A369D] uppercase tracking-widest block mb-1">Why Prepify</span>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase">Built to feel like the real thing</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-[#E9F1F7] rounded-lg border border-blue-200 p-5">
                <div className="text-3xl mb-2">{f.icon}</div>
                <h3 className="font-bold text-[#0A369D] text-sm uppercase mb-1.5">{f.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/setup" className="inline-block px-8 py-3.5 bg-[#0A369D] hover:bg-blue-900 text-white font-extrabold uppercase tracking-wide text-sm rounded shadow-lg transition-transform hover:scale-105">
              Configure Your Exam →
            </Link>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-12 px-4 max-w-3xl mx-auto w-full">
        <div className="bg-white p-6 rounded-lg border-2 border-gray-300 shadow-md">
          <h2 className="text-xl font-black text-[#0A369D] uppercase text-center mb-2">Technical Support & Feedback</h2>
          <p className="text-xs text-gray-500 text-center font-mono mb-6">Contact the Prepify team for assistance or questions.</p>
          <ContactForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A369D] text-white mt-auto border-t-4 border-[#FFC107] text-xs">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-extrabold uppercase text-sm mb-2 text-[#FFC107]">Prepify</h4>
            <p className="text-gray-300 leading-relaxed font-serif text-[11px]">
              A free, secure computer-based test practice platform that helps candidates prepare for
              UTME under realistic examination conditions.
            </p>
          </div>
          <div>
            <h4 className="font-bold uppercase mb-2 text-[#FFC107]">Navigate</h4>
            <ul className="space-y-1 font-mono text-[11px] text-gray-300">
              <li><Link href="/setup" className="hover:underline">Start Practice</Link></li>
              <li><Link href="/setup?challenge=weekly" className="hover:underline">Weekly Challenge</Link></li>
              <li><a href="#leaderboard" className="hover:underline">Leaderboard</a></li>
              <li><a href="#contact" className="hover:underline">Support</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold uppercase mb-2 text-[#FFC107]">System Status</h4>
            <p className="text-gray-300 text-[11px] font-mono">
              Terminal: <span className="text-green-400 font-bold">READY</span><br />
              Practice mode • Not affiliated with any examination board
            </p>
          </div>
        </div>
        <div className="bg-black/30 py-3 text-center border-t border-white/10 font-mono text-[11px]">
          © {new Date().getFullYear()} Prepify — UTME CBT Practice Platform
        </div>
      </footer>
    </div>
  );
}
