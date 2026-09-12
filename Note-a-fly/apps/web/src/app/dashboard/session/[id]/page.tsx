// apps/web/src/app/dashboard/session/[id]/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  FadeContent,
  BlurText,
  SplitText,
  Magnet,
  BorderGlow,
} from "@/components/reactbits";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  title: string;
  source_type: "text" | "audio" | "upload" | "youtube";
  raw_transcript: string | null;
  status: string;
  created_at: string;
}

interface Note {
  id: string;
  content: string;
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
}

interface ExamQuestion {
  id: string;
  question: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
}

interface Mindmap {
  id: string;
  data: unknown;
}

type TabId = "notes" | "flashcards" | "quiz" | "exam";

// ─── Animated Number ──────────────────────────────────────────────────────────

function AnimatedNumber({ to, duration = 1200 }: { to: number; duration?: number }) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * to));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [to, duration]);

  return <>{current}</>;
}

// ─── Flashcard ────────────────────────────────────────────────────────────────

function FlashcardItem({ card, index }: { card: Flashcard; index: number }) {
  const [flipped, setFlipped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const difficultyColors: Record<string, { bg: string; text: string }> = {
    easy:   { bg: "rgba(34,197,94,0.15)",  text: "#16a34a" },
    medium: { bg: "rgba(245,158,11,0.15)", text: "#d97706" },
    hard:   { bg: "rgba(239,68,68,0.15)",  text: "#dc2626" },
  };
  const diff = card.difficulty ?? "medium";
  const diffStyle = difficultyColors[diff] ?? difficultyColors.medium;

  return (
    // ✅ No FadeContent wrapper here — FadeContent blur=true on a perspective
    // container causes a white overlay. Parent grid handles stagger via index.
    <div
      style={{
        opacity: 0,
        animation: `fadeSlideUp 0.4s ease forwards`,
        animationDelay: `${Math.min(index * 60, 400)}ms`,
      }}
    >
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Perspective wrapper — no fixed height, min-height drives it */}
      <div
        style={{ perspective: "1200px", cursor: "pointer" }}
        onClick={() => setFlipped((f) => !f)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={handleMouseMove}
      >
        {/* Flip track */}
        <div
          style={{
            position: "relative",
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            transition: "transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)",
            // minHeight so short cards aren't tiny; front face is relative
            // so it stretches this container naturally
            minHeight: "200px",
          }}
        >
          {/* ── FRONT: Black — position relative so it drives height ── */}
          <div
            style={{
              position: "relative",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              backgroundColor: "#111111",
              border: "1px solid #222222",
              borderRadius: "1rem",
              overflow: "hidden",
              minHeight: "200px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "1.25rem",
              boxShadow: hovered
                ? "0 8px 32px rgba(0,0,0,0.4)"
                : "0 2px 16px rgba(0,0,0,0.2)",
              transition: "box-shadow 0.3s ease",
            }}
          >
            {/* Purple top accent */}
            <div
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                height: "2px",
                background: "linear-gradient(90deg, #7671ff 0%, transparent 70%)",
              }}
            />

            {/* Static diagonal glare */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "inherit",
                background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 40%)",
                pointerEvents: "none",
              }}
            />

            {/* Mouse-tracking glare */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "inherit",
                background: hovered
                  ? `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,0.08) 0%, transparent 60%)`
                  : "none",
                pointerEvents: "none",
                transition: "opacity 0.3s ease",
              }}
            />

            {/* Content — sits above glare layers */}
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <span
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "#7671ff",
                  }}
                >
                  Question
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    backgroundColor: diffStyle.bg,
                    color: diffStyle.text,
                  }}
                >
                  {diff}
                </span>
              </div>

              {/* ✅ No WebkitLineClamp — full text always visible */}
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.875rem",
                  color: "#e0e0e0",
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {card.front}
              </p>
            </div>

            {/* Footer */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                marginTop: "1rem",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "13px", color: "#444" }}
              >
                flip
              </span>
              <span
                style={{
                  fontFamily: "var(--font-label)",
                  fontSize: "0.6rem",
                  color: "#444",
                }}
              >
                tap to flip
              </span>
            </div>
          </div>

          {/* ── BACK: White — position absolute + rotateY(180deg) ── */}
          {/* Absolute so it doesn't push the front's height calculation */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              backgroundColor: "#ffffff",
              border: "1px solid #eeeeee",
              borderRadius: "1rem",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "1.25rem",
              boxShadow: hovered
                ? "0 8px 32px rgba(0,0,0,0.12)"
                : "0 2px 16px rgba(0,0,0,0.06)",
              transition: "box-shadow 0.3s ease",
              // Safety — if back text is somehow longer, scroll internally
              overflowY: "auto",
            }}
          >
            {/* Purple top accent */}
            <div
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                height: "2px",
                background: "linear-gradient(90deg, #7671ff 0%, transparent 70%)",
              }}
            />

            {/* Tinted glare */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "inherit",
                background: "linear-gradient(135deg, rgba(118,113,255,0.04) 0%, transparent 50%)",
                pointerEvents: "none",
              }}
            />

            {/* Mouse glare */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "inherit",
                background: hovered
                  ? `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(118,113,255,0.07) 0%, transparent 60%)`
                  : "none",
                pointerEvents: "none",
              }}
            />

            <div style={{ position: "relative", zIndex: 1 }}>
              <span
                style={{
                  fontFamily: "var(--font-label)",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "#7671ff",
                  display: "block",
                  marginBottom: "0.75rem",
                }}
              >
                Answer
              </span>

              {/* ✅ No WebkitLineClamp — full answer always visible */}
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.875rem",
                  color: "#1b1b1b",
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {card.back}
              </p>
            </div>

            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                marginTop: "1rem",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "13px", color: "#ccc" }}
              >
                flip
              </span>
              <span
                style={{
                  fontFamily: "var(--font-label)",
                  fontSize: "0.6rem",
                  color: "#ccc",
                }}
              >
                tap to flip back
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Quiz Item ────────────────────────────────────────────────────────────────

