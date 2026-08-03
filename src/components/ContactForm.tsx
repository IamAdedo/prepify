"use client";

import React, { useState } from "react";

// Contact / support form wired to the Resend-backed /api/contact route.
export const ContactForm: React.FC = () => {
  const [form, setForm] = useState({ name: "", email: "", msg: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send message.");
      setStatus("sent");
      setForm({ name: "", email: "", msg: "" });
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Full Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="p-2.5 border rounded text-xs outline-none focus:border-[#0A369D]"
        />
        <input
          type="email"
          placeholder="Email Address"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="p-2.5 border rounded text-xs outline-none focus:border-[#0A369D]"
        />
      </div>
      <textarea
        rows={4}
        placeholder="Your Message..."
        required
        value={form.msg}
        onChange={(e) => setForm({ ...form, msg: e.target.value })}
        className="w-full p-2.5 border rounded text-xs outline-none focus:border-[#0A369D]"
      />

      {status === "sent" && (
        <p className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded p-2.5">
          ✓ Message sent. Our team will get back to you shortly.
        </p>
      )}
      {status === "error" && (
        <p className="text-xs font-bold text-[#D9383A] bg-red-50 border border-red-200 rounded p-2.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full py-2.5 bg-[#0A369D] hover:bg-blue-900 disabled:opacity-60 text-white font-bold text-xs uppercase rounded shadow transition-colors"
      >
        {status === "sending" ? "Sending…" : "Submit Ticket"}
      </button>
    </form>
  );
};
