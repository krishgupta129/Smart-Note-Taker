"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

import FadeContent from "@/components/reactbits/FadeContent";
import Magnet from "@/components/reactbits/Magnet";
import BorderGlow from "@/components/reactbits/BorderGlow";

const navItems = [
  {
    label: "Library",
    href: "/dashboard",
    icon: "book_2",
    description: "All your sessions",
  },
  {
    label: "Flashcards",
    href: "/dashboard/flashcards",
    icon: "style",
    description: "Review & memorize",
  },
  {
    label: "Mindmaps",
    href: "/dashboard/mindmaps",
    icon: "hub",
    description: "Visual connections",
  },
  {
    label: "Quizzes",
    href: "/dashboard/quizzes",
    icon: "quiz",
    description: "Test your knowledge",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [userName, setUserName] = useState("User");
  const [navOpen, setNavOpen] = useState(false);
  const [backHovered, setBackHovered] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      const name = data.user?.user_metadata?.full_name;
      if (name) setUserName(name);
    }
    load();
  }, [supabase.auth]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isNavActive(href: string): boolean {
    if (href === "/dashboard") {
      return (
        pathname === "/dashboard" ||
        pathname.startsWith("/dashboard/session")
      );
    }
    return pathname.startsWith(href);
  }

  const isNewSessionActive = pathname.startsWith("/dashboard/new");
  const isSessionDetail = pathname.startsWith("/dashboard/session/");
  const showBackButton = isNewSessionActive || isSessionDetail;

  const activeItem =
    navItems.find((item) => isNavActive(item.href)) || navItems[0];

  return (
    <nav className="fixed left-0 top-0 h-full flex flex-col pt-8 pb-6 w-72 bg-stone-100 rounded-r-[3rem] z-40">
      {/* Header */}
      <FadeContent blur duration={500} delay={50}>
        <div className="mb-8 px-8">
          <h1 className="font-[family-name:var(--font-headline)] italic text-3xl text-neutral-900">
            Note-a-fly
          </h1>
          <p className="font-[family-name:var(--font-label)] text-[10px] uppercase tracking-[0.2em] text-[#636262] mt-1 ml-1">
            The Living Manuscript
          </p>
        </div>
      </FadeContent>

      {/* ── Contextual Back Button (only on /new/* and session pages) ─── */}
      <AnimatePresence>
        {showBackButton && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="px-4 overflow-hidden"
          >
            <Magnet padding={14} magnetStrength={0.08}>
              <Link href="/dashboard" className="block">
                <motion.div
                  onMouseEnter={() => setBackHovered(true)}
                  onMouseLeave={() => setBackHovered(false)}
                  whileTap={{ scale: 0.97 }}
                  className="relative overflow-hidden flex items-center gap-3 px-5 py-3 rounded-full cursor-pointer"
                  style={{
                    backgroundColor: backHovered ? "#0f0f0f" : "#1b1b1b",
                    boxShadow: backHovered
                      ? "0 8px 24px rgba(0,0,0,0.22)"
                      : "0 4px 16px rgba(0,0,0,0.12)",
                    transition:
                      "background-color 0.2s ease, box-shadow 0.25s ease, transform 0.2s ease",
                    transform: backHovered ? "translateY(-1px)" : "translateY(0px)",
                  }}
                >
                  {/* Glare sweep */}
                  <motion.div
                    animate={backHovered ? { x: "320%" } : { x: "-120%" }}
                    transition={{ duration: 0.75, ease: "easeInOut" }}
                    className="absolute inset-y-0 left-0 w-1/3 skew-x-12 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
                    }}
                  />

                  <motion.span
                    className="material-symbols-outlined text-white relative z-10"
                    style={{ fontSize: "18px" }}
                    animate={{ x: backHovered ? -2 : 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    arrow_back
                  </motion.span>

                  <span
                    className="relative z-10 text-xs font-bold tracking-[0.14em] uppercase text-white"
                    style={{ fontFamily: "var(--font-label)" }}
                  >
                    Dashboard
                  </span>

                  <motion.div
                    className="relative z-10 w-1.5 h-1.5 rounded-full ml-auto"
                    style={{ backgroundColor: "#7671ff" }}
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>
              </Link>
            </Magnet>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Record Note Button */}
      <div className="mb-8 mx-4 w-[calc(100%-2rem)]">
        <FadeContent blur duration={500} delay={150}>
          <Magnet padding={12} magnetStrength={0.1} className="w-full block">
            <BorderGlow
              borderRadius="9999px"
              speed={4}
              borderWidth={2}
              glowOpacity={0.6}
              className="w-full block"
            >
              <Link href="/dashboard/new/audio" className="block w-full">
                <motion.div
                  whileHover="hover"
                  initial="rest"
                  className={`relative overflow-hidden w-full py-4 rounded-full font-[family-name:var(--font-label)] text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isNewSessionActive
                      ? "bg-[#7671ff] text-white shadow-[0_0_25px_rgba(118,113,255,0.4)]"
                      : "bg-[#1b1b1b] text-white"
                  }`}
                >
                  {/* Glare Sweep */}
                  <motion.div
                    variants={{
                      rest: { x: "-100%", opacity: 0 },
                      hover: { x: "200%", opacity: 1 },
                    }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 z-0"
                  />

                  <span className="material-symbols-outlined text-base relative z-10">
                    edit_note
                  </span>
                  <span className="relative z-10 font-semibold tracking-wide">
                    Record Note
                  </span>
                </motion.div>
              </Link>
            </BorderGlow>
          </Magnet>
        </FadeContent>
      </div>

      {/* ══════════ CARD NAV DROPDOWN ══════════ */}
      <div className="flex-1 px-4">
        <FadeContent blur duration={600} delay={250}>
          <div className="bg-white/40 border border-white/60 rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.02)] backdrop-blur-sm overflow-hidden">
            {/* Toggle Button */}
            <button
              onClick={() => setNavOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-5 py-4 cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[22px] text-[#7671ff]">
                  {activeItem.icon}
                </span>
                <span className="font-[family-name:var(--font-label)] text-sm font-bold text-[#7671ff] tracking-wide">
                  {activeItem.label}
                </span>
              </div>
              <motion.span
                animate={{ rotate: navOpen ? 180 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="material-symbols-outlined text-[20px] text-[#636262] group-hover:text-[#1b1b1b] transition-colors"
              >
                expand_more
              </motion.span>
            </button>

            {/* Expanded Card Grid */}
            <AnimatePresence>
              {navOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  className="overflow-hidden"
                >
                  <div className="px-2 pb-3 grid grid-cols-2 gap-2">
                    {navItems.map((item, index) => {
                      const isActive = isNavActive(item.href);
                      return (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, y: 12, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{
                            duration: 0.3,
                            delay: index * 0.06,
                            ease: "easeOut",
                          }}
                        >
                          <Link href={item.href} className="block">
                            <div
                              className={`rounded-2xl p-4 transition-all cursor-pointer group/card h-full ${
                                isActive
                                  ? "bg-[#1b1b1b] text-white shadow-lg"
                                  : "bg-[#eeeeee] text-[#1b1b1b] hover:bg-[#e2dfff]/40 hover:shadow-md"
                              }`}
                            >
                              <span
                                className={`material-symbols-outlined text-[20px] mb-3 block ${
                                  isActive ? "text-[#c3c0ff]" : "text-[#7671ff]"
                                }`}
                              >
                                {item.icon}
                              </span>
                              <span
                                className={`font-[family-name:var(--font-label)] text-xs font-bold tracking-wide block mb-1 ${
                                  isActive ? "text-white" : "text-[#1b1b1b]"
                                }`}
                              >
                                {item.label}
                              </span>
                              <span
                                className={`text-[10px] leading-tight block ${
                                  isActive
                                    ? "text-white/50"
                                    : "text-[#636262]"
                                }`}
                              >
                                {item.description}
                              </span>
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </FadeContent>
      </div>

      {/* Bottom Profile / Logout */}
      <div className="pt-6 px-6 space-y-4 mb-2">
        <FadeContent blur duration={600} delay={350}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 text-[#636262] hover:text-[#ba1a1a] rounded-full px-4 py-2 transition-all w-full cursor-pointer group"
          >
            <span className="material-symbols-outlined text-xl transition-transform group-hover:-translate-x-1">
              logout
            </span>
            <span className="font-[family-name:var(--font-label)] text-sm font-medium">
              Log Out
            </span>
          </button>
        </FadeContent>

        <FadeContent blur duration={600} delay={450}>
          <div className="px-2 flex items-center gap-3 bg-white/30 rounded-full p-2 border border-white/50">
            <div className="w-10 h-10 rounded-full bg-[#1b1b1b] flex items-center justify-center text-sm font-bold text-white shadow-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#1b1b1b]">
                {userName}
              </span>
              <span className="text-[10px] text-[#7671ff] font-[family-name:var(--font-label)] font-semibold tracking-wide">
                Free Plan
              </span>
            </div>
          </div>
        </FadeContent>
      </div>
    </nav>
  );
}