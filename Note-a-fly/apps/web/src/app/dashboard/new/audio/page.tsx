"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import NewSessionNav from "@/components/dashboard/new-session-nav";
import SplitText from "@/components/reactbits/SplitText";
import BlurText from "@/components/reactbits/BlurText";
import FadeContent from "@/components/reactbits/FadeContent";
import Magnet from "@/components/reactbits/Magnet";
import BorderGlow from "@/components/reactbits/BorderGlow";

type RecordingState = "idle" | "recording" | "paused" | "recorded";

const FEATURES = [
  { key: "record",    icon: "mic",           label: "Live Recording",  desc: "Crystal clear capture" },
  { key: "transcribe",icon: "hearing",       label: "AI Transcription",desc: "Powered by Whisper"    },
  { key: "notes",     icon: "auto_awesome",  label: "Smart Notes",     desc: "Auto-structured"       },
  { key: "duration",  icon: "timer",         label: "Up to 30 min",    desc: "Per recording"         },
];

const MAX_SECONDS = 1800; // 30 minutes
const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";

/* ── Waveform Bars ── */
function WaveformBars({ state }: { state: RecordingState }) {
  const barCount = 36;
  const factors = useRef(
    Array.from({ length: barCount }, () => ({
      maxH: 10 + Math.random() * 46,
      dur:  0.3 + Math.random() * 0.5,
      del:  Math.random() * 0.3,
    }))
  ).current;

  return (
    <div className="flex items-center justify-center gap-[3px] h-16 w-full max-w-md mx-auto">
      {factors.map((f, i) => (
        <motion.div
          key={i}
          className={cn(
            "w-[3px] rounded-full transition-colors duration-500",
            state === "recording" && "bg-[#7671ff]",
            state === "paused"    && "bg-[#1b1b1b]/35",
            state === "recorded"  && "bg-[#1b1b1b]/45",
            state === "idle"      && "bg-[#7671ff]/15"
          )}
          animate={
            state === "recording"
              ? { height: [4, f.maxH, 4] }
              : state === "paused"
              ? { height: [f.maxH * 0.25, f.maxH * 0.4, f.maxH * 0.25] }
              : state === "recorded"
              ? { height: f.maxH * 0.35 + 4 }
              : { height: 4 }
          }
          transition={
            state === "recording"
              ? { duration: f.dur, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut", delay: f.del }
              : state === "paused"
              ? { duration: 2.5, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut", delay: f.del }
              : state === "recorded"
              ? { duration: 0.5, ease: "easeOut", delay: i * 0.015 }
              : { duration: 0.4, ease: "easeOut", delay: i * 0.01 }
          }
        />
      ))}
    </div>
  );
}

/* ── Timer Display ── */
function TimerDisplay({ seconds, state }: { seconds: number; state: RecordingState }) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  const colorClass = cn(
    state === "recording" && "text-[#7671ff]",
    state === "paused"    && "text-[#1b1b1b]",
    state === "recorded"  && "text-[#1b1b1b]",
    state === "idle"      && "text-[#636262]/30"
  );

  return (
    <div className="flex items-center justify-center">
      <span className={cn("text-5xl font-bold tracking-wider tabular-nums font-[family-name:var(--font-label)]", colorClass)}>{mins}</span>
      <motion.span
        className={cn("text-5xl font-bold mx-0.5 font-[family-name:var(--font-label)]", colorClass)}
        animate={state === "recording" ? { opacity: [1, 0.2, 1] } : { opacity: 1 }}
        transition={state === "recording" ? { duration: 1, repeat: Infinity, ease: "easeInOut" } : {}}
      >:</motion.span>
      <span className={cn("text-5xl font-bold tracking-wider tabular-nums font-[family-name:var(--font-label)]", colorClass)}>{secs}</span>
    </div>
  );
}

export default function AudioRecordPage() {
  const router  = useRouter();
  const supabase = createClient();

  const [title,          setTitle]          = useState("");
  const [state,          setState]          = useState<RecordingState>("idle");
  const [seconds,        setSeconds]        = useState(0);
  const [status,         setStatus]         = useState("");
  const [isProcessing,   setIsProcessing]   = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [audioBlobUrl,   setAudioBlobUrl]   = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const audioBlobRef     = useRef<Blob | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const timerRef         = useRef<NodeJS.Timeout | null>(null);

  /* ── Timer ── */
  useEffect(() => {
    if (state === "recording") {
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            handleStop();
            return MAX_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Start recording ── */
  async function handleMicClick() {
    if (state !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        audioBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioBlobUrl(url);
      };

      recorder.start(250); // collect chunks every 250ms
      setState("recording");
      setSeconds(0);
      setStatus("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Microphone access denied";
      if (msg.toLowerCase().includes("denied") || msg.toLowerCase().includes("permission")) {
        setStatus("❌ Microphone permission denied. Please allow microphone access in your browser and try again.");
      } else {
        setStatus(`❌ Could not start recording: ${msg}`);
      }
    }
  }

  /* ── Pause ── */
  function handlePause() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
    }
    setState("paused");
  }

  /* ── Resume ── */
  function handleResume() {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
    }
    setState("recording");
  }

  /* ── Stop ── */
  function handleStop() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setState("recorded");
  }

  /* ── Discard ── */
  function handleDiscard() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    audioChunksRef.current   = [];
    audioBlobRef.current     = null;
    streamRef.current        = null;
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl);
      setAudioBlobUrl(null);
    }
    setState("idle");
    setSeconds(0);
    setStatus("");
  }

  /* ── Submit ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state !== "recorded" || isProcessing) return;
    if (!title.trim()) { setStatus("Please enter a session title"); return; }
    if (!audioBlobRef.current) { setStatus("❌ No audio recorded. Please try again."); return; }

    setIsProcessing(true);

    try {
      // 1. Auth
      setStatus("Authenticating...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("Please log in"); setIsProcessing(false); return; }

      // 2. Create session record
      setStatus("Creating session...");
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          user_id:        user.id,
          title:          title.trim(),
          source_type:    "audio",
          status:         "processing",
        })
        .select()
        .single();
      if (sessionError) throw new Error(sessionError.message);

      // 3. Upload audio to Supabase Storage
      setStatus("Uploading audio...");
      const ext      = audioBlobRef.current.type.includes("ogg") ? "ogg" : "webm";
      const filePath = `${user.id}/${session.id}/recording.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("audio-files")
        .upload(filePath, audioBlobRef.current, {
          contentType: audioBlobRef.current.type,
          upsert: true,
        });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // 4. Get public URL
      const { data: urlData } = supabase.storage
        .from("audio-files")
        .getPublicUrl(filePath);
      const audioUrl = urlData.publicUrl;

      // 5. Transcribe via FastAPI Whisper
      setStatus("🎙️ Transcribing audio with Whisper...");
      const audioFile = new File(
        [audioBlobRef.current],
        `recording.${ext}`,
        { type: audioBlobRef.current.type }
      );
      const formData = new FormData();
      formData.append("audio", audioFile);

      const transcribeRes = await fetch(`${AI_SERVICE_URL}/api/transcribe`, {
        method: "POST",
        body: formData,
      });
      if (!transcribeRes.ok) {
        const err = await transcribeRes.json();
        throw new Error(err.detail || "Transcription failed");
      }
      const { text: transcript } = await transcribeRes.json();

      // 6. Save transcript to session
      await supabase
        .from("sessions")
        .update({ raw_transcript: transcript })
        .eq("id", session.id);

      // 7. Process with AI
      setStatus("🤖 AI is generating notes, flashcards, quiz...");
      const processRes = await fetch(`${AI_SERVICE_URL}/api/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id:  session.id,
          source_type: "audio",
          content:     transcript,
          user_id:     user.id,
        }),
      });
      if (!processRes.ok) {
        const err = await processRes.json();
        throw new Error(err.detail || "AI processing failed");
      }

      setStatus("✅ Done! Redirecting...");
      setIsProcessing(false);
      router.push(`/dashboard/session/${session.id}`);
      router.refresh();

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      console.error("Audio submit error:", err);
      setStatus(`❌ Error: ${message}`);
      setIsProcessing(false);
    }
  }

  const canSubmit = state === "recorded" && !isProcessing && title.trim().length > 0;

  const stateConfig = {
    idle:     { label: "READY",     color: "#636262", dot: "bg-[#636262]/40" },
    recording:{ label: "RECORDING", color: "#7671ff", dot: "bg-[#7671ff]"    },
    paused:   { label: "PAUSED",    color: "#1b1b1b", dot: "bg-[#1b1b1b]"   },
    recorded: { label: "CAPTURED",  color: "#1b1b1b", dot: "bg-[#1b1b1b]"   },
  };
  const cfg = stateConfig[state];

  return (
    <div className="bg-[#f9f9f9] min-h-screen">
      <NewSessionNav isProcessing={isProcessing} />

      <div className="mb-2">
        <h1 className="text-4xl text-[#1b1b1b] font-[family-name:var(--font-headline)] pr-2">
          <SplitText
            text="Record Your Lecture"
            delay={35}
            animationFrom={{ opacity: 0, transform: "translate3d(0,30px,0)" }}
            animationTo={{ opacity: 1, transform: "translate3d(0,0,0)" }}
          />
        </h1>
      </div>
      <div className="mb-8">
        <BlurText
          text="Capture audio and let AI generate study materials automatically."
          delay={20}
          animateBy="words"
          className="text-[#5f5e5e] font-[family-name:var(--font-body)]"
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
            <div
              key={chip.label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#eeeeee] rounded-full text-xs text-[#636262] font-[family-name:var(--font-label)] gel-shadow"
            >
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

      <form onSubmit={handleSubmit}>
        <FadeContent blur duration={700} delay={300}>
          <BorderGlow borderRadius="2rem" speed={state === "recording" ? 3 : 6} borderWidth={state === "recording" ? 3 : 1.5}>
            <div className="bg-white border border-[#eeeeee] rounded-[2rem] px-6 md:px-10 py-8 pb-10">
              <div className="max-w-3xl mx-auto space-y-6">

                {/* Session Title */}
                <motion.div className="space-y-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}>
                  <label htmlFor="audio-title" className="text-sm font-semibold text-[#1b1b1b] font-[family-name:var(--font-label)]">
                    Session Title
                  </label>
                  <input
                    id="audio-title"
                    type="text"
                    placeholder="e.g., Operating Systems Lecture 4"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isProcessing || state === "recording"}
                    className={cn(
                      "w-full h-12 px-4 rounded-2xl border bg-[#f9f9f9]",
                      "font-[family-name:var(--font-body)] text-sm text-[#1b1b1b]",
                      "placeholder:text-[#636262]/50 outline-none",
                      "focus:border-[#7671ff] focus:ring-2 focus:ring-[#7671ff]/20",
                      "transition-all duration-300 border-[#e8e8e8] disabled:opacity-50"
                    )}
                  />
                </motion.div>

                {/* Recording Zone */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.45 }}>
                  <div className={cn(
                    "relative rounded-3xl p-8 md:p-12 transition-all duration-700 overflow-hidden",
                    state === "idle"      && "bg-[#fcfcfc] border-2 border-dashed border-[#d8d8d8]",
                    state === "recording" && "bg-[#faf9ff] border-2 border-[#7671ff]/30 shadow-inner shadow-[#7671ff]/5",
                    state === "paused"    && "bg-[#f6f6f6] border-2 border-[#e8e8e8]",
                    state === "recorded"  && "bg-[#f7f7f7] border-2 border-[#e8e8e8]"
                  )}>
                    {/* Status Indicator */}
                    <div className="absolute top-5 right-6 flex items-center gap-2">
                      <motion.div
                        className={cn("w-2.5 h-2.5 rounded-full", cfg.dot)}
                        animate={state === "recording" ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] } : {}}
                        transition={state === "recording" ? { duration: 1, repeat: Infinity } : {}}
                      />
                      <span className="text-[11px] font-bold tracking-widest font-[family-name:var(--font-label)]" style={{ color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                      {/* Mic Button */}
                      <div className="relative flex items-center justify-center my-2">
                        <AnimatePresence>
                          {state === "recording" && [0, 1, 2].map((i) => (
                            <motion.div
                              key={`ring-${i}`}
                              className="absolute w-28 h-28 rounded-full border-2 border-[#7671ff]/20"
                              initial={{ scale: 1, opacity: 0 }}
                              animate={{ scale: [1, 1.6 + i * 0.3], opacity: [0.5, 0] }}
                              exit={{ opacity: 0, scale: 2.5 }}
                              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
                            />
                          ))}
                        </AnimatePresence>

                        {state === "idle" && (
                          <motion.div
                            className="absolute w-28 h-28 rounded-full border-2 border-[#7671ff]/15"
                            animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.1, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          />
                        )}

                        {state === "recorded" && (
                          <motion.div
                            className="absolute w-28 h-28 rounded-full border-2 border-[#1b1b1b]/10"
                            animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.2, 0.4] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          />
                        )}

                        <Magnet padding={30} magnetStrength={0.12} disabled={state !== "idle"}>
                          <motion.button
                            type="button"
                            onClick={handleMicClick}
                            disabled={state !== "idle"}
                            whileHover={state === "idle" ? { scale: 1.08 } : {}}
                            whileTap={state === "idle" ? { scale: 0.93 } : {}}
                            animate={
                              state === "recording" ? { scale: [1, 1.05, 1] }
                              : state === "idle"    ? { y: [0, -5, 0] }
                              : {}
                            }
                            transition={
                              state === "recording" ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                              : state === "idle"    ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
                              : {}
                            }
                            className={cn(
                              "relative w-28 h-28 rounded-full flex items-center justify-center z-10 transition-all duration-500",
                              state === "idle"      && "bg-[#e2dfff] border border-[#d8d4ff] hover:bg-[#c3c0ff] cursor-pointer shadow-lg shadow-[#7671ff]/10",
                              state === "recording" && "bg-[#7671ff] shadow-xl shadow-[#7671ff]/30 cursor-default",
                              state === "paused"    && "bg-[#f3f3f3] border border-[#e8e8e8] shadow-lg cursor-default",
                              state === "recorded"  && "bg-[#f3f3f3] border border-[#e8e8e8] shadow-lg cursor-default"
                            )}
                          >
                            <span
                              className={cn(
                                "material-symbols-outlined relative z-10 transition-colors duration-300",
                                state === "idle"      && "text-[#7671ff]",
                                state === "recording" && "text-white",
                                state === "paused"    && "text-[#1b1b1b]",
                                state === "recorded"  && "text-[#1b1b1b]"
                              )}
                              style={{ fontSize: "48px" }}
                            >
                              {state === "recorded" ? "check" : state === "recording" ? "graphic_eq" : "mic"}
                            </span>
                          </motion.button>
                        </Magnet>
                      </div>

                      {/* State text */}
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={state}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.35 }}
                          className="text-center space-y-1.5"
                        >
                          <p className="text-xl font-semibold text-[#1b1b1b] font-[family-name:var(--font-headline)]">
                            {state === "idle"      && "Record Your Lecture"}
                            {state === "recording" && "Recording in Progress"}
                            {state === "paused"    && "Recording Paused"}
                            {state === "recorded"  && "Recording Captured"}
                          </p>
                          <p className="text-sm text-[#636262] font-[family-name:var(--font-body)] max-w-md mx-auto">
                            {state === "idle"      && "Tap the microphone to start recording your lecture, discussion, or revision session."}
                            {state === "recording" && "Your audio is being captured. Pause or stop when you're done."}
                            {state === "paused"    && "Recording paused. Resume to continue or finish recording."}
                            {state === "recorded"  && `${Math.floor(seconds / 60)}m ${seconds % 60}s of audio captured and ready for AI processing.`}
                          </p>
                        </motion.div>
                      </AnimatePresence>

                      <WaveformBars state={state} />
                      <TimerDisplay seconds={seconds} state={state} />

                      {/* Controls */}
                      <AnimatePresence mode="wait">
                        {state === "recording" && (
                          <motion.div key="ctrl-recording" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="flex items-center gap-3 pt-2 flex-wrap justify-center">
                            <motion.button type="button" onClick={handlePause} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-full bg-white border border-[#e8e8e8] text-[#1b1b1b] text-sm font-semibold font-[family-name:var(--font-label)] hover:bg-[#f3f3f3] transition-all duration-300")}>
                              <span className="material-symbols-outlined text-[#7671ff]" style={{ fontSize: "18px" }}>pause</span>
                              Pause
                            </motion.button>
                            <motion.button type="button" onClick={handleStop} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1b1b1b] text-white text-sm font-semibold font-[family-name:var(--font-label)] hover:bg-black transition-all duration-300")}>
                              <span className="material-symbols-outlined text-white" style={{ fontSize: "18px" }}>stop</span>
                              Stop
                            </motion.button>
                          </motion.div>
                        )}

                        {state === "paused" && (
                          <motion.div key="ctrl-paused" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="flex items-center gap-3 pt-2 flex-wrap justify-center">
                            <motion.button type="button" onClick={handleResume} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1b1b1b] text-white text-sm font-semibold font-[family-name:var(--font-label)] hover:bg-black transition-all duration-300">
                              <span className="material-symbols-outlined text-white" style={{ fontSize: "18px" }}>play_arrow</span>
                              Resume
                            </motion.button>
                            <motion.button type="button" onClick={handleStop} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white border border-[#e8e8e8] text-[#1b1b1b] text-sm font-semibold font-[family-name:var(--font-label)] hover:bg-[#f3f3f3] transition-all duration-300">
                              <span className="material-symbols-outlined text-[#7671ff]" style={{ fontSize: "18px" }}>check</span>
                              Finish
                            </motion.button>
                            <motion.button type="button" onClick={handleDiscard} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#e8e8e8] text-[#636262] text-sm font-medium font-[family-name:var(--font-label)] hover:bg-[#f3f3f3] transition-all duration-300">
                              <span className="material-symbols-outlined text-[#636262]" style={{ fontSize: "16px" }}>delete</span>
                              Discard
                            </motion.button>
                          </motion.div>
                        )}

                        {state === "recorded" && (
                          <motion.div key="ctrl-recorded" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="flex items-center gap-3 pt-2 flex-wrap justify-center">
                            <motion.button type="button" onClick={handleDiscard} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border border-[#e8e8e8] text-[#636262] text-sm font-medium font-[family-name:var(--font-label)] hover:bg-[#f3f3f3] transition-all duration-300">
                              <span className="material-symbols-outlined text-[#636262]" style={{ fontSize: "16px" }}>restart_alt</span>
                              Discard & Restart
                            </motion.button>
                          </motion.div>
                        )}

                        {state === "idle" && (
                          <motion.div key="ctrl-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-1">
                            <p className="text-xs text-[#636262]/60 font-[family-name:var(--font-label)]">Max 30 minutes per recording</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>

                {/* Status message */}
                <AnimatePresence mode="wait">
                  {status && (
                    <motion.div
                      key={status}
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.25 }}
                      className={cn(
                        "text-sm p-4 rounded-2xl font-[family-name:var(--font-body)] flex items-center gap-3",
                        status.includes("❌") && "bg-red-50 text-red-700 border border-red-100",
                        status.includes("✅") && "bg-green-50 text-green-700 border border-green-100",
                        !status.includes("❌") && !status.includes("✅") && "bg-[#f3f3f3] text-[#5f5e5e]"
                      )}
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
                        className={cn(
                          "w-full h-14 px-6 rounded-2xl text-base font-medium font-[family-name:var(--font-body)] transition-all duration-300 flex items-center justify-center gap-2.5",
                          canSubmit ? "bg-[#1b1b1b] hover:bg-black text-white cursor-pointer" : "bg-[#eeeeee] text-[#636262] cursor-not-allowed"
                        )}
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Transcribing & generating...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>auto_awesome</span>
                            {state === "recorded" ? "Generate Notes with AI" : "Record audio first"}
                          </>
                        )}
                      </motion.button>
                    </BorderGlow>
                  </Magnet>
                </motion.div>

                {!canSubmit && !isProcessing && state === "recorded" && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-xs text-[#636262] font-[family-name:var(--font-body)]">
                    {!title.trim() ? "Add a session title to continue" : ""}
                  </motion.p>
                )}
              </div>
            </div>
          </BorderGlow>
        </FadeContent>

        {/* Feature Cards */}
        <FadeContent blur duration={600} delay={500}>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {FEATURES.map((ft, i) => {
              const isHovered = hoveredFeature === ft.key;
              return (
                <motion.div key={ft.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 + i * 0.08 }} className="w-full">
                  <Magnet padding={10} magnetStrength={0.06} className="block w-full">
                    <motion.div
                      whileHover={{ y: -4, scale: 1.02 }}
                      onMouseEnter={() => setHoveredFeature(ft.key)}
                      onMouseLeave={() => setHoveredFeature(null)}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="relative flex flex-col items-center justify-center gap-3 w-full h-[140px] p-5 rounded-2xl border border-[#eeeeee] gel-shadow cursor-default overflow-hidden"
                      style={{ backgroundColor: isHovered ? "#1b1b1b" : "#ffffff", transition: "background-color 0.35s ease" }}
                    >
                      <div className="relative z-10 w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: isHovered ? "rgba(255,255,255,0.15)" : "#eeeeee", transition: "background-color 0.35s ease" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "24px", color: isHovered ? "#ffffff" : "#7671ff", transition: "color 0.35s ease" }}>{ft.icon}</span>
                      </div>
                      <span className="relative z-10 text-sm font-semibold font-[family-name:var(--font-label)]" style={{ color: isHovered ? "#ffffff" : "#1b1b1b", transition: "color 0.35s ease" }}>{ft.label}</span>
                      <span className="relative z-10 text-[10px] font-[family-name:var(--font-label)]" style={{ color: isHovered ? "rgba(255,255,255,0.6)" : "#636262", transition: "color 0.35s ease" }}>{ft.desc}</span>
                    </motion.div>
                  </Magnet>
                </motion.div>
              );
            })}
          </div>
        </FadeContent>
      </form>
    </div>
  );
}