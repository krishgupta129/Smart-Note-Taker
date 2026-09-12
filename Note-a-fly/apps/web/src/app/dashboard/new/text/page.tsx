"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import NewSessionNav from "@/components/dashboard/new-session-nav";
import SplitText from "@/components/reactbits/SplitText";
import BlurText from "@/components/reactbits/BlurText";
import FadeContent from "@/components/reactbits/FadeContent";
import Magnet from "@/components/reactbits/Magnet";
import BorderGlow from "@/components/reactbits/BorderGlow";
import { motion, AnimatePresence } from "framer-motion";

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";

// Client-side YouTube URL detection
function detectYouTubeUrl(text: string): boolean {
  const patterns = [
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[\w-]+/,
  ];
  return patterns.some((p) => p.test(text.trim()));
}

export default function TextPastePage() {
  const [title,        setTitle]        = useState("");
  const [content,      setContent]      = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [status,       setStatus]       = useState("");

  const router   = useRouter();
  const supabase = createClient();

  const isYouTube  = detectYouTubeUrl(content);
  const sourceType = isYouTube ? "youtube" : "text";

  // Validation: YouTube URLs bypass the 50 char minimum
  const contentValid = isYouTube || content.trim().length >= 50;
  const canSubmit    = !isProcessing && title.trim().length > 0 && contentValid;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isProcessing) return;

    if (!title.trim()) {
      setStatus("Please enter a session title");
      return;
    }

    if (!isYouTube && content.trim().length < 50) {
      setStatus("Please enter at least 50 characters of content");
      return;
    }

    setIsProcessing(true);
    setStatus(isYouTube ? "Validating YouTube URL..." : "Creating session...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("Please log in"); setIsProcessing(false); return; }

      setStatus("Saving to database...");
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          user_id:        user.id,
          title:          title.trim(),
          source_type:    sourceType,
          raw_transcript: isYouTube ? "" : content.trim(),
          status:         "processing",
        })
        .select()
        .single();
      if (sessionError) throw new Error(sessionError.message);

      setStatus(
        isYouTube
          ? "🎥 Extracting YouTube transcript..."
          : "🤖 AI is generating notes, flashcards, quiz..."
      );

      const response = await fetch(`${AI_SERVICE_URL}/api/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id:  session.id,
          source_type: sourceType,
          content:     content.trim(), // URL for youtube, text for text
          user_id:     user.id,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "AI processing failed");
      }

      setStatus("✅ Done! Redirecting...");
      setIsProcessing(false);
      router.push(`/dashboard/session/${session.id}`);
      router.refresh();

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      console.error("Submit error:", err);
      setStatus(`❌ Error: ${message}`);
      setIsProcessing(false);
    }
  }

  return (
    <div className="bg-[#f9f9f9] min-h-screen">
      <NewSessionNav isProcessing={isProcessing} />

      <div className="mb-8">
        <h1 className="text-4xl text-[#1b1b1b] font-[family-name:var(--font-headline)] pr-2">
          <SplitText
            text={isYouTube ? "Process YouTube Video" : "Paste Your Content"}
            delay={35}
            animationFrom={{ opacity: 0, transform: "translate3d(0,30px,0)" }}
            animationTo={{ opacity: 1, transform: "translate3d(0,0,0)" }}
          />
        </h1>
        <BlurText
          text={isYouTube ? "Extract the transcript and generate study materials automatically." : "Transform your text into structured study materials with AI."}
          delay={20}
          animateBy="words"
          className="text-[#5f5e5e] mt-2 font-[family-name:var(--font-body)]"
        />
      </div>

      {/* Output pills */}
      <FadeContent blur duration={600} delay={200}>
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { icon: "article",      label: "Structured Notes" },
            { icon: "style",        label: "Flashcards"       },
            { icon: "quiz",         label: "Exam Questions"   },
            { icon: "account_tree", label: "Mindmap"          },
          ].map((chip) => (
            <div key={chip.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#eeeeee] rounded-full text-xs text-[#636262] font-[family-name:var(--font-label)] gel-shadow">
              <span className="material-symbols-outlined text-[#7671ff]" style={{ fontSize: "14px" }}>{chip.icon}</span>
              {chip.label}
            </div>
          ))}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e2dfff] border border-[#c3c0ff]/30 rounded-full text-xs text-[#0f0069] font-[family-name:var(--font-label)]">
            <span className="material-symbols-outlined text-[#7671ff]" style={{ fontSize: "14px" }}>auto_awesome</span>
            All generated automatically
          </div>
        </div>
      </FadeContent>

      <FadeContent blur duration={700} delay={300}>
        <BorderGlow borderRadius="2rem" speed={6} borderWidth={1.5}>
          <form onSubmit={handleSubmit} className="bg-white border border-[#eeeeee] rounded-[2rem] px-6 md:px-10 py-8 pb-10">
            <div className="max-w-3xl mx-auto space-y-6">

              {/* Session Title */}
              <motion.div className="space-y-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}>
                <Label htmlFor="title" className="font-[family-name:var(--font-label)] text-[#1b1b1b]">Session Title</Label>
                <Input
                  id="title"
                  placeholder={isYouTube ? "e.g., MIT Lecture — Neural Networks" : "e.g., Biology Lecture 5 — Cell Division"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isProcessing}
                  className="h-12 rounded-2xl border-[#e8e8e8] font-[family-name:var(--font-body)] focus:border-[#7671ff] focus:ring-[#7671ff]/20 transition-colors"
                />
              </motion.div>

              {/* Content / YouTube URL */}
              <motion.div className="space-y-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.45 }}>
                <div className="flex items-center justify-between">
                  <Label htmlFor="content" className="font-[family-name:var(--font-label)] text-[#1b1b1b]">
                    {isYouTube ? "YouTube URL" : "Content"}
                  </Label>

                  <AnimatePresence mode="wait">
                    {isYouTube ? (
                      <motion.div
                        key="yt-badge"
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold"
                        style={{ background: "#e2dfff", color: "#0f0069", fontFamily: "var(--font-label)" }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "12px", fontVariationSettings: "'FILL' 1" }}>smart_display</span>
                        YouTube detected
                      </motion.div>
                    ) : (
                      <motion.span
                        key="char-count"
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-[family-name:var(--font-label)] transition-colors ${
                          content.length >= 50 ? "bg-green-100 text-green-700" : "bg-[#eeeeee] text-[#636262]"
                        }`}
                      >
                        {content.length >= 50 ? `${content.length} chars ✓` : `${content.length} / 50 min`}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                <Textarea
                  id="content"
                  placeholder={
                    isYouTube
                      ? "YouTube URL detected — transcript will be extracted automatically"
                      : "Paste your lecture notes, textbook content, or any study material here... or paste a YouTube URL to extract its transcript"
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={`min-h-[250px] resize-y rounded-2xl border-[#e8e8e8] font-[family-name:var(--font-body)] focus:border-[#7671ff] focus:ring-[#7671ff]/20 transition-colors ${
                    isYouTube ? "min-h-[80px] text-[#7671ff] font-medium" : ""
                  }`}
                  disabled={isProcessing}
                />

                {/* YouTube helper */}
                <AnimatePresence>
                  {isYouTube && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="flex items-start gap-2 px-4 py-3 rounded-2xl"
                      style={{ background: "#e2dfff" }}
                    >
                      <span className="material-symbols-outlined text-[#7671ff] mt-0.5" style={{ fontSize: "16px", fontVariationSettings: "'FILL' 1" }}>info</span>
                      <p className="text-xs leading-relaxed" style={{ color: "#0f0069", fontFamily: "var(--font-body)" }}>
                        Note-a-fly will extract the video transcript automatically. If no transcript is available, local Whisper will transcribe the audio (videos under 25 minutes only).
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Status */}
              <AnimatePresence mode="wait">
                {status && (
                  <motion.div
                    key={status}
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                    className={`text-sm p-4 rounded-2xl font-[family-name:var(--font-body)] flex items-center gap-3 ${
                      status.includes("❌") ? "bg-red-50 text-red-700 border border-red-100"
                      : status.includes("✅") ? "bg-green-50 text-green-700 border border-green-100"
                      : "bg-[#f3f3f3] text-[#5f5e5e]"
                    }`}
                  >
                    {isProcessing && !status.includes("❌") && !status.includes("✅") && (
                      <div className="w-4 h-4 border-2 border-[#7671ff] border-t-transparent rounded-full animate-spin shrink-0" />
                    )}
                    {status}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.55 }}>
                <Magnet padding={canSubmit ? 30 : 0} magnetStrength={0.15}>
                  <BorderGlow borderRadius="1rem" speed={4} borderWidth={canSubmit ? 2 : 0}>
                    <motion.button
                      type="submit"
                      disabled={!canSubmit}
                      whileHover={canSubmit ? { scale: 1.01 } : {}}
                      whileTap={canSubmit ? { scale: 0.98 } : {}}
                      className={`w-full h-14 px-6 rounded-2xl font-[family-name:var(--font-body)] text-base font-medium transition-all duration-300 flex items-center justify-center gap-2.5 ${
                        canSubmit ? "bg-[#1b1b1b] hover:bg-black text-white cursor-pointer" : "bg-[#eeeeee] text-[#636262] cursor-not-allowed"
                      }`}
                    >
                      {isProcessing ? (
                        <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />{isYouTube ? "Extracting transcript..." : "AI is processing..."}</>
                      ) : (
                        <><span className="material-symbols-outlined" style={{ fontSize: "20px" }}>{isYouTube ? "smart_display" : "auto_awesome"}</span>{isYouTube ? "Generate from YouTube" : "Generate Notes with AI"}</>
                      )}
                    </motion.button>
                  </BorderGlow>
                </Magnet>
              </motion.div>

              {/* Helper */}
              {!canSubmit && !isProcessing && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-xs text-[#636262] font-[family-name:var(--font-body)]">
                  {!title.trim()
                    ? "Add a session title to continue"
                    : !isYouTube && content.length < 50
                    ? `Add ${50 - content.length} more characters to enable AI generation`
                    : ""}
                </motion.p>
              )}
            </div>
          </form>
        </BorderGlow>
      </FadeContent>
    </div>
  );
}