"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import NewSessionNav from "@/components/dashboard/new-session-nav";
import SplitText from "@/components/reactbits/SplitText";
import BlurText from "@/components/reactbits/BlurText";
import FadeContent from "@/components/reactbits/FadeContent";
import Magnet from "@/components/reactbits/Magnet";
import BorderGlow from "@/components/reactbits/BorderGlow";

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";

const FILE_TYPES = [
  { key: "pdf",  label: "PDF",        icon: "picture_as_pdf", ext: ".pdf",       color: "#ef4444", bgColor: "#fef2f2" },
  { key: "pptx", label: "PowerPoint", icon: "slideshow",      ext: ".pptx",      color: "#f97316", bgColor: "#fff7ed" },
  { key: "docx", label: "Word",       icon: "description",    ext: ".docx",      color: "#3b82f6", bgColor: "#eff6ff" },
  { key: "txt",  label: "Text",       icon: "text_snippet",   ext: ".txt",       color: "#10b981", bgColor: "#ecfdf5" },
];

const ACCEPTED = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

const MAX_SIZE = 25 * 1024 * 1024;

// Map file extension to source_type expected by FastAPI
function getSourceType(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf")  return "pdf";
  if (ext === "pptx") return "pptx";
  if (ext === "docx") return "docx";
  if (ext === "txt")  return "txt";
  return "pdf";
}

