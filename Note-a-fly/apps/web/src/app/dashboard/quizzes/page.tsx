"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SplitText from "@/components/reactbits/SplitText";
import BlurText from "@/components/reactbits/BlurText";
import FadeContent from "@/components/reactbits/FadeContent";
import Magnet from "@/components/reactbits/Magnet";
import CountUp from "@/components/reactbits/CountUp";

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
}

interface SessionWithQuiz {
  id: string;
  title: string;
  created_at: string;
  exam_questions: QuizQuestion[];
}

export default function QuizzesPage() {
  const supabase = createClient();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionWithQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from("sessions")
        .select("id, title, created_at, exam_questions")
        .eq("user_id", userData.user.id)
        .not("exam_questions", "is", null)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const filtered = data.filter(
          (s: SessionWithQuiz) =>
            s.exam_questions &&
            Array.isArray(s.exam_questions) &&
            s.exam_questions.length > 0
        );
        setSessions(filtered);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const totalQuestions = sessions.reduce((sum, s) => sum + s.exam_questions.length, 0);

  return (
    <div className="w-full max-w-4xl py-12 px-8">
      {/* Header */}
      <div className="mb-12">
        <FadeContent blur duration={600}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#e2dfff] text-[#0f0069] rounded-full mb-6">
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              quiz
            </span>
            <span className="font-[family-name:var(--font-label)] text-xs font-bold uppercase tracking-wider">
              Test Your Knowledge
            </span>
          </div>
        </FadeContent>

        <h1 className="font-[family-name:var(--font-headline)] text-5xl lg:text-6xl text-black tracking-tight mb-4">
          <SplitText
            text="Quizzes"
            className="pr-2"
            delay={35}
            animationFrom={{ opacity: 0, transform: "translate3d(0,30px,0)" }}
            animationTo={{ opacity: 1, transform: "translate3d(0,0,0)" }}
          />
        </h1>

        <BlurText
          text="AI-generated exam questions from your sessions. Practice and master every topic."
          delay={20}
          animateBy="words"
          className="text-lg text-[#636262] max-w-lg"
        />
      </div>

      {/* Stats */}
      <FadeContent blur duration={600} delay={200}>
        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="bg-white rounded-2xl p-6 border border-[#cfc4c5]/15 gel-shadow">
            <p className="font-[family-name:var(--font-label)] text-[10px] uppercase tracking-widest text-[#636262] mb-2">
              Total Questions
            </p>
            <p className="text-3xl font-bold text-[#1b1b1b]">
              <CountUp from={0} to={totalQuestions} duration={1.5} className="inline-block" />
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-[#cfc4c5]/15 gel-shadow">
            <p className="font-[family-name:var(--font-label)] text-[10px] uppercase tracking-widest text-[#636262] mb-2">
              Quizzes
            </p>
            <p className="text-3xl font-bold text-[#1b1b1b]">
              <CountUp from={0} to={sessions.length} duration={1.5} className="inline-block" />
            </p>
          </div>
          <div className="bg-[#e2dfff] rounded-2xl p-6 border border-[#c3c0ff]/30">
            <p className="font-[family-name:var(--font-label)] text-[10px] uppercase tracking-widest text-[#0f0069] mb-2">
              Avg Questions
            </p>
            <p className="text-3xl font-bold text-[#0f0069]">
              <CountUp
                from={0}
                to={
                  sessions.length > 0
                    ? Math.round(totalQuestions / sessions.length)
                    : 0
                }
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

      {/* Empty */}
      {!loading && sessions.length === 0 && (
        <FadeContent blur duration={600}>
          <div className="text-center py-20 bg-white rounded-3xl border border-[#cfc4c5]/15 gel-shadow">
            <span className="material-symbols-outlined text-6xl text-[#c3c0ff] mb-4">
              quiz
            </span>
            <h3 className="font-[family-name:var(--font-headline)] text-2xl font-bold mb-2">
              No quizzes yet
            </h3>
            <p className="text-[#636262] mb-6">
              Create a session and AI will generate exam questions for you.
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

      {/* Cards */}
      {!loading && sessions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sessions.map((session, index) => (
            <FadeContent key={session.id} blur duration={600} delay={100 + index * 80}>
              <button
                onClick={() =>
                  router.push(`/dashboard/session/${session.id}?tab=exam`)
                }
                className="w-full text-left bg-white rounded-2xl p-6 border border-[#cfc4c5]/15 hover:shadow-lg hover:border-[#c3c0ff]/40 transition-all group cursor-pointer gel-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-[#e2dfff] rounded-xl flex items-center justify-center group-hover:bg-[#7671ff] transition-colors">
                    <span className="material-symbols-outlined text-[#7671ff] group-hover:text-white transition-colors text-xl">
                      quiz
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#eeeeee] text-[#636262] text-[10px] px-2.5 py-1 rounded-full font-[family-name:var(--font-label)] font-bold">
                      {session.exam_questions.length} Q&apos;s
                    </span>
                    <span className="material-symbols-outlined text-[#cfc4c5] group-hover:text-[#7671ff] transition-colors">
                      arrow_forward
                    </span>
                  </div>
                </div>

                <h3 className="font-[family-name:var(--font-headline)] text-lg font-bold text-[#1b1b1b] mb-4 line-clamp-1">
                  {session.title || "Untitled Session"}
                </h3>

                {/* Preview first question */}
                <div className="bg-[#f9f9f9] rounded-xl p-4 border border-[#eeeeee] mb-4">
                  <p className="text-xs text-[#1b1b1b] font-medium mb-2 line-clamp-2">
                    {session.exam_questions[0]?.question}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {session.exam_questions[0]?.options?.slice(0, 4).map((opt, i) => (
                      <div
                        key={i}
                        className="text-[10px] text-[#636262] bg-white rounded-md px-2 py-1 border border-[#eeeeee] line-clamp-1"
                      >
                        {String.fromCharCode(65 + i)}. {opt}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#eeeeee] text-[10px] text-[#636262] font-[family-name:var(--font-label)] uppercase tracking-wider">
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