function QuizItem({ question, index }: { question: ExamQuestion; index: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const options: string[] = question.options ?? [question.correct_answer];
  const revealed = selected !== null;
  const correct = selected === question.correct_answer;

  return (
    <FadeContent duration={400} delay={index * 70}>
      <div
        className="rounded-2xl border p-6 space-y-5"
        style={{ backgroundColor: "#ffffff", borderColor: "#eeeeee" }}
      >
        {/* Question header */}
        <div className="flex items-start gap-4">
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              fontFamily: "var(--font-label)",
              backgroundColor: revealed
                ? correct ? "#1b1b1b" : "#ba1a1a"
                : "#e2dfff",
              color: revealed ? "#ffffff" : "#7671ff",
              transition: "background-color 0.4s, color 0.4s",
            }}
          >
            {revealed ? (
              <span className="material-symbols-outlined text-sm">
                {correct ? "check" : "close"}
              </span>
            ) : (
              index + 1
            )}
          </div>
          <p
            className="text-sm font-semibold leading-relaxed pt-1"
            style={{ fontFamily: "var(--font-body)", color: "#1b1b1b" }}
          >
            {question.question}
          </p>
        </div>

        {/* Options */}
        <div className="grid gap-2.5 pl-12">
          {options.map((opt, i) => {
            const isCorrect  = opt === question.correct_answer;
            const isSelected = opt === selected;

            let bg     = "#f9f9f9";
            let border = "#eeeeee";
            let color  = "#1b1b1b";
            let iconName = "";

            if (revealed) {
              if (isCorrect) {
                bg = "#1b1b1b"; border = "#1b1b1b"; color = "#ffffff";
                iconName = "check_circle";
              } else if (isSelected && !isCorrect) {
                bg = "#fff5f5"; border = "#ba1a1a"; color = "#ba1a1a";
                iconName = "cancel";
              }
            }

            return (
              <button
                key={i}
                disabled={revealed}
                onClick={() => setSelected(opt)}
                className="flex items-center gap-3 text-left rounded-xl border px-4 py-3.5 text-sm"
                style={{
                  fontFamily: "var(--font-body)",
                  backgroundColor: bg,
                  borderColor: border,
                  color,
                  cursor: revealed ? "default" : "pointer",
                  transform: revealed && isCorrect ? "scale(1.01)" : "scale(1)",
                  transition: "background-color 0.25s, border-color 0.25s, color 0.25s, transform 0.25s",
                }}
              >
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold"
                  style={{
                    fontFamily: "var(--font-label)",
                    borderColor: revealed && isCorrect
                      ? "#ffffff"
                      : revealed && isSelected
                      ? "#ba1a1a"
                      : "#ccc",
                    color: revealed && isCorrect
                      ? "#ffffff"
                      : revealed && isSelected
                      ? "#ba1a1a"
                      : "#999",
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {revealed && iconName && (
                  <span
                    className="material-symbols-outlined text-base flex-shrink-0"
                    style={{ color: isCorrect ? "#ffffff" : "#ba1a1a" }}
                  >
                    {iconName}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {revealed && question.explanation && (
          <div
            className="ml-12 rounded-xl px-4 py-3.5 text-xs leading-relaxed"
            style={{ backgroundColor: "#e2dfff", color: "#0f0069", fontFamily: "var(--font-body)" }}
          >
            <p
              className="font-bold mb-1 text-xs tracking-wider uppercase"
              style={{ fontFamily: "var(--font-label)", color: "#7671ff" }}
            >
              Why this answer
            </p>
            {question.explanation}
          </div>
        )}
      </div>
    </FadeContent>
  );
}

// ─── Exam Q&A Item ────────────────────────────────────────────────────────────

function ExamItem({ question, index }: { question: ExamQuestion; index: number }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <FadeContent duration={400} delay={index * 60}>
      <div
        className="rounded-2xl overflow-hidden border"
        style={{ borderColor: "#eeeeee" }}
      >
        <button
          className="w-full text-left px-6 py-5 flex items-start justify-between gap-4"
          style={{
            // ✅ Correct pattern — inline style driven by useState boolean
            backgroundColor: open ? "#1b1b1b" : hovered ? "#f7f7f7" : "#ffffff",
            transition: "background-color 0.2s",
          }}
          onClick={() => setOpen((o) => !o)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="flex items-start gap-3">
            <span
              className="flex-shrink-0 text-xs font-bold mt-0.5 tracking-wider"
              style={{ fontFamily: "var(--font-label)", color: "#7671ff" }}
            >
              Q{index + 1}
            </span>
            <p
              className="text-sm font-semibold leading-relaxed"
              style={{
                fontFamily: "var(--font-body)",
                color: open ? "#ffffff" : "#1b1b1b",
                transition: "color 0.2s",
              }}
            >
              {question.question}
            </p>
          </div>
          <span
            className="material-symbols-outlined flex-shrink-0 text-xl"
            style={{
              color: open ? "#7671ff" : "#bbb",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), color 0.2s",
            }}
          >
            keyboard_arrow_down
          </span>
        </button>

        {open && (
          <div
            className="px-6 py-6 space-y-4 border-t"
            style={{ backgroundColor: "#111111", borderColor: "#2a2a2a" }}
          >
            <div>
              <p
                className="text-xs font-bold tracking-widest uppercase mb-2"
                style={{ fontFamily: "var(--font-label)", color: "#7671ff" }}
              >
                Model Answer
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ fontFamily: "var(--font-body)", color: "#e0e0e0" }}
              >
                {question.correct_answer}
              </p>
            </div>
            {question.explanation && (
              <div className="pt-2 border-t" style={{ borderColor: "#2a2a2a" }}>
                <p
                  className="text-xs font-bold tracking-widest uppercase mb-2"
                  style={{ fontFamily: "var(--font-label)", color: "#c3c0ff" }}
                >
                  Explanation
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ fontFamily: "var(--font-body)", color: "#999" }}
                >
                  {question.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </FadeContent>
  );
}

// ─── Inline parser ────────────────────────────────────────────────────────────

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));

    if (match[0].startsWith("**")) {
      parts.push(
        <strong key={match.index} style={{ fontFamily: "var(--font-body)", color: "#1b1b1b", fontWeight: 700 }}>
          {match[2]}
        </strong>
      );
    } else if (match[0].startsWith("*")) {
      parts.push(
        <em key={match.index} style={{ fontFamily: "var(--font-body)", color: "#1b1b1b", fontStyle: "italic" }}>
          {match[3]}
        </em>
      );
    } else if (match[0].startsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded-md text-xs"
          style={{ fontFamily: "monospace", backgroundColor: "#e2dfff", color: "#0f0069" }}
        >
          {match[4]}
        </code>
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// ─── Table Parser ─────────────────────────────────────────────────────────────

function parseTable(lines: string[]): { headers: string[]; rows: string[][] } | null {
  if (lines.length < 3) return null;
  const parseRow = (line: string) =>
    line.split("|").map((c) => c.trim()).filter((c) => c.length > 0);
  const isSeparator = (line: string) => /^\|?[\s\-|:]+\|?$/.test(line);
  if (!isSeparator(lines[1])) return null;
  return { headers: parseRow(lines[0]), rows: lines.slice(2).map(parseRow) };
}

// ─── Block Classifier ─────────────────────────────────────────────────────────

type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "bullet"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "callout"; variant: "insight" | "alert" | "tip" | "note"; text: string }
  | { type: "divider" }
  | { type: "paragraph"; text: string };

function classifyBlocks(content: string): Block[] {
  const rawLines = content.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  const stripEmoji = (s: string) =>
    s.replace(/[\u{1F300}-\u{1FFFF}]/gu, "").replace(/[\u2600-\u27BF]/g, "").trim();

  const isCallout = (
    line: string
  ): { variant: "insight" | "alert" | "tip" | "note"; text: string } | null => {
    const lower = line.toLowerCase();
    const stripped = line
      .replace(/\*\*/g, "")
      .replace(/[\u{1F300}-\u{1FFFF}]/gu, "")
      .replace(/[\u2600-\u27BF]/g, "")
      .trim();
    if (/key insight/i.test(lower))
      return { variant: "insight", text: stripped.replace(/key insight\s*[:\-]?\s*/i, "").trim() };
    if (/exam alert/i.test(lower) || /exam tip/i.test(lower))
      return { variant: "alert", text: stripped.replace(/exam (alert|tip)\s*[:\-]?\s*/i, "").trim() };
    if (/pro tip|tip\s*[:\-]/i.test(lower))
      return { variant: "tip", text: stripped.replace(/pro tip\s*[:\-]?\s*/i, "").replace(/^tip\s*[:\-]?\s*/i, "").trim() };
    if (/note\s*[:\-]/i.test(lower) || /^note:/i.test(stripped))
      return { variant: "note", text: stripped.replace(/^note\s*[:\-]?\s*/i, "").trim() };
    return null;
  };

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (/^(-{2,}|\*{3,}|_{3,})$/.test(trimmed)) {
      if (blocks.length > 0 && blocks[blocks.length - 1].type !== "divider")
        blocks.push({ type: "divider" });
      i++; continue;
    }
    if (trimmed === "") { i++; continue; }
    if (/^#\s/.test(trimmed)) {
      blocks.push({ type: "h1", text: stripEmoji(trimmed.replace(/^#\s/, "")) });
      i++; continue;
    }
    if (/^##\s/.test(trimmed)) {
      blocks.push({ type: "h2", text: stripEmoji(trimmed.replace(/^##\s/, "")) });
      i++; continue;
    }
    if (/^###\s/.test(trimmed)) {
      blocks.push({ type: "h3", text: stripEmoji(trimmed.replace(/^###\s/, "")) });
      i++; continue;
    }
    if (/^[\u{1F300}-\u{1FFFF}\u2600-\u27BF]/u.test(trimmed) && /\*\*.+\*\*/.test(trimmed)) {
      const text = trimmed.replace(/[\u{1F300}-\u{1FFFF}]/gu, "").replace(/[\u2600-\u27BF]/g, "").replace(/\*\*/g, "").trim();
      blocks.push({ type: "h2", text });
      i++; continue;
    }
    if (trimmed.startsWith("**") || /key insight|exam alert|pro tip|^note:/i.test(trimmed)) {
      const callout = isCallout(trimmed);
      if (callout) { blocks.push({ type: "callout", ...callout }); i++; continue; }
    }
    if (/^[-*•]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < rawLines.length && /^[-*•]\s/.test(rawLines[i].trim())) {
        items.push(rawLines[i].trim().replace(/^[-*•]\s/, ""));
        i++;
      }
      blocks.push({ type: "bullet", items }); continue;
    }
    if (trimmed.startsWith("|") || (trimmed.includes("|") && trimmed.includes("---"))) {
      const tableLines: string[] = [];
      while (i < rawLines.length && (rawLines[i].trim().startsWith("|") || rawLines[i].trim().includes("|"))) {
        tableLines.push(rawLines[i]); i++;
      }
      const parsed = parseTable(tableLines);
      if (parsed) { blocks.push({ type: "table", ...parsed }); continue; }
      blocks.push({ type: "paragraph", text: tableLines.join(" ") }); continue;
    }
    blocks.push({ type: "paragraph", text: trimmed });
    i++;
  }

  return blocks.filter((b, idx) => {
    if (b.type === "divider" && idx > 0 && blocks[idx - 1].type === "divider") return false;
    if (b.type === "divider" && idx === blocks.length - 1) return false;
    return true;
  });
}

// ─── Notes Renderer ───────────────────────────────────────────────────────────

function NotesRenderer({ content }: { content: string }) {
  const blocks = classifyBlocks(content);

  const calloutConfig = {
    insight: { icon: "lightbulb",         bg: "#e2dfff", border: "#c3c0ff", iconColor: "#7671ff", labelColor: "#0f0069", textColor: "#1b1b1b", label: "Key Insight" },
    alert:   { icon: "warning",           bg: "#fff8e1", border: "#ffe082", iconColor: "#f59e0b", labelColor: "#92400e", textColor: "#1b1b1b", label: "Exam Alert"  },
    tip:     { icon: "tips_and_updates",  bg: "#f0fdf4", border: "#bbf7d0", iconColor: "#16a34a", labelColor: "#14532d", textColor: "#1b1b1b", label: "Pro Tip"     },
    note:    { icon: "info",              bg: "#f0f9ff", border: "#bae6fd", iconColor: "#0284c7", labelColor: "#0c4a6e", textColor: "#1b1b1b", label: "Note"        },
  };

  return (
    <div className="space-y-0">
      {blocks.map((block, i) => {
        const delay = Math.min(i * 50, 300);

        switch (block.type) {
          case "h1":
            return (
              <FadeContent key={i} duration={500} delay={delay}>
                <div className={cn(i > 0 && "mt-10", "mb-5")}>
                  <h1 style={{ fontFamily: "var(--font-headline)", fontStyle: "italic", fontWeight: 800, fontSize: "2rem", lineHeight: 1.2, color: "#1b1b1b", letterSpacing: "-0.02em" }}>
                    {block.text}
                  </h1>
                  <div className="mt-3 h-[3px] w-12 rounded-full" style={{ background: "linear-gradient(90deg, #7671ff, transparent)" }} />
                </div>
              </FadeContent>
            );

          case "h2":
            return (
              <FadeContent key={i} duration={500} delay={delay}>
                <div className={cn(i > 0 && "mt-8", "mb-4")}>
                  <h2 style={{ fontFamily: "var(--font-headline)", fontStyle: "italic", fontWeight: 700, fontSize: "1.4rem", lineHeight: 1.3, color: "#1b1b1b", letterSpacing: "-0.015em" }}>
                    {block.text}
                  </h2>
                  <div className="mt-2 h-[2px] w-8 rounded-full" style={{ backgroundColor: "#e2dfff" }} />
                </div>
              </FadeContent>
            );

          case "h3":
            return (
              <FadeContent key={i} duration={450} delay={delay}>
                <h3
                  className={cn(i > 0 && "mt-5", "mb-2")}
                  style={{ fontFamily: "var(--font-label)", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#636262" }}
                >
                  {block.text}
                </h3>
              </FadeContent>
            );

          case "bullet":
            return (
              <FadeContent key={i} duration={450} delay={delay}>
                <ul className="space-y-2.5 my-4">
                  {block.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <span className="mt-[7px] flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#7671ff" }} />
                      <span className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-body)", color: "#2a2a2a" }}>
                        {parseInline(item)}
                      </span>
                    </li>
                  ))}
                </ul>
              </FadeContent>
            );

          case "table":
            return (
              <FadeContent key={i} duration={500} delay={delay}>
                <div className="my-6 overflow-x-auto rounded-2xl border" style={{ borderColor: "#eeeeee" }}>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr style={{ backgroundColor: "#1b1b1b" }}>
                        {block.headers.map((h, j) => (
                          <th key={j} className="px-5 py-3.5 text-left" style={{ fontFamily: "var(--font-label)", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#ffffff" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, j) => (
                        <tr key={j} style={{ backgroundColor: j % 2 === 0 ? "#ffffff" : "#fafafa", borderTop: "1px solid #eeeeee" }}>
                          {row.map((cell, k) => (
                            <td key={k} className="px-5 py-3.5 align-top" style={{ fontFamily: k === 0 ? "var(--font-label)" : "var(--font-body)", fontWeight: k === 0 ? 600 : 400, fontSize: "0.85rem", color: "#1b1b1b" }}>
                              {parseInline(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </FadeContent>
            );

          case "callout": {
            const cfg = calloutConfig[block.variant];
            return (
              <FadeContent key={i} duration={450} delay={delay}>
                <div className="my-5 rounded-2xl border flex items-start gap-4 px-5 py-4" style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
                  <span className="material-symbols-outlined text-xl flex-shrink-0 mt-0.5" style={{ color: cfg.iconColor }}>{cfg.icon}</span>
                  <div>
                    <p className="mb-1" style={{ fontFamily: "var(--font-label)", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: cfg.labelColor }}>
                      {cfg.label}
                    </p>
                    <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-body)", color: cfg.textColor }}>
                      {parseInline(block.text)}
                    </p>
                  </div>
                </div>
              </FadeContent>
            );
          }

          case "divider":
            return (
              <FadeContent key={i} duration={400} delay={delay}>
                <div className="my-8 flex items-center gap-4">
                  <div className="flex-1 h-px" style={{ backgroundColor: "#eeeeee" }} />
                  <span className="material-symbols-outlined text-sm" style={{ color: "#ddd" }}>more_horiz</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: "#eeeeee" }} />
                </div>
              </FadeContent>
            );

          case "paragraph":
            if (!block.text.trim()) return null;
            return (
              <FadeContent key={i} duration={400} delay={delay}>
                <p className="text-sm leading-relaxed my-2" style={{ fontFamily: "var(--font-body)", color: "#3a3a3a" }}>
                  {parseInline(block.text)}
                </p>
              </FadeContent>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <FadeContent duration={400} delay={0}>
      <div className="rounded-2xl border flex flex-col items-center justify-center py-20 gap-4 text-center" style={{ backgroundColor: "#ffffff", borderColor: "#eeeeee" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#eeeeee" }}>
          <span className="material-symbols-outlined text-2xl" style={{ color: "#bbb" }}>{icon}</span>
        </div>
        <div>
          <p className="font-bold text-sm" style={{ fontFamily: "var(--font-label)", color: "#1b1b1b" }}>{title}</p>
          <p className="text-xs mt-1.5 max-w-[220px] mx-auto leading-relaxed" style={{ fontFamily: "var(--font-body)", color: "#636262" }}>{description}</p>
        </div>
      </div>
    </FadeContent>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SessionDetailPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const sessionId    = params.id as string;

  const tabParam    = searchParams.get("tab") as TabId | null;
  const validTabs: TabId[] = ["notes", "flashcards", "quiz", "exam"];
  const initialTab: TabId  = tabParam && validTabs.includes(tabParam) ? tabParam : "notes";

  const [activeTab,      setActiveTab]      = useState<TabId>(initialTab);
  const [session,        setSession]        = useState<Session | null>(null);
  const [notes,          setNotes]          = useState<Note[]>([]);
  const [flashcards,     setFlashcards]     = useState<Flashcard[]>([]);
  const [examQuestions,  setExamQuestions]  = useState<ExamQuestion[]>([]);
  const [mindmap,        setMindmap]        = useState<Mindmap | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [hoveredLink,    setHoveredLink]    = useState<string | null>(null);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionRes, notesRes, flashcardsRes, examRes, mindmapRes] =
        await Promise.all([
          supabase.from("sessions").select("*").eq("id", sessionId).single(),
          supabase.from("notes").select("*").eq("session_id", sessionId),
          supabase.from("flashcards").select("*").eq("session_id", sessionId),
          supabase.from("exam_questions").select("*").eq("session_id", sessionId),
          supabase.from("mindmaps").select("*").eq("session_id", sessionId).maybeSingle(),
        ]);

      if (sessionRes.error) throw sessionRes.error;
      setSession(sessionRes.data);
      setNotes(notesRes.data ?? []);
      setFlashcards(flashcardsRes.data ?? []);
      setExamQuestions(examRes.data ?? []);
      setMindmap(mindmapRes.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const sourceTypeLabel =
    session?.source_type === "text"    ? "Pasted Text"      :
    session?.source_type === "audio"   ? "Audio Recording"  :
    session?.source_type === "youtube" ? "YouTube Video"    :
    "File Upload";

  const sourceTypeIcon =
    session?.source_type === "text"    ? "article"      :
    session?.source_type === "audio"   ? "mic"          :
    session?.source_type === "youtube" ? "play_circle"  :
    "upload_file";

  const formattedDate = session
    ? new Date(session.created_at).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "";

  // ✅ "completed" matches what the backend actually saves
  const isComplete =
    session?.status === "completed" || session?.status === "complete";

  const tabs: { id: TabId; label: string; icon: string; count: number }[] = [
    { id: "notes",      label: "Notes",      icon: "article", count: notes.length          },
    { id: "flashcards", label: "Flashcards", icon: "style",   count: flashcards.length     },
    { id: "quiz",       label: "Quiz",       icon: "quiz",    count: examQuestions.length  },
    { id: "exam",       label: "Exam Q&A",   icon: "school",  count: examQuestions.length  },
  ];

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#f9f9f9" }}>
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: "#7671ff", opacity: 0.2 }} />
            <div className="absolute inset-2 rounded-full animate-spin border-2 border-t-transparent" style={{ borderColor: "#e2dfff", borderTopColor: "#7671ff" }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ fontFamily: "var(--font-label)", color: "#1b1b1b" }}>Loading session</p>
            <p className="text-xs mt-1" style={{ fontFamily: "var(--font-body)", color: "#636262" }}>Fetching your study materials…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (error || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#f9f9f9" }}>
        <div className="rounded-3xl border p-10 max-w-sm w-full text-center space-y-5" style={{ backgroundColor: "#ffffff", borderColor: "#eeeeee" }}>
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ backgroundColor: "#fff5f5" }}>
            <span className="material-symbols-outlined text-2xl" style={{ color: "#ba1a1a" }}>error</span>
          </div>
          <div>
            <p className="font-bold text-base" style={{ fontFamily: "var(--font-label)", color: "#1b1b1b" }}>Session not found</p>
            <p className="text-xs mt-2 leading-relaxed" style={{ fontFamily: "var(--font-body)", color: "#636262" }}>
              {error ?? "This session doesn't exist or you don't have access."}
            </p>
          </div>
          <Magnet padding={20} magnetStrength={0.15}>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 rounded-full text-sm font-bold"
              style={{ fontFamily: "var(--font-label)", backgroundColor: "#1b1b1b", color: "#ffffff" }}
            >
              Back to Dashboard
            </button>
          </Magnet>
        </div>
      </div>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f9f9" }}>
      <div className="max-w-[1360px] mx-auto px-6 py-10">

        {/* ── Status pill ─────────────────────────────────────────────────── */}
        <FadeContent duration={350} delay={0}>
          <div className="flex justify-end mb-10">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full border"
              style={{ backgroundColor: "#ffffff", borderColor: "#eeeeee" }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  // ✅ Fixed: was only checking "complete", now handles "completed" too
                  backgroundColor: isComplete ? "#7671ff" : "#ccc",
                  boxShadow:       isComplete ? "0 0 6px #7671ff" : "none",
                  transition: "background-color 0.4s, box-shadow 0.4s",
                }}
              />
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{ fontFamily: "var(--font-label)", color: "#636262" }}
              >
                {session.status}
              </span>
            </div>
          </div>
        </FadeContent>

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="mb-10 space-y-4">
          <FadeContent duration={400} delay={60}>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border"
                style={{ backgroundColor: "#e2dfff", borderColor: "#c3c0ff" }}
              >
                <span className="material-symbols-outlined text-sm" style={{ color: "#7671ff" }}>
                  {sourceTypeIcon}
                </span>
                <span
                  className="text-xs font-bold tracking-wider uppercase"
                  style={{ fontFamily: "var(--font-label)", color: "#0f0069" }}
                >
                  {sourceTypeLabel}
                </span>
              </div>
              <span className="text-xs" style={{ fontFamily: "var(--font-label)", color: "#bbb" }}>
                {formattedDate}
              </span>
            </div>
          </FadeContent>

          <SplitText
            text={session.title}
            delay={30}
            animationFrom={{ opacity: 0, transform: "translate3d(0,24px,0)" }}
            animationTo={{ opacity: 1, transform: "translate3d(0,0,0)" }}
            className="text-4xl md:text-5xl font-bold leading-tight pr-4"
            style={{ fontFamily: "var(--font-headline)", fontStyle: "italic", color: "#1b1b1b" }}
          />

          <BlurText
            text="Review your AI-generated notes, flip through flashcards, and test yourself with exam simulations."
            delay={18}
            animateBy="words"
            className="text-sm max-w-2xl leading-relaxed"
            style={{ fontFamily: "var(--font-body)", color: "#5f5e5e" }}
          />

          <FadeContent duration={450} delay={280}>
            <div className="flex items-center gap-2.5 flex-wrap pt-2">
              {[
                { label: "Structured Notes",  count: notes.length,         icon: "article"      },
                { label: "Flashcards",        count: flashcards.length,    icon: "style"        },
                { label: "Exam Questions",    count: examQuestions.length, icon: "school"       },
                { label: "Mindmap",           count: mindmap ? 1 : 0,      icon: "account_tree" },
              ].map((chip) => (
                <div
                  key={chip.label}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border"
                  style={{ backgroundColor: "#ffffff", borderColor: "#eeeeee" }}
                >
                  <span className="material-symbols-outlined text-sm" style={{ color: "#7671ff" }}>{chip.icon}</span>
                  <span className="text-xs font-medium" style={{ fontFamily: "var(--font-label)", color: "#5f5e5e" }}>
                    {chip.count} {chip.label}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: "#e2dfff" }}>
                <span className="material-symbols-outlined text-sm" style={{ color: "#7671ff" }}>auto_awesome</span>
                <span className="text-xs font-bold" style={{ fontFamily: "var(--font-label)", color: "#0f0069" }}>
                  All generated automatically
                </span>
              </div>
            </div>
          </FadeContent>
        </div>

        {/* ── Tab switcher ────────────────────────────────────────────────── */}
        <FadeContent duration={500} delay={340}>
          <div className="flex items-center gap-3 mb-8 flex-wrap">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Magnet key={tab.id} padding={18} magnetStrength={0.12}>
                  <button
                    onClick={() => handleTabChange(tab.id)}
                    className="flex items-center gap-2.5 px-6 py-3.5 rounded-full text-xs font-bold tracking-wider uppercase"
                    style={{
                      fontFamily: "var(--font-label)",
                      backgroundColor: isActive ? "#1b1b1b" : "#ffffff",
                      color:           isActive ? "#ffffff" : "#1b1b1b",
                      border:          isActive ? "1.5px solid #1b1b1b" : "1.5px solid #eeeeee",
                      boxShadow:       isActive ? "0 4px 20px rgba(0,0,0,0.15)" : "0 2px 8px rgba(0,0,0,0.04)",
                      transition: "background-color 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s",
                    }}
                  >
                    <span className="material-symbols-outlined text-base" style={{ color: "#7671ff" }}>
                      {tab.icon}
                    </span>
                    {tab.label}
                    {tab.count > 0 && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: isActive ? "rgba(118,113,255,0.25)" : "#f0f0f0",
                          color:           isActive ? "#c3c0ff" : "#636262",
                        }}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                </Magnet>
              );
            })}
          </div>
        </FadeContent>

        {/* ── Two-column grid ──────────────────────────────────────────────── */}
        <div className="flex gap-7 items-start">

          {/* ── Left: Tab content ────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* NOTES */}
            {activeTab === "notes" && (
              <div className="space-y-5">
                {notes.length === 0 ? (
                  <EmptyState icon="article" title="No notes yet" description="Notes will appear here once the AI processes your content." />
                ) : (
                  notes.map((note, i) => (
                    <FadeContent key={note.id} duration={400} delay={i * 60}>
                      <div className="rounded-2xl border p-8" style={{ backgroundColor: "#ffffff", borderColor: "#eeeeee" }}>
                        <NotesRenderer content={note.content} />
                      </div>
                    </FadeContent>
                  ))
                )}
              </div>
            )}

            {/* FLASHCARDS */}
            {activeTab === "flashcards" && (
              <div>
                {flashcards.length === 0 ? (
                  <EmptyState icon="style" title="No flashcards yet" description="Flashcards will be generated from your content automatically." />
                ) : (
                  <>
                    <FadeContent duration={300} delay={0}>
                      <p className="text-xs mb-4" style={{ fontFamily: "var(--font-body)", color: "#636262" }}>
                        Tap any card to reveal the answer
                      </p>
                    </FadeContent>
                    {/* ✅ grid-cols-1 on small, 2 on md — gap-4 gives cards room to breathe */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {flashcards.map((card, i) => (
                        <FlashcardItem key={card.id} card={card} index={i} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* QUIZ */}
            {activeTab === "quiz" && (
              <div className="space-y-5">
                {examQuestions.length === 0 ? (
                  <EmptyState icon="quiz" title="No quiz questions yet" description="Interactive quiz questions will appear here after processing." />
                ) : (
                  examQuestions.map((q, i) => (
                    <QuizItem key={q.id} question={q} index={i} />
                  ))
                )}
              </div>
            )}

            {/* EXAM Q&A */}
            {activeTab === "exam" && (
              <div className="space-y-3">
                {examQuestions.length === 0 ? (
                  <EmptyState icon="school" title="No exam questions yet" description="Long-form exam questions will be generated from your content." />
                ) : (
                  examQuestions.map((q, i) => (
                    <ExamItem key={q.id} question={q} index={i} />
                  ))
                )}
              </div>
            )}
          </div>

          {/* ── Right: Sidebar ───────────────────────────────────────────── */}
          <div className="w-[288px] flex-shrink-0 space-y-5 sticky top-8">

            {/* Widget 1: Session Tracker */}
            <FadeContent duration={450} delay={400}>
              <div className="rounded-2xl border p-6 space-y-5" style={{ backgroundColor: "#ffffff", borderColor: "#eeeeee" }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-label)", color: "#636262" }}>
                    {activeTab === "notes"      && "Study Notes"}
                    {activeTab === "flashcards" && "Flashcards"}
                    {activeTab === "quiz"       && "Quiz"}
                    {activeTab === "exam"       && "Exam Q&A"}
                  </p>
                  <span className="material-symbols-outlined text-base" style={{ color: "#7671ff" }}>
                    {activeTab === "notes"      && "auto_stories"}
                    {activeTab === "flashcards" && "style"}
                    {activeTab === "quiz"       && "quiz"}
                    {activeTab === "exam"       && "school"}
                  </span>
                </div>

                {/* NOTES TAB */}
                {activeTab === "notes" && (
                  <div className="space-y-4">
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold leading-none" style={{ fontFamily: "var(--font-headline)", fontStyle: "italic", color: "#1b1b1b" }}>
                        <AnimatedNumber
                          to={notes.map((n) => n.content).join(" ").split(/\s+/).filter(Boolean).length}
                          duration={1000}
                        />
                      </span>
                      <span className="text-sm mb-1" style={{ fontFamily: "var(--font-body)", color: "#636262" }}>words</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: "#f9f9f9" }}>
                      <span className="text-xs" style={{ fontFamily: "var(--font-body)", color: "#5f5e5e" }}>Structured notes</span>
                      <span className="text-xs font-bold" style={{ fontFamily: "var(--font-label)", color: "#1b1b1b" }}>{notes.length}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: "#f9f9f9" }}>
                      <span className="text-xs" style={{ fontFamily: "var(--font-body)", color: "#5f5e5e" }}>Est. read time</span>
                      <span className="text-xs font-bold" style={{ fontFamily: "var(--font-label)", color: "#1b1b1b" }}>
                        {Math.max(1, Math.ceil(notes.map((n) => n.content).join(" ").split(/\s+/).filter(Boolean).length / 200))} min
                      </span>
                    </div>
                    <div className="h-px" style={{ backgroundColor: "#f0f0f0" }} />
                    {[
                      { label: "Notes",      value: notes.length,         done: notes.length > 0         },
                      { label: "Flashcards", value: flashcards.length,    done: flashcards.length > 0    },
                      { label: "Questions",  value: examQuestions.length, done: examQuestions.length > 0 },
                      { label: "Mindmap",    value: mindmap ? 1 : 0,      done: !!mindmap                },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.done ? "#7671ff" : "#eeeeee", transition: "background-color 0.5s" }} />
                          <span className="text-xs" style={{ fontFamily: "var(--font-body)", color: "#5f5e5e" }}>{item.label}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ fontFamily: "var(--font-label)", color: item.done ? "#1b1b1b" : "#bbb" }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* FLASHCARDS TAB */}
                {activeTab === "flashcards" && (
                  <div className="space-y-4">
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-bold leading-none" style={{ fontFamily: "var(--font-headline)", fontStyle: "italic", color: "#1b1b1b" }}>
                        <AnimatedNumber to={flashcards.length} duration={800} />
                      </span>
                      <span className="text-sm mb-1" style={{ fontFamily: "var(--font-body)", color: "#636262" }}>cards</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-label)", color: "#636262" }}>Deck Coverage</span>
                        <span className="text-[10px] font-bold" style={{ fontFamily: "var(--font-label)", color: flashcards.length > 0 ? "#7671ff" : "#bbb" }}>
                          {flashcards.length > 0 ? "Ready" : "Empty"}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#eeeeee" }}>
                        <div className="h-full rounded-full" style={{ backgroundColor: "#1b1b1b", width: flashcards.length > 0 ? "100%" : "0%", transition: "width 1s cubic-bezier(0.34,1.56,0.64,1)" }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Review time", value: `${Math.max(1, Math.ceil(flashcards.length * 0.3))} min` },
                        { label: "Card pairs",  value: `${flashcards.length}` },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: "#f9f9f9" }}>
                          <p className="text-lg font-bold" style={{ fontFamily: "var(--font-label)", color: "#1b1b1b" }}>{s.value}</p>
                          <p className="text-[10px] mt-0.5" style={{ fontFamily: "var(--font-label)", color: "#999" }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* QUIZ TAB */}
                {activeTab === "quiz" && (
                  <div className="space-y-4">
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-bold leading-none" style={{ fontFamily: "var(--font-headline)", fontStyle: "italic", color: "#1b1b1b" }}>
                        <AnimatedNumber to={examQuestions.length} duration={800} />
                      </span>
                      <span className="text-sm mb-1" style={{ fontFamily: "var(--font-body)", color: "#636262" }}>questions</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-label)", color: "#636262" }}>Question Mix</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden flex" style={{ backgroundColor: "#eeeeee" }}>
                        <div className="h-full" style={{ backgroundColor: "#1b1b1b", width: "40%" }} />
                        <div className="h-full" style={{ backgroundColor: "#7671ff", width: "35%" }} />
                        <div className="h-full" style={{ backgroundColor: "#c3c0ff", width: "25%" }} />
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        {[
                          { label: "Recall",  color: "#1b1b1b" },
                          { label: "Apply",   color: "#7671ff" },
                          { label: "Analyse", color: "#c3c0ff" },
                        ].map((d) => (
                          <div key={d.label} className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-[10px]" style={{ fontFamily: "var(--font-label)", color: "#999" }}>{d.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: "#f9f9f9" }}>
                      <span className="text-xs" style={{ fontFamily: "var(--font-body)", color: "#5f5e5e" }}>Est. completion</span>
                      <span className="text-xs font-bold" style={{ fontFamily: "var(--font-label)", color: "#1b1b1b" }}>
                        {Math.max(1, Math.ceil(examQuestions.length * 1.5))} min
                      </span>
                    </div>
                  </div>
                )}

                {/* EXAM TAB */}
                {activeTab === "exam" && (
                  <div className="space-y-4">
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-bold leading-none" style={{ fontFamily: "var(--font-headline)", fontStyle: "italic", color: "#1b1b1b" }}>
                        <AnimatedNumber to={examQuestions.length} duration={800} />
                      </span>
                      <span className="text-sm mb-1" style={{ fontFamily: "var(--font-body)", color: "#636262" }}>exam questions</span>
                    </div>
                    {[
                      { label: "With answer options", value: examQuestions.filter((q) => q.options && q.options.length > 0).length },
                      { label: "With explanations",   value: examQuestions.filter((q) => q.explanation).length                    },
                      { label: "Total questions",     value: examQuestions.length                                                  },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: "#f9f9f9" }}>
                        <span className="text-xs" style={{ fontFamily: "var(--font-body)", color: "#5f5e5e" }}>{item.label}</span>
                        <span className="text-xs font-bold" style={{ fontFamily: "var(--font-label)", color: "#1b1b1b" }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FadeContent>

            {/* Widget 2: Jump To */}
            <FadeContent duration={450} delay={460}>
              <div className="rounded-2xl border p-5 space-y-1.5" style={{ backgroundColor: "#ffffff", borderColor: "#eeeeee" }}>
                <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ fontFamily: "var(--font-label)", color: "#636262" }}>Jump To</p>
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const isHov    = hoveredLink === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      onMouseEnter={() => setHoveredLink(tab.id)}
                      onMouseLeave={() => setHoveredLink(null)}
                      className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left"
                      style={{
                        backgroundColor: isActive ? "#1b1b1b" : isHov ? "#f5f5f5" : "transparent",
                        transition: "background-color 0.2s",
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base" style={{ color: isActive ? "#7671ff" : "#bbb", transition: "color 0.2s" }}>
                          {tab.icon}
                        </span>
                        <span className="text-xs font-bold tracking-wide" style={{ fontFamily: "var(--font-label)", color: isActive ? "#ffffff" : "#1b1b1b", transition: "color 0.2s" }}>
                          {tab.label}
                        </span>
                      </div>
                      {tab.count > 0 && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ fontFamily: "var(--font-label)", backgroundColor: isActive ? "rgba(118,113,255,0.25)" : "#f0f0f0", color: isActive ? "#c3c0ff" : "#636262" }}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </FadeContent>

            {/* Widget 3: Next Step */}
            <FadeContent duration={450} delay={520}>
              <div className="rounded-2xl p-6 space-y-4 relative overflow-hidden" style={{ backgroundColor: "#0f0069" }}>
                <div className="absolute -right-8 -bottom-8 w-28 h-28 rounded-full blur-2xl pointer-events-none" style={{ backgroundColor: "#7671ff", opacity: 0.35 }} />
                <div className="flex items-center gap-2 relative">
                  <span className="material-symbols-outlined text-lg" style={{ color: "#c3c0ff" }}>
                    {activeTab === "flashcards" ? "quiz" : activeTab === "quiz" ? "school" : activeTab === "exam" ? "article" : "rocket_launch"}
                  </span>
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-label)", color: "#c3c0ff" }}>Next Study Step</p>
                </div>
                <p className="text-sm leading-relaxed relative" style={{ fontFamily: "var(--font-body)", color: "#c3c0ff" }}>
                  {activeTab === "notes"      && flashcards.length > 0  && "Now test your recall — flip through the flashcards for this session."}
                  {activeTab === "notes"      && flashcards.length === 0 && examQuestions.length > 0  && "Move on to the quiz to test your understanding of these notes."}
                  {activeTab === "notes"      && flashcards.length === 0 && examQuestions.length === 0 && "Your notes are ready. Come back once more study materials are generated."}
                  {activeTab === "flashcards" && examQuestions.length > 0  && "Great work on flashcards! Now challenge yourself with the interactive quiz."}
                  {activeTab === "flashcards" && examQuestions.length === 0 && "No quiz questions yet — revisit your notes to reinforce what you've studied."}
                  {activeTab === "quiz"  && examQuestions.length > 0 && "Done with the quiz? Try the full Exam Q&A for deeper long-form practice."}
                  {activeTab === "exam"  && "Reviewed all exam questions? Go back to flashcards for a final recall sweep."}
                </p>
                <Magnet padding={14} magnetStrength={0.15} className="w-full block relative">
                  <BorderGlow borderRadius="0.875rem" speed={3} borderWidth={1.5} className="w-full block">
                    <button
                      onClick={() => {
                        if      (activeTab === "notes")      handleTabChange(flashcards.length > 0 ? "flashcards" : "quiz");
                        else if (activeTab === "flashcards") handleTabChange(examQuestions.length > 0 ? "quiz" : "notes");
                        else if (activeTab === "quiz")       handleTabChange("exam");
                        else                                 handleTabChange("flashcards");
                      }}
                      className="w-full py-3.5 rounded-[0.875rem] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2"
                      style={{ fontFamily: "var(--font-label)", backgroundColor: "#ffffff", color: "#1b1b1b" }}
                    >
                      {activeTab === "notes"      && "Study Flashcards"}
                      {activeTab === "flashcards" && "Take the Quiz"}
                      {activeTab === "quiz"       && "Exam Q&A"}
                      {activeTab === "exam"       && "Review Flashcards"}
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </button>
                  </BorderGlow>
                </Magnet>
              </div>
            </FadeContent>

            {/* Widget 4: Session Info */}
            <FadeContent duration={400} delay={580}>
              <div className="rounded-2xl border p-5 space-y-2.5" style={{ backgroundColor: "#ffffff", borderColor: "#eeeeee" }}>
                <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ fontFamily: "var(--font-label)", color: "#636262" }}>Session Info</p>
                {[
                  { label: "Source",  value: sourceTypeLabel },
                  { label: "Created", value: formattedDate   },
                  { label: "Status",  value: session.status ?? "complete" },
                  { label: "ID",      value: sessionId.slice(0, 8) + "…" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs" style={{ fontFamily: "var(--font-body)", color: "#aaa" }}>{item.label}</span>
                    <span className="text-xs font-bold" style={{ fontFamily: "var(--font-label)", color: "#1b1b1b" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </FadeContent>

            {/* Widget 5: Mindmap (only if exists) */}
            {mindmap && (
              <FadeContent duration={400} delay={620}>
                <button
                  onMouseEnter={() => setHoveredLink("mindmap")}
                  onMouseLeave={() => setHoveredLink(null)}
                  className="w-full rounded-2xl border p-5 flex items-center gap-4 text-left"
                  style={{
                    backgroundColor: hoveredLink === "mindmap" ? "#1b1b1b" : "#ffffff",
                    borderColor:     hoveredLink === "mindmap" ? "#1b1b1b" : "#eeeeee",
                    transition: "background-color 0.2s, border-color 0.2s",
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#e2dfff" }}>
                    <span className="material-symbols-outlined text-base" style={{ color: "#7671ff" }}>account_tree</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ fontFamily: "var(--font-label)", color: hoveredLink === "mindmap" ? "#ffffff" : "#1b1b1b", transition: "color 0.2s" }}>
                      View Mindmap
                    </p>
                    <p className="text-xs mt-0.5" style={{ fontFamily: "var(--font-body)", color: hoveredLink === "mindmap" ? "#aaa" : "#636262", transition: "color 0.2s" }}>
                      Visual concept map
                    </p>
                  </div>
                </button>
              </FadeContent>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}