function FloatingParticles({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2rem]">
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-[#7671ff]/25"
          initial={{ x: `${15 + Math.random() * 70}%`, y: "110%", scale: 0.4 + Math.random() * 0.6 }}
          animate={{ y: "-10%", opacity: [0, 0.7, 0], rotate: Math.random() * 360 }}
          transition={{ duration: 1.8 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 1.5, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeMeta(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return FILE_TYPES.find((ft) => ft.key === ext) ?? FILE_TYPES[0];
}

export default function UploadFilePage() {
  const router   = useRouter();
  const supabase = createClient();

  const [files,        setFiles]        = useState<File[]>([]);
  const [title,        setTitle]        = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [status,       setStatus]       = useState("");
  const [hoveredType,  setHoveredType]  = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setStatus("");
    if (acceptedFiles.length > 0 && !title) {
      const name = acceptedFiles[0].name.replace(/\.[^/.]+$/, "");
      setTitle(name.replace(/[-_]/g, " "));
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive, isDragReject, open } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: MAX_SIZE,
    multiple: false,
    noClick: false,
    onDropRejected: (rejections) => {
      const err = rejections[0]?.errors[0];
      if (err?.code === "file-too-large") {
        setStatus("❌ File is too large. Maximum size is 25 MB.");
      } else if (err?.code === "file-invalid-type") {
        setStatus("❌ Unsupported file type. Use PDF, PPTX, DOCX, or TXT.");
      } else {
        setStatus(`❌ ${err?.message || "File rejected"}`);
      }
    },
  });

  const removeFile = () => { setFiles([]); setStatus(""); };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length || isProcessing) return;
    if (!title.trim()) { setStatus("Please enter a session title"); return; }

    setIsProcessing(true);

    try {
      // 1. Auth
      setStatus("Authenticating...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("Please log in"); setIsProcessing(false); return; }

      const file       = files[0];
      const sourceType = getSourceType(file);
      const ext        = file.name.split(".").pop()?.toLowerCase() ?? "pdf";

      // 2. Create session record
      setStatus("Creating session...");
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          user_id:     user.id,
          title:       title.trim(),
          source_type: sourceType,
          status:      "processing",
        })
        .select()
        .single();
      if (sessionError) throw new Error(sessionError.message);

      // 3. Upload file to Supabase Storage
      setStatus("Uploading file...");
      const filePath = `${user.id}/${session.id}/upload.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("uploaded-files")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
        });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // 4. Get public URL
      const { data: urlData } = supabase.storage
        .from("uploaded-files")
        .getPublicUrl(filePath);
      const fileUrl = urlData.publicUrl;

      // 5. Process with AI
      setStatus("🤖 AI is processing your document...");
      const processRes = await fetch(`${AI_SERVICE_URL}/api/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id:  session.id,
          source_type: sourceType,
          file_url:    fileUrl,
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
      console.error("Upload submit error:", err);
      setStatus(`❌ Error: ${message}`);
      setIsProcessing(false);
    }
  }

  const canSubmit        = !isProcessing && files.length > 0 && title.trim().length > 0;
  const hasFile          = files.length > 0;
  const currentFileType  = hasFile ? getFileTypeMeta(files[0]) : null;

  return (
    <div className="bg-[#f9f9f9] min-h-screen">
      <NewSessionNav isProcessing={isProcessing} />

      <div className="mb-2">
        <h1 className="text-4xl text-[#1b1b1b] font-[family-name:var(--font-headline)] pr-2">
          <SplitText text="Upload Your Files" delay={35} animationFrom={{ opacity: 0, transform: "translate3d(0,30px,0)" }} animationTo={{ opacity: 1, transform: "translate3d(0,0,0)" }} />
        </h1>
      </div>
      <div className="mb-8">
        <BlurText text="Process PDFs, slides, and documents with AI." delay={20} animateBy="words" className="text-[#5f5e5e] font-[family-name:var(--font-body)]" />
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

      <form onSubmit={handleSubmit}>
        <FadeContent blur duration={700} delay={300}>
          <BorderGlow borderRadius="2rem" speed={6} borderWidth={isDragActive ? 3 : 1.5}>
            <div className="bg-white border border-[#eeeeee] rounded-[2rem] px-6 md:px-10 py-8 pb-10">
              <div className="max-w-3xl mx-auto space-y-6">

                {/* Session Title */}
                <motion.div className="space-y-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}>
                  <label htmlFor="upload-title" className="text-sm font-semibold text-[#1b1b1b] font-[family-name:var(--font-label)]">Session Title</label>
                  <input
                    id="upload-title"
                    type="text"
                    placeholder="e.g., Chapter 12 — Organic Chemistry"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isProcessing}
                    className={cn(
                      "w-full h-12 px-4 rounded-2xl border bg-[#f9f9f9]",
                      "font-[family-name:var(--font-body)] text-sm text-[#1b1b1b]",
                      "placeholder:text-[#636262]/50 outline-none",
                      "focus:border-[#7671ff] focus:ring-2 focus:ring-[#7671ff]/20",
                      "transition-all duration-300 border-[#e8e8e8] disabled:opacity-50"
                    )}
                  />
                </motion.div>

                {/* Dropzone */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.45 }}>
                  <div
                    {...getRootProps()}
                    className={cn(
                      "relative rounded-[2rem] border-2 border-dashed p-12 md:p-16 text-center cursor-pointer transition-all duration-500 group",
                      isDragActive && !isDragReject && "border-[#7671ff] bg-[#e2dfff]/20 scale-[1.01]",
                      isDragReject                   && "border-[#ba1a1a] bg-red-50/30 scale-[0.99]",
                      !isDragActive && !isDragReject && !hasFile && "border-[#d8d8d8] bg-[#fcfcfc] hover:border-[#7671ff]/50 hover:bg-[#e2dfff]/10",
                      hasFile && "border-[#7671ff]/40 bg-[#e2dfff]/10"
                    )}
                  >
                    <input {...getInputProps()} />
                    <FloatingParticles active={isDragActive && !isDragReject} />

                    <AnimatePresence mode="wait">
                      {hasFile ? (
                        <motion.div key="file-preview" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.4, ease: "easeOut" }} className="flex flex-col items-center gap-5">
                          <motion.div className="relative" animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ backgroundColor: currentFileType?.bgColor }}>
                              <span className="material-symbols-outlined" style={{ fontSize: "36px", color: currentFileType?.color }}>{currentFileType?.icon}</span>
                            </div>
                            <motion.div className="absolute inset-0 rounded-2xl border-2" style={{ borderColor: currentFileType?.color }} animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
                          </motion.div>
                          <div className="space-y-1.5">
                            <p className="text-base font-semibold text-[#1b1b1b] font-[family-name:var(--font-label)]">{files[0].name}</p>
                            <div className="flex items-center justify-center gap-3">
                              <span className="text-xs px-2.5 py-1 rounded-full font-medium font-[family-name:var(--font-label)]" style={{ backgroundColor: currentFileType?.bgColor, color: currentFileType?.color }}>{currentFileType?.label}</span>
                              <span className="text-xs text-[#636262] font-[family-name:var(--font-label)]">{formatSize(files[0].size)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <motion.button type="button" onClick={(e) => { e.stopPropagation(); removeFile(); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-[#ba1a1a] bg-red-50 border border-red-100 hover:bg-red-100 transition-all duration-300 font-[family-name:var(--font-label)]">
                              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>
                              Remove
                            </motion.button>
                            <motion.button type="button" onClick={(e) => { e.stopPropagation(); open(); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-[#7671ff] bg-[#e2dfff] border border-[#c3c0ff]/30 hover:bg-[#c3c0ff]/40 transition-all duration-300 font-[family-name:var(--font-label)]">
                              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>swap_horiz</span>
                              Replace
                            </motion.button>
                          </div>
                        </motion.div>

                      ) : isDragReject ? (
                        <motion.div key="reject" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-4">
                          <motion.div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center" animate={{ rotate: [0, -8, 8, -4, 4, 0] }} transition={{ duration: 0.6, repeat: 2 }}>
                            <span className="material-symbols-outlined text-[#ba1a1a]" style={{ fontSize: "36px" }}>block</span>
                          </motion.div>
                          <div className="space-y-1">
                            <p className="text-base font-semibold text-[#ba1a1a] font-[family-name:var(--font-label)]">Unsupported File</p>
                            <p className="text-sm text-[#636262] font-[family-name:var(--font-body)]">Please use PDF, PPTX, DOCX, or TXT</p>
                          </div>
                        </motion.div>

                      ) : isDragActive ? (
                        <motion.div key="drag-active" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-4 relative z-10">
                          <motion.div className="w-20 h-20 rounded-full bg-[#e2dfff] flex items-center justify-center" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                            <span className="material-symbols-outlined text-[#7671ff]" style={{ fontSize: "36px" }}>download</span>
                          </motion.div>
                          <div className="space-y-1">
                            <p className="text-lg font-semibold text-[#7671ff] font-[family-name:var(--font-label)]">Drop it right here!</p>
                            <p className="text-sm text-[#636262] font-[family-name:var(--font-body)]">Release to upload your file</p>
                          </div>
                        </motion.div>

                      ) : (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5 py-4">
                          <motion.div className="relative" animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                            <div className="w-20 h-20 rounded-3xl bg-[#e2dfff] flex items-center justify-center">
                              <span className="material-symbols-outlined text-[#7671ff]" style={{ fontSize: "40px" }}>cloud_upload</span>
                            </div>
                            <motion.div className="absolute inset-0 rounded-3xl border-2 border-[#7671ff]/20" animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 3, repeat: Infinity }} />
                          </motion.div>
                          <div className="space-y-1.5">
                            <p className="text-2xl font-semibold text-[#1b1b1b] font-[family-name:var(--font-headline)]">Drag & Drop Your Files</p>
                            <p className="text-sm text-[#5f5e5e] font-[family-name:var(--font-body)]">or click to browse from your computer</p>
                            <p className="text-xs text-[#636262]/70 font-[family-name:var(--font-label)] pt-1">Supports PDF, PPTX, DOCX, TXT · Max 25 MB</p>
                          </div>
                          <Magnet padding={20} magnetStrength={0.1}>
                            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex items-center gap-2 px-8 py-3 rounded-full bg-[#1b1b1b] text-white text-sm font-semibold font-[family-name:var(--font-body)] shadow-lg shadow-black/10 hover:shadow-xl hover:bg-black transition-all duration-300 cursor-pointer">
                              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>folder_open</span>
                              Browse Files
                            </motion.div>
                          </Magnet>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Status */}
                <AnimatePresence mode="wait">
                  {status && (
                    <motion.div key={status} initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.25 }}
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
                          <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing document...</>
                        ) : (
                          <><span className="material-symbols-outlined" style={{ fontSize: "20px" }}>auto_awesome</span>{hasFile ? "Generate Notes with AI" : "Select a file first"}</>
                        )}
                      </motion.button>
                    </BorderGlow>
                  </Magnet>
                </motion.div>

                {!canSubmit && !isProcessing && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-xs text-[#636262] font-[family-name:var(--font-body)]">
                    {!hasFile ? "Drag a file above or click Browse to get started" : !title.trim() ? "Add a session title to continue" : ""}
                  </motion.p>
                )}
              </div>
            </div>
          </BorderGlow>
        </FadeContent>

        {/* Format Cards */}
        <FadeContent blur duration={600} delay={500}>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {FILE_TYPES.map((ft, i) => (
              <motion.div key={ft.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 + i * 0.08 }} className="w-full">
                <Magnet padding={10} magnetStrength={0.06} className="block w-full">
                  <motion.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    onMouseEnter={() => setHoveredType(ft.key)}
                    onMouseLeave={() => setHoveredType(null)}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="relative flex flex-col items-center justify-center gap-3 w-full h-[140px] p-5 rounded-2xl cursor-default overflow-hidden gel-shadow"
                    style={{
                      backgroundColor: hoveredType === ft.key ? "#1b1b1b" : "#ffffff",
                      border: hoveredType === ft.key ? "1px solid #1b1b1b" : "1px solid #eeeeee",
                      transition: "background-color 0.3s ease, border-color 0.3s ease",
                    }}
                  >
                    <div className="relative z-10 w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: hoveredType === ft.key ? "rgba(255,255,255,0.1)" : "#e2dfff", transition: "background-color 0.3s ease" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "24px", color: hoveredType === ft.key ? "#ffffff" : "#7671ff", transition: "color 0.3s ease" }}>{ft.icon}</span>
                    </div>
                    <span className="relative z-10 text-sm font-semibold" style={{ fontFamily: "var(--font-label)", color: hoveredType === ft.key ? "#ffffff" : "#1b1b1b", transition: "color 0.3s ease" }}>{ft.label}</span>
                    <span className="relative z-10 text-[10px]" style={{ fontFamily: "var(--font-label)", color: hoveredType === ft.key ? "rgba(255,255,255,0.5)" : "#636262", transition: "color 0.3s ease" }}>{ft.ext}</span>
                  </motion.div>
                </Magnet>
              </motion.div>
            ))}
          </div>
        </FadeContent>
      </form>
    </div>
  );
}