"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import SplitText from "@/components/reactbits/SplitText";
import BlurText from "@/components/reactbits/BlurText";
import FadeContent from "@/components/reactbits/FadeContent";
import Magnet from "@/components/reactbits/Magnet";
import BorderGlow from "@/components/reactbits/BorderGlow";
import ShinyText from "@/components/reactbits/ShinyText";

// ── AnimatedNumber (replaces missing CountUp) ──────────────────────────────
function AnimatedNumber({ to, duration = 2000 }: { to: number; duration?: number }) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * to));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [to, duration]);

  return <>{current}</>;
}

// ── Chat types ─────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Floating AI Chat Bar ───────────────────────────────────────────────────
function FloatingChatBar() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendHovered, setSendHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    if (!open) setOpen(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });

      const data = await res.json();
      const reply = data.reply ?? "Something went wrong. Please try again.";
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
    } catch {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "I'm having trouble connecting right now. Please try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, open]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4">
      {/* ── Chat panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="mb-3 rounded-2xl overflow-hidden gel-shadow border border-white/30"
            style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(24px)" }}
          >
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: "rgba(207,196,197,0.2)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-[#7671ff]"
                  style={{ fontSize: "18px", fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
                <span
                  className="text-xs font-bold uppercase tracking-widest text-[#1b1b1b]"
                  style={{ fontFamily: "var(--font-label)" }}
                >
                  Note-a-fly Assistant
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-[#5f5e5e] hover:text-[#1b1b1b] transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  close
                </span>
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex flex-col gap-3 px-5 py-4 overflow-y-auto"
              style={{ maxHeight: "320px", minHeight: messages.length === 0 ? "0px" : "120px" }}
            >
              {messages.length === 0 && !loading && (
                <div className="text-center py-6">
                  <p
                    className="text-[#5f5e5e] text-sm"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    Ask me anything about Note-a-fly — how it works, what it can do, or how to get started.
                  </p>
                  {/* Quick prompts */}
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {[
                      "How does it work?",
                      "What files can I upload?",
                      "Is it really free?",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setInput(q);
                          setTimeout(() => inputRef.current?.focus(), 50);
                        }}
                        className="px-3 py-1.5 rounded-full text-xs border transition-colors"
                        style={{
                          fontFamily: "var(--font-label)",
                          background: "#f9f9f9",
                          borderColor: "rgba(207,196,197,0.4)",
                          color: "#5f5e5e",
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mr-2 mt-0.5"
                      style={{ background: "#e2dfff" }}
                    >
                      <span
                        className="material-symbols-outlined text-[#7671ff]"
                        style={{ fontSize: "14px", fontVariationSettings: "'FILL' 1" }}
                      >
                        auto_awesome
                      </span>
                    </div>
                  )}
                  <div
                    className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                    style={{
                      fontFamily: "var(--font-body)",
                      background: msg.role === "user" ? "#1b1b1b" : "#f3f3f3",
                      color: msg.role === "user" ? "#ffffff" : "#1b1b1b",
                      borderRadius:
                        msg.role === "user"
                          ? "1rem 1rem 0.25rem 1rem"
                          : "1rem 1rem 1rem 0.25rem",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mr-2 mt-0.5"
                    style={{ background: "#e2dfff" }}
                  >
                    <span
                      className="material-symbols-outlined text-[#7671ff]"
                      style={{ fontSize: "14px", fontVariationSettings: "'FILL' 1" }}
                    >
                      auto_awesome
                    </span>
                  </div>
                  <div
                    className="px-4 py-3 rounded-2xl"
                    style={{
                      background: "#f3f3f3",
                      borderRadius: "1rem 1rem 1rem 0.25rem",
                    }}
                  >
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: "#7671ff" }}
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input bar ── */}
      <div
        className="rounded-full px-5 py-3.5 flex items-center gap-3 gel-shadow border"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(24px)",
          borderColor: "rgba(207,196,197,0.25)",
        }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-shrink-0 transition-transform"
          style={{ lineHeight: 0 }}
        >
          <span
            className="material-symbols-outlined text-[#7671ff]"
            style={{
              fontSize: "20px",
              fontVariationSettings: "'FILL' 1",
              display: "block",
            }}
          >
            auto_awesome
          </span>
        </button>

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => { if (!open && messages.length > 0) setOpen(true); }}
          onClick={() => { if (!open) setOpen(true); }}
          className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-[#1b1b1b] placeholder:text-[#5f5e5e]"
          style={{ fontFamily: "var(--font-body)" }}
          placeholder="Ask Note-a-fly anything..."
          maxLength={500}
          type="text"
          autoComplete="off"
        />

        <button
          onMouseEnter={() => setSendHovered(true)}
          onMouseLeave={() => setSendHovered(false)}
          onClick={send}
          disabled={!input.trim() || loading}
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            background:
              !input.trim() || loading
                ? "#eeeeee"
                : sendHovered
                ? "#7671ff"
                : "#1b1b1b",
            cursor: !input.trim() || loading ? "not-allowed" : "pointer",
            transform: sendHovered && input.trim() && !loading ? "scale(1.08)" : "scale(1)",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: "18px",
              color:
                !input.trim() || loading ? "#636262" : "#ffffff",
            }}
          >
            arrow_upward
          </span>
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#1b1b1b]">

      {/* ══════════ TOP NAV ══════════ */}
      <FadeContent blur={false} duration={900}>
        <nav className="sticky top-0 z-50 flex justify-between items-center px-8 py-3 w-full glass-nav rounded-full mt-4 mx-auto max-w-5xl gel-shadow">
          <div className="flex items-center gap-2">
            <span
              className="text-xl tracking-tight text-neutral-900"
              style={{ fontFamily: "var(--font-headline)", fontStyle: "italic" }}
            >
              Note-a-fly
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a
              className="font-medium transition-colors"
              style={{ color: "#7671ff", fontFamily: "var(--font-body)" }}
              href="/dashboard"
            >
              Library
            </a>
            {["Flashcards", "Mindmaps", "Quizzes"].map((item) => (
              <a
                key={item}
                className="transition-opacity hover:opacity-80"
                style={{ color: "#5f5e5e", fontFamily: "var(--font-body)" }}
                href="#"
              >
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm px-4 py-2 transition-colors"
              style={{ fontFamily: "var(--font-label)", color: "#5f5e5e" }}
            >
              Log in
            </Link>
            <Magnet padding={20} className="block">
              <Link href="/signup" className="block">
                <BorderGlow color="#7671ff" className="block">
                  <div
                    className="text-sm font-bold bg-black text-white px-5 py-2 rounded-full"
                    style={{ fontFamily: "var(--font-label)" }}
                  >
                    Sign Up
                  </div>
                </BorderGlow>
              </Link>
            </Magnet>
          </div>
        </nav>
      </FadeContent>

      <main className="max-w-7xl mx-auto px-6 pt-16 pb-32">

        {/* ══════════ HERO ══════════ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-32">
          <div className="lg:col-span-6 space-y-8">
            <FadeContent blur={false} duration={700} delay={0}>
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
                style={{ background: "#e2dfff", color: "#0f0069" }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "18px", fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-label)" }}
                >
                  Intelligence Unbound
                </span>
              </div>
            </FadeContent>

            <h1
              className="text-7xl lg:text-8xl text-black leading-[1.05] tracking-tight"
              style={{ fontFamily: "var(--font-headline)" }}
            >
              <SplitText
                text="The Living"
                className="block"
                delay={35}
                animationFrom={{ opacity: 0, transform: "translate3d(0,35px,0)" }}
                animationTo={{ opacity: 1, transform: "translate3d(0,0,0)" }}
              />
              <SplitText
                text="Manuscript"
                className="block pr-4"
                delay={45}
                animationFrom={{ opacity: 0, transform: "translate3d(0,35px,0)" }}
                animationTo={{ opacity: 1, transform: "translate3d(0,0,0)" }}
                style={{ fontStyle: "italic", fontFamily: "var(--font-headline)" }}
              />
            </h1>

            <BlurText
              text="Elevate your intellect with an AI companion that transforms raw lectures and dense readings into a fluid, connected ecosystem of knowledge."
              delay={25}
              animateBy="words"
              className="text-xl max-w-lg leading-relaxed"
              style={{ color: "#4c4546", fontFamily: "var(--font-body)" }}
            />

            <FadeContent blur={false} duration={900} delay={300}>
              <div className="flex flex-wrap gap-4 pt-4">
                <Magnet padding={30} className="block">
                  <Link href="/signup" className="block">
                    <BorderGlow color="#7671ff" className="block">
                      <button
                        className="bg-black text-white px-10 py-4 rounded-full font-bold text-lg shadow-lg flex items-center gap-3"
                        style={{ fontFamily: "var(--font-label)" }}
                      >
                        Get Started
                        <span className="material-symbols-outlined">north_east</span>
                      </button>
                    </BorderGlow>
                  </Link>
                </Magnet>

                <Magnet padding={15} className="block">
                  <button
                    className="bg-white text-black border px-10 py-4 rounded-full font-bold text-lg"
                    style={{
                      borderColor: "rgba(207,196,197,0.3)",
                      fontFamily: "var(--font-label)",
                    }}
                  >
                    Watch Demo
                  </button>
                </Magnet>
              </div>
            </FadeContent>
          </div>

          {/* Hero Visual */}
          <div className="lg:col-span-6 relative">
            <div className="relative z-10 rounded-xl overflow-hidden bg-white aspect-[4/5] md:aspect-square flex items-center justify-center shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)]">
              <img
                alt="The Living Manuscript"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBZb0eSdnPh1iH3drGGJBq59gU8KZ-UF4jd2xE1orWMkOWbojGQdsx5G-_E0BN2dec0z__87hqS-pJsWL2p545SpMJBJ_uoJrFDikobMKTBfkJfp5raMDHDskVhUQQ3HS2kE8Mir4635ja3LESHqvbvKgVflqzSQk7WzM2feR_ANCuj45C4BG78nRLF-aHVb6dXRYSA0_5_9Vg2pdEiWykkcee3kjO41gDKVFSiUFenusw0nKVMSK4HVu3WU0XqwEN3okPtNJma_M"
              />
              <div
                className="absolute bottom-8 left-8 right-8 p-6 rounded-lg border gel-shadow"
                style={{
                  backdropFilter: "blur(20px)",
                  background: "rgba(255,255,255,0.4)",
                  borderColor: "rgba(255,255,255,0.2)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-widest mb-1"
                      style={{ fontFamily: "var(--font-label)", color: "#4c4546" }}
                    >
                      Current Session
                    </p>
                    <p
                      className="text-lg font-bold"
                      style={{ fontFamily: "var(--font-headline)" }}
                    >
                      Advanced Neural Architectures
                    </p>
                  </div>
                  <div className="flex gap-1 items-end">
                    <span className="w-1 h-6 rounded-full" style={{ background: "rgba(15,0,105,0.3)" }} />
                    <span className="w-1 h-8 rounded-full" style={{ background: "#7671ff" }} />
                    <span className="w-1 h-4 rounded-full" style={{ background: "rgba(15,0,105,0.3)" }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full" style={{ background: "rgba(195,192,255,0.2)", filter: "blur(80px)" }} />
            <div className="absolute -bottom-12 -left-12 w-80 h-80 rounded-full" style={{ background: "rgba(212,210,210,0.4)", filter: "blur(100px)" }} />
          </div>
        </section>

        {/* ══════════ FEATURES BENTO GRID ══════════ */}
        <section className="space-y-12">
          <div
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b"
            style={{ borderColor: "rgba(207,196,197,0.2)" }}
          >
            <div>
              <h2
                className="text-4xl lg:text-5xl font-bold mb-4"
                style={{ fontFamily: "var(--font-headline)" }}
              >
                <SplitText text="Crafted for Scholars" delay={30} className="pr-2" />
              </h2>
              <BlurText
                text="Every tool designed to respect the sanctity of deep focus while providing the edge of artificial intelligence."
                delay={20}
                className="max-w-md"
                style={{ color: "#4c4546", fontFamily: "var(--font-body)" }}
              />
            </div>
            <div
              className="text-sm font-bold uppercase tracking-widest"
              style={{ fontFamily: "var(--font-label)", color: "#7671ff" }}
            >
              <ShinyText text="FEATURES / 01 — 03" speed={3} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* Card 1 — Ambient Recording */}
            <FadeContent blur={false} duration={800} delay={100} className="md:col-span-7">
              <div className="bg-[#eeeeee] rounded-2xl p-10 flex flex-col justify-between overflow-hidden relative h-full">
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <span className="material-symbols-outlined" style={{ color: "#1b1b1b" }}>mic_external_on</span>
                  </div>
                  <h3
                    className="text-3xl font-bold mb-4"
                    style={{ fontFamily: "var(--font-headline)" }}
                  >
                    Ambient Lecture Recording
                  </h3>
                  <p style={{ color: "#4c4546", fontFamily: "var(--font-body)" }} className="max-w-xs leading-relaxed">
                    Note-a-fly listens and transcribes in real-time, tagging key concepts and speaker shifts automatically.
                  </p>
                </div>
                <div className="mt-12">
                  <img
                    alt="Audio Recording Feature"
                    className="rounded-lg shadow-xl"
                    src="/AudioRecorder.png"
                  />
                </div>
              </div>
            </FadeContent>

            {/* Card 2 — Multimodal */}
            <FadeContent blur={false} duration={800} delay={200} className="md:col-span-5">
              <div className="bg-black text-white rounded-2xl p-10 flex flex-col justify-between overflow-hidden relative h-full">
                <div>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-6"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    <span className="material-symbols-outlined text-white">picture_as_pdf</span>
                  </div>
                  <h3
                    className="text-3xl font-bold mb-4"
                    style={{ fontFamily: "var(--font-headline)" }}
                  >
                    Multimodal Intelligence
                  </h3>
                  <p className="leading-relaxed" style={{ color: "#a0a0a0", fontFamily: "var(--font-body)" }}>
                    Upload complex PDFs or PPTX slides. Note-a-fly extracts diagrams, mathematical notations, and footnotes with surgical precision.
                  </p>
                </div>
                <div className="mt-8 flex gap-3">
                  {["DeepScan™", "OCR Enabled"].map((tag) => (
                    <div
                      key={tag}
                      className="px-4 py-2 rounded-full text-xs border"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        borderColor: "rgba(255,255,255,0.1)",
                        fontFamily: "var(--font-label)",
                      }}
                    >
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            </FadeContent>

            {/* Card 3 — Study Kits */}
            <FadeContent blur={false} duration={800} delay={300} className="md:col-span-4">
              <div className="bg-[#f3f3f3] rounded-2xl p-10 flex flex-col items-start gap-8 h-full">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined" style={{ color: "#7671ff" }}>style</span>
                </div>
                <div>
                  <h3
                    className="text-2xl font-bold mb-3"
                    style={{ fontFamily: "var(--font-headline)" }}
                  >
                    Auto-Generated Study Kits
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#4c4546", fontFamily: "var(--font-body)" }}>
                    From a single 20-minute recording, Note-a-fly generates interactive flashcards and randomized quizzes.
                  </p>
                </div>
                <div
                  className="w-full h-32 bg-white rounded-lg border flex flex-col items-center justify-center p-4"
                  style={{ borderColor: "rgba(207,196,197,0.2)" }}
                >
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "#eeeeee" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "#7671ff" }}
                      initial={{ width: "0%" }}
                      whileInView={{ width: "75%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 2, ease: "easeOut" }}
                    />
                  </div>
                  <p
                    className="mt-3 text-[10px]"
                    style={{ fontFamily: "var(--font-label)", color: "#7671ff" }}
                  >
                    COMPILING FLASHCARDS (<AnimatedNumber to={75} duration={2000} />%)
                  </p>
                </div>
              </div>
            </FadeContent>

            {/* Card 4 — Shared Semantics */}
            <FadeContent blur={false} duration={800} delay={400} className="md:col-span-8">
              <div
                className="bg-white rounded-2xl p-10 flex flex-col md:flex-row items-center gap-10 h-full border"
                style={{ borderColor: "rgba(207,196,197,0.2)" }}
              >
                <div className="flex-1">
                  <h3
                    className="text-3xl font-bold mb-4"
                    style={{ fontFamily: "var(--font-headline)" }}
                  >
                    Shared Semantics
                  </h3>
                  <p className="leading-relaxed" style={{ color: "#4c4546", fontFamily: "var(--font-body)" }}>
                    Collaborate on live manuscripts. Watch as your collective notes self-organize into a shared brain of citations and references.
                  </p>
                  <button
                    className="mt-6 font-bold flex items-center gap-2 text-[#1b1b1b] group"
                    style={{ fontFamily: "var(--font-label)" }}
                  >
                    Explore Collaboration
                    <span className="material-symbols-outlined" style={{ transition: "transform 0.2s" }}>
                      arrow_right_alt
                    </span>
                  </button>
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex -space-x-4">
                    {[
                      "https://lh3.googleusercontent.com/aida-public/AB6AXuCpa1Ixa8kIvq5CoablMWMl_iNsG8uBZyoyC4UH4Q32kMwQdF38JrcOxEtc8UmLrMXW66CbQ-k14rNuyrye_vBS5GPyFszi8yaB9rwpjNz8oRGxbRYKaGtfgngDY7yH5UBIpMKNntNiDyDvqPeOL4eqcVDvVA7IjGxaL-VgBtySWUaQBEfAkkTaxUreWdDQZn2jhoLFrkbrtKDV5FQJNX_TeBODoTAS5IRkdY1n-sWLePd8HnqdL3hWq5P5_hh7rS0PNy1GwRU-TFY",
                      "https://lh3.googleusercontent.com/aida-public/AB6AXuDO8qIIZNcrOzHMXG2v93xPqM3mtwUmGFR0OPhaTz1gxsroz9Ymk7LDeBbCV1xFenE484fXDGK__oEX6dMbdeyVXtZlJ0tbyFTz8ydyFo0EURZVwLjAkVXIjAqbl17A1bb8VgOwY6qfVwv_gmRIkPz2suG3wmr9PyU2SBhAh3IjHAQZDP8yXisdXNQEfscGXFzw9tNRMafKlfpMK6_Mg3WK4pX4uG-l1G4FNMIF80AkXCIAXf9OHFfo9hsAV0F4mj0ug05AphPaLrI",
                      "https://lh3.googleusercontent.com/aida-public/AB6AXuACsHP_RoLAmm681Urf0xqbQ19o-71tIUHGhd4d_2b9GXo7nnyEJsmvqWTMvcIVDQIzicElUBFbTP1eTv7oU5V3kDLo1PtxE8941tMd5M09IWcKitAWXBZeBA0V1Z24u-qx-6qi6G-pLZp-LFgsdum5rfMkc8ppDMAv2T5l5ROq4g2LVHuZyisVuxVxT8vPkG9sdtBzW_hRBipC10FE9C_8NzkfGHxr-cYn1GhB8pvKYndCLY3JrCkNbqKVAb6x7tL1ZPa3jI_5Gtw",
                    ].map((src, i) => (
                      <img
                        key={i}
                        className="w-16 h-16 rounded-full border-4 border-white object-cover"
                        alt={`Student ${i + 1}`}
                        src={src}
                      />
                    ))}
                    <div
                      className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center text-xs font-bold"
                      style={{ background: "#e2dfff", color: "#0f0069", fontFamily: "var(--font-label)" }}
                    >
                      +12
                    </div>
                  </div>
                </div>
              </div>
            </FadeContent>
          </div>
        </section>

        {/* ══════════ CTA ══════════ */}
        <FadeContent blur={false} duration={1000} delay={100}>
          <section
            className="mt-32 relative rounded-2xl overflow-hidden p-16 text-center"
            style={{ background: "#e8e8e8" }}
          >
            <div className="relative z-10 max-w-2xl mx-auto space-y-8">
              <h2
                className="text-5xl font-bold tracking-tight"
                style={{ fontFamily: "var(--font-headline)" }}
              >
                <SplitText text="Begin your next chapter." delay={30} />
              </h2>
              <p className="text-xl" style={{ color: "#4c4546", fontFamily: "var(--font-body)" }}>
                Join 50,000+ researchers, students, and lifelong learners building their digital legacy.
              </p>
              <div className="flex justify-center gap-4">
                <Magnet padding={30} className="block">
                  <Link href="/signup" className="block">
                    <BorderGlow color="#7671ff" className="block">
                      <button
                        className="bg-black text-white px-12 py-5 rounded-full font-bold text-xl shadow-xl"
                        style={{ fontFamily: "var(--font-label)" }}
                      >
                        Create Your Manuscript
                      </button>
                    </BorderGlow>
                  </Link>
                </Magnet>
              </div>
              <p
                className="text-xs uppercase tracking-[0.2em]"
                style={{ fontFamily: "var(--font-label)", color: "#4c4546" }}
              >
                Free 14-day trial · No credit card required
              </p>
            </div>
            <div className="absolute inset-0 opacity-5 pointer-events-none dot-pattern" />
          </section>
        </FadeContent>
      </main>

      {/* ══════════ FOOTER ══════════ */}
      <footer
        className="max-w-7xl mx-auto px-8 py-16 flex flex-col md:flex-row justify-between items-center border-t"
        style={{ borderColor: "rgba(207,196,197,0.2)" }}
      >
        <div className="mb-8 md:mb-0">
          <span
            className="text-2xl"
            style={{ fontFamily: "var(--font-headline)", fontStyle: "italic", color: "#1b1b1b" }}
          >
            Note-a-fly
          </span>
        </div>

        <div className="flex gap-12 text-sm uppercase tracking-widest" style={{ fontFamily: "var(--font-label)" }}>
          <Link href="/privacy" className="transition-colors" style={{ color: "#4c4546" }}>
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors" style={{ color: "#4c4546" }}>
            Terms
          </Link>
          <Link href="/api-docs" className="transition-colors" style={{ color: "#4c4546" }}>
            API
          </Link>
          <a
            href="https://x.com/noteafly"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors"
            style={{ color: "#4c4546" }}
          >
            Twitter
          </a>
        </div>

        <div className="mt-8 md:mt-0 text-xs" style={{ color: "#636262", fontFamily: "var(--font-label)" }}>
          © 2025 Note-a-fly
        </div>
      </footer>

      {/* ══════════ FLOATING AI BAR ══════════ */}
      <FloatingChatBar />
    </div>
  );
}