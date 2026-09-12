"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SplitText from "@/components/reactbits/SplitText";
import BlurText from "@/components/reactbits/BlurText";
import FadeContent from "@/components/reactbits/FadeContent";
import Magnet from "@/components/reactbits/Magnet";
import CountUp from "@/components/reactbits/CountUp";

interface SessionWithFlashcards {
  id: string;
  title: string;
  created_at: string;
  flashcards: Array<{ question: string; answer: string }>;
}

export default function FlashcardsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionWithFlashcards[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from("sessions")
        .select("id, title, created_at, flashcards")
        .eq("user_id", userData.user.id)
        .not("flashcards", "is", null)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const filtered = data.filter(
          (s: SessionWithFlashcards) =>
            s.flashcards && Array.isArray(s.flashcards) && s.flashcards.length > 0
        );
        setSessions(filtered);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const totalCards = sessions.reduce((sum, s) => sum + s.flashcards.length, 0);

  return (
    <div className="w-full max-w-4xl py-12 px-8">
      {/* Header */}
      <div className="mb-12">
        <FadeContent blur duration={600}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#e2dfff] text-[#0f0069] rounded-full mb-6">
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              style
            </span>
            <span className="font-[family-name:var(--font-label)] text-xs font-bold uppercase tracking-wider">
              Review & Memorize
            </span>
          </div>
        </FadeContent>

        <h1 className="font-[family-name:var(--font-headline)] text-5xl lg:text-6xl text-black tracking-tight mb-4">
          <SplitText
            text="Flashcards"
            className="pr-2"
            delay={35}
            animationFrom={{ opacity: 0, transform: "translate3d(0,30px,0)" }}
            animationTo={{ opacity: 1, transform: "translate3d(0,0,0)" }}
          />
        </h1>

        <BlurText
          text="All your AI-generated flashcards from every session, in one place."
          delay={20}
          animateBy="words"
          className="text-lg text-[#636262] max-w-lg"
        />
      </div>

      {/* Stats Bar */}
      <FadeContent blur duration={600} delay={200}>
        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="bg-white rounded-2xl p-6 border border-[#cfc4c5]/15 gel-shadow">
            <p className="font-[family-name:var(--font-label)] text-[10px] uppercase tracking-widest text-[#636262] mb-2">
              Total Cards
            </p>
            <p className="text-3xl font-bold text-[#1b1b1b]">
              <CountUp from={0} to={totalCards} duration={1.5} className="inline-block" />
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-[#cfc4c5]/15 gel-shadow">
            <p className="font-[family-name:var(--font-label)] text-[10px] uppercase tracking-widest text-[#636262] mb-2">
              Sessions
            </p>
            <p className="text-3xl font-bold text-[#1b1b1b]">
              <CountUp from={0} to={sessions.length} duration={1.5} className="inline-block" />
            </p>
          </div>
          <div className="bg-[#e2dfff] rounded-2xl p-6 border border-[#c3c0ff]/30">
            <p className="font-[family-name:var(--font-label)] text-[10px] uppercase tracking-widest text-[#0f0069] mb-2">
              Avg Per Session
            </p>
            <p className="text-3xl font-bold text-[#0f0069]">
              <CountUp
                from={0}
                to={sessions.length > 0 ? Math.round(totalCards / sessions.length) : 0}
                duration={1.5}
                className="inline-block"
              />
            </p>
          </div>
        </div>
      </FadeContent>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#7671ff] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && sessions.length === 0 && (
        <FadeContent blur duration={600}>
          <div className="text-center py-20 bg-white rounded-3xl border border-[#cfc4c5]/15 gel-shadow">
            <span className="material-symbols-outlined text-6xl text-[#c3c0ff] mb-4">
              style
            </span>
            <h3 className="font-[family-name:var(--font-headline)] text-2xl font-bold mb-2">
              No flashcards yet
            </h3>
            <p className="text-[#636262] mb-6">
              Create a session and AI will generate flashcards for you.
            </p>
            <Magnet padding={40}>
              <button
                onClick={() => router.push("/dashboard/new/text")}
                className="bg-[#1b1b1b] text-white px-6 py-3 rounded-full font-bold hover:bg-black transition-colors"
              >
                Create Session
              </button>
            </Magnet>
          </div>
        </FadeContent>
      )}

      {/* Session Cards */}
      {!loading && sessions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sessions.map((session, index) => (
            <FadeContent key={session.id} blur duration={600} delay={100 + index * 80}>
              <button
                onClick={() => router.push(`/dashboard/session/${session.id}?tab=flashcards`)}
                className="w-full text-left bg-white rounded-2xl p-6 border border-[#cfc4c5]/15 hover:shadow-lg hover:border-[#c3c0ff]/40 transition-all group cursor-pointer gel-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-[#e2dfff] rounded-xl flex items-center justify-center group-hover:bg-[#7671ff] transition-colors">
                    <span className="material-symbols-outlined text-[#7671ff] group-hover:text-white transition-colors text-xl">
                      style
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[#cfc4c5] group-hover:text-[#7671ff] transition-colors">
                    arrow_forward
                  </span>
                </div>

                <h3 className="font-[family-name:var(--font-headline)] text-lg font-bold text-[#1b1b1b] mb-1 line-clamp-1">
                  {session.title || "Untitled Session"}
                </h3>
                <p className="text-[#636262] text-sm mb-4">
                  {session.flashcards.length} flashcard{session.flashcards.length !== 1 ? "s" : ""}
                </p>

                <div className="space-y-2">
                  {session.flashcards.slice(0, 2).map((card, i) => (
                    <div
                      key={i}
                      className="bg-[#f9f9f9] rounded-lg px-4 py-2.5 text-xs text-[#636262] line-clamp-1 border border-[#eeeeee]"
                    >
                      <span className="font-bold text-[#1b1b1b]">Q:</span>{" "}
                      {card.question}
                    </div>
                  ))}
                  {session.flashcards.length > 2 && (
                    <p className="text-[10px] text-[#7671ff] font-[family-name:var(--font-label)] tracking-wider uppercase pl-1">
                      +{session.flashcards.length - 2} more
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-[#eeeeee] text-[10px] text-[#636262] font-[family-name:var(--font-label)] uppercase tracking-wider">
                  {new Date(session.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </button>
            </FadeContent>
          ))}
        </div>
      )}
    </div>
  );
}