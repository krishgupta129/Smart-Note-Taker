"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SplitText from "@/components/reactbits/SplitText";
import BlurText from "@/components/reactbits/BlurText";
import FadeContent from "@/components/reactbits/FadeContent";
import Magnet from "@/components/reactbits/Magnet";
import CountUp from "@/components/reactbits/CountUp";

interface MindmapNode {
  id: string;
  label: string;
  children?: MindmapNode[];
}

interface SessionWithMindmap {
  id: string;
  title: string;
  created_at: string;
  mindmap: MindmapNode | MindmapNode[];
}

function countNodes(node: MindmapNode | MindmapNode[]): number {
  if (Array.isArray(node)) return node.reduce((sum, n) => sum + countNodes(n), 0);
  let count = 1;
  if (node.children) count += node.children.reduce((sum, c) => sum + countNodes(c), 0);
  return count;
}

function getTopLabels(node: MindmapNode | MindmapNode[], max: number): string[] {
  if (Array.isArray(node)) return node.slice(0, max).map((n) => n.label);
  if (node.children) return node.children.slice(0, max).map((c) => c.label);
  return [node.label];
}

export default function MindmapsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionWithMindmap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from("sessions")
        .select("id, title, created_at, mindmap")
        .eq("user_id", userData.user.id)
        .not("mindmap", "is", null)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const filtered = data.filter(
          (s: SessionWithMindmap) =>
            s.mindmap && (Array.isArray(s.mindmap) ? s.mindmap.length > 0 : true)
        );
        setSessions(filtered);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const totalNodes = sessions.reduce((sum, s) => sum + countNodes(s.mindmap), 0);

  return (
    <div className="w-full max-w-4xl py-12 px-8">
      {/* Header */}
      <div className="mb-12">
        <FadeContent blur duration={600}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#e2dfff] text-[#0f0069] rounded-full mb-6">
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              hub
            </span>
            <span className="font-[family-name:var(--font-label)] text-xs font-bold uppercase tracking-wider">
              Visual Connections
            </span>
          </div>
        </FadeContent>

        <h1 className="font-[family-name:var(--font-headline)] text-5xl lg:text-6xl text-black tracking-tight mb-4">
          <SplitText
            text="Mindmaps"
            className="pr-2"
            delay={35}
            animationFrom={{ opacity: 0, transform: "translate3d(0,30px,0)" }}
            animationTo={{ opacity: 1, transform: "translate3d(0,0,0)" }}
          />
        </h1>

        <BlurText
          text="Explore the visual structure of your knowledge, auto-generated from every session."
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
              Total Nodes
            </p>
            <p className="text-3xl font-bold text-[#1b1b1b]">
              <CountUp from={0} to={totalNodes} duration={1.5} className="inline-block" />
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-[#cfc4c5]/15 gel-shadow">
            <p className="font-[family-name:var(--font-label)] text-[10px] uppercase tracking-widest text-[#636262] mb-2">
              Mindmaps
            </p>
            <p className="text-3xl font-bold text-[#1b1b1b]">
              <CountUp from={0} to={sessions.length} duration={1.5} className="inline-block" />
            </p>
          </div>
          <div className="bg-[#e2dfff] rounded-2xl p-6 border border-[#c3c0ff]/30">
            <p className="font-[family-name:var(--font-label)] text-[10px] uppercase tracking-widest text-[#0f0069] mb-2">
              Avg Nodes
            </p>
            <p className="text-3xl font-bold text-[#0f0069]">
              <CountUp
                from={0}
                to={sessions.length > 0 ? Math.round(totalNodes / sessions.length) : 0}
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
              hub
            </span>
            <h3 className="font-[family-name:var(--font-headline)] text-2xl font-bold mb-2">
              No mindmaps yet
            </h3>
            <p className="text-[#636262] mb-6">
              Create a session and AI will generate a mindmap for you.
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session, index) => {
            const nodeCount = countNodes(session.mindmap);
            const topLabels = getTopLabels(session.mindmap, 4);
            return (
              <FadeContent key={session.id} blur duration={600} delay={100 + index * 80}>
                <button
                  onClick={() => router.push(`/dashboard/session/${session.id}?tab=mindmap`)}
                  className="w-full text-left bg-white rounded-2xl overflow-hidden border border-[#cfc4c5]/15 hover:shadow-lg hover:border-[#c3c0ff]/40 transition-all group cursor-pointer gel-shadow"
                >
                  {/* Visual Header */}
                  <div className="bg-[#1b1b1b] p-6 relative overflow-hidden">
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 50% 50%, rgba(118,113,255,0.3) 1px, transparent 1px)",
                        backgroundSize: "16px 16px",
                      }}
                    />
                    <div className="relative z-10 flex items-center justify-center gap-3 py-4">
                      <div className="w-3 h-3 rounded-full bg-[#7671ff]" />
                      <div className="w-8 h-[1px] bg-[#7671ff]/40" />
                      <div className="w-2 h-2 rounded-full bg-[#c3c0ff]" />
                      <div className="w-6 h-[1px] bg-[#7671ff]/40" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#7671ff]/60" />
                      <div className="w-5 h-[1px] bg-[#7671ff]/40" />
                      <div className="w-2 h-2 rounded-full bg-[#c3c0ff]/60" />
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-[family-name:var(--font-headline)] text-lg font-bold text-[#1b1b1b] line-clamp-1">
                        {session.title || "Untitled Session"}
                      </h3>
                      <span className="material-symbols-outlined text-[#cfc4c5] group-hover:text-[#7671ff] transition-colors text-xl">
                        arrow_forward
                      </span>
                    </div>

                    <p className="text-sm text-[#636262] mb-4">
                      {nodeCount} node{nodeCount !== 1 ? "s" : ""}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {topLabels.map((label, i) => (
                        <span
                          key={i}
                          className="bg-[#f3f3f3] text-[#636262] text-[10px] px-2.5 py-1 rounded-full border border-[#eeeeee] font-[family-name:var(--font-label)] line-clamp-1"
                        >
                          {label}
                        </span>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-[#eeeeee] text-[10px] text-[#636262] font-[family-name:var(--font-label)] uppercase tracking-wider">
                      {new Date(session.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </button>
              </FadeContent>
            );
          })}
        </div>
      )}
    </div>
  );
}