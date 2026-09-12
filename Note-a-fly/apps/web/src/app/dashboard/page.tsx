"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

// ReactBits imports
import SplitText from "@/components/reactbits/SplitText";
import BlurText from "@/components/reactbits/BlurText";
import ShinyText from "@/components/reactbits/ShinyText";
import FadeContent from "@/components/reactbits/FadeContent";
import Magnet from "@/components/reactbits/Magnet";
import ClickSpark from "@/components/reactbits/ClickSpark";
import BorderGlow from "@/components/reactbits/BorderGlow";

interface Session {
  id: string;
  title: string;
  source_type: string;
  created_at: string;
  status: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const hoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

const glowVariants = {
  rest: { boxShadow: "0 0 0px rgba(118,113,255,0)" },
  hover: {
    boxShadow: "0 0 25px rgba(118,113,255,0.25)",
    transition: {
      duration: 0.3,
    },
  },
};

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadUserAndSessions() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setUser({ ...user, full_name: profileData.full_name });
        }

        const { data: sessionsData } = await supabase
          .from("sessions")
          .select("id, title, source_type, created_at, status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(6);

        if (sessionsData) {
          setSessions(sessionsData);
        }
      }
      setLoading(false);
    }
    loadUserAndSessions();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-[#5f5e5e] font-[family-name:var(--font-body)]"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  const firstName = user?.full_name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-[#f9f9f9] p-8">
      {/* Greeting */}
      <div className="mb-8">
        <SplitText
          text={`Hey ${firstName} 👋`}
          className="text-5xl font-[family-name:var(--font-headline)] text-[#1b1b1b] mb-2"
          delay={50}
          duration={0.8}
          ease="power3.out"
          splitType="chars"
          from={{ opacity: 0, y: 40 }}
          to={{ opacity: 1, y: 0 }}
          threshold={0.1}
          textAlign="left"
          tag="h1"
        />
        <BlurText
          text="Welcome to your AI Study Hub"
          className="text-xl text-[#5f5e5e] font-[family-name:var(--font-body)] mt-2"
          delay={60}
          animateBy="words"
          direction="top"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {/* Left Column - Input Methods */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-2 space-y-6"
        >
          <motion.div variants={cardVariants}>
            <SplitText
              text="Begin Your Study Session"
              className="text-3xl font-[family-name:var(--font-headline)] italic text-[#1b1b1b] pr-2"
              delay={40}
              duration={0.7}
              ease="power3.out"
              splitType="words"
              from={{ opacity: 0, y: 20 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.1}
              textAlign="left"
              tag="h2"
            />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Record Note Card */}
            <FadeContent blur duration={600} delay={100}>
              <ClickSpark sparkColor="#7671ff" sparkCount={6} sparkSize={8}>
                <BorderGlow borderRadius="1.5rem" speed={4} borderWidth={2}>
                  <motion.div whileHover="hover" initial="rest">
                    <Link href="/dashboard/new/audio">
                      <motion.div
                        variants={hoverVariants}
                        className="bg-white rounded-3xl p-6 gel-shadow cursor-pointer border border-[#eeeeee] h-full"
                      >
                        <div className="w-12 h-12 bg-[#e2dfff] rounded-2xl flex items-center justify-center mb-4">
                          <span
                            className="material-symbols-outlined text-[#7671ff]"
                            style={{ fontSize: "28px" }}
                          >
                            mic
                          </span>
                        </div>
                        <h3 className="text-xl font-[family-name:var(--font-headline)] text-[#1b1b1b] mb-2">
                          Record Note
                        </h3>
                        <p className="text-sm text-[#5f5e5e] font-[family-name:var(--font-body)]">
                          Capture lectures with voice transcription
                        </p>
                      </motion.div>
                    </Link>
                  </motion.div>
                </BorderGlow>
              </ClickSpark>
            </FadeContent>

            {/* Upload File Card */}
            <FadeContent blur duration={600} delay={200}>
              <ClickSpark sparkColor="#7671ff" sparkCount={6} sparkSize={8}>
                <BorderGlow borderRadius="1.5rem" speed={4} borderWidth={2}>
                  <motion.div whileHover="hover" initial="rest">
                    <Link href="/dashboard/new/upload">
                      <motion.div
                        variants={hoverVariants}
                        className="bg-white rounded-3xl p-6 gel-shadow cursor-pointer border border-[#eeeeee] h-full"
                      >
                        <div className="w-12 h-12 bg-[#e2dfff] rounded-2xl flex items-center justify-center mb-4">
                          <span
                            className="material-symbols-outlined text-[#7671ff]"
                            style={{ fontSize: "28px" }}
                          >
                            upload_file
                          </span>
                        </div>
                        <h3 className="text-xl font-[family-name:var(--font-headline)] text-[#1b1b1b] mb-2">
                          Upload File
                        </h3>
                        <p className="text-sm text-[#5f5e5e] font-[family-name:var(--font-body)]">
                          Process PDFs, slides, and documents
                        </p>
                      </motion.div>
                    </Link>
                  </motion.div>
                </BorderGlow>
              </ClickSpark>
            </FadeContent>

            {/* Paste Text Card */}
            <FadeContent blur duration={600} delay={300}>
              <ClickSpark sparkColor="#7671ff" sparkCount={6} sparkSize={8}>
                <BorderGlow borderRadius="1.5rem" speed={4} borderWidth={2}>
                  <motion.div whileHover="hover" initial="rest">
                    <Link href="/dashboard/new/text">
                      <motion.div
                        variants={hoverVariants}
                        className="bg-white rounded-3xl p-6 gel-shadow cursor-pointer border border-[#eeeeee] h-full"
                      >
                        <div className="w-12 h-12 bg-[#e2dfff] rounded-2xl flex items-center justify-center mb-4">
                          <span
                            className="material-symbols-outlined text-[#7671ff]"
                            style={{ fontSize: "28px" }}
                          >
                            content_paste
                          </span>
                        </div>
                        <h3 className="text-xl font-[family-name:var(--font-headline)] text-[#1b1b1b] mb-2">
                          Paste Text
                        </h3>
                        <p className="text-sm text-[#5f5e5e] font-[family-name:var(--font-body)]">
                          Transform notes into study materials
                        </p>
                      </motion.div>
                    </Link>
                  </motion.div>
                </BorderGlow>
              </ClickSpark>
            </FadeContent>
          </div>

          {/* Pro Scholar Tip */}
          <FadeContent blur duration={800} delay={400}>
            <motion.div
              variants={cardVariants}
              className="bg-gradient-to-br from-[#7671ff] to-[#0f0069] rounded-3xl p-6 text-white"
            >
              <div className="flex items-start gap-4">
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: "32px",
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  auto_awesome
                </span>
                <div>
                  <h3 className="text-lg font-[family-name:var(--font-label)] font-semibold mb-1">
                    Pro Scholar Tip
                  </h3>
                  <p className="text-sm font-[family-name:var(--font-body)] opacity-90">
                    Record live lectures for real-time transcription, then let AI
                    generate flashcards and exam questions automatically. Perfect
                    for last-minute revision!
                  </p>
                </div>
              </div>
            </motion.div>
          </FadeContent>
        </motion.div>

        {/* Right Column - AI Tools */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={cardVariants}>
            <SplitText
              text="AI Synthesis Tools"
              className="text-3xl font-[family-name:var(--font-headline)] italic text-[#1b1b1b] pr-2"
              delay={40}
              duration={0.7}
              ease="power3.out"
              splitType="words"
              from={{ opacity: 0, y: 20 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.1}
              textAlign="left"
              tag="h2"
            />
          </motion.div>

          <div className="space-y-3">
            {[
              {
                icon: "style",
                label: "Generate Flashcards",
                color: "#7671ff",
                href: "/dashboard/new/text",
              },
              {
                icon: "quiz",
                label: "Create Quiz",
                color: "#7671ff",
                href: "/dashboard/new/text",
              },
              {
                icon: "account_tree",
                label: "Build Mindmap",
                color: "#7671ff",
                href: "/dashboard/new/text",
              },
              {
                icon: "psychology",
                label: "AI Trivia",
                color: "#7671ff",
                href: "/dashboard/new/text",
              },
              {
                icon: "lightbulb",
                label: "Important Questions",
                color: "#7671ff",
                href: "/dashboard/new/text",
              },
            ].map((tool, idx) => (
              <FadeContent
                key={tool.label}
                blur
                duration={500}
                delay={100 + idx * 80}
              >
                <Magnet padding={10} magnetStrength={0.15}>
                  <BorderGlow borderRadius="1rem" speed={5} borderWidth={1.5}>
                    <motion.div
                      variants={cardVariants}
                      whileHover="hover"
                      initial="rest"
                      custom={idx}
                      className="w-full"
                      onClick={() => router.push(tool.href)}
                    >
                      <motion.div
                        variants={glowVariants}
                        className="bg-white rounded-2xl p-4 gel-shadow border border-[#eeeeee] flex items-center gap-3 cursor-pointer"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${tool.color}15` }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: "24px", color: tool.color }}
                          >
                            {tool.icon}
                          </span>
                        </div>
                        <span className="font-[family-name:var(--font-body)] text-[#1b1b1b]">
                          {tool.label}
                        </span>
                        <span className="material-symbols-outlined text-[#cfc4c5] ml-auto text-lg">
                          arrow_forward
                        </span>
                      </motion.div>
                    </motion.div>
                  </BorderGlow>
                </Magnet>
              </FadeContent>
            ))}
          </div>

          {/* Helper note */}
          <FadeContent blur duration={600} delay={500}>
            <p className="text-xs text-[#636262] font-[family-name:var(--font-label)] text-center px-2">
              All tools run automatically on every session you create.
            </p>
          </FadeContent>
        </motion.div>
      </div>

      {/* Recently Processed */}
      <FadeContent blur duration={700} delay={200}>
        <div>
          <SplitText
            text="Recently Processed"
            className="text-3xl font-[family-name:var(--font-headline)] italic text-[#1b1b1b] mb-6 pr-2"
            delay={40}
            duration={0.7}
            ease="power3.out"
            splitType="words"
            from={{ opacity: 0, y: 20 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            textAlign="left"
            tag="h2"
          />

          {sessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-3xl p-12 gel-shadow text-center"
            >
              <span
                className="material-symbols-outlined text-[#cfc4c5] mb-4"
                style={{ fontSize: "64px" }}
              >
                description
              </span>
              <p className="text-[#636262] font-[family-name:var(--font-body)]">
                No sessions yet. Start by creating your first note above!
              </p>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {sessions.map((session, idx) => (
                <FadeContent
                  key={session.id}
                  blur
                  duration={500}
                  delay={idx * 100}
                >
                  <motion.div whileHover="hover" initial="rest">
                    <Link href={`/dashboard/session/${session.id}`}>
                      <motion.div
                        variants={hoverVariants}
                        className="bg-white rounded-2xl p-5 gel-shadow border border-[#eeeeee] cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-[family-name:var(--font-label)] ${
                              session.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {session.status}
                          </span>
                          <span className="material-symbols-outlined text-[#cfc4c5] text-xl">
                            {session.source_type === "text"
                              ? "content_paste"
                              : session.source_type === "pdf"
                                ? "picture_as_pdf"
                                : session.source_type === "audio"
                                  ? "mic"
                                  : "upload_file"}
                          </span>
                        </div>
                        <h3 className="font-[family-name:var(--font-headline)] text-lg text-[#1b1b1b] mb-2 line-clamp-2">
                          {session.title}
                        </h3>
                        <p className="text-xs text-[#636262] font-[family-name:var(--font-body)]">
                          {new Date(session.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </motion.div>
                    </Link>
                  </motion.div>
                </FadeContent>
              ))}
            </motion.div>
          )}
        </div>
      </FadeContent>

      {/* Floating AI Toolbar */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
        className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
      >
        <div className="bg-[#1b1b1b] text-white rounded-full px-6 py-3 flex items-center gap-4 gel-shadow">
          <span className="material-symbols-outlined text-[#7671ff]">
            auto_awesome
          </span>
          <ShinyText
            text="AI Assistant Ready"
            disabled={false}
            speed={3}
            className="font-[family-name:var(--font-body)] text-sm"
          />
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        </div>
      </motion.div>
    </div>
  );
}