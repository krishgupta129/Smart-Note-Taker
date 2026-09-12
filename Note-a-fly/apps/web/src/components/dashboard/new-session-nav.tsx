"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import FadeContent from "@/components/reactbits/FadeContent";
import Magnet from "@/components/reactbits/Magnet";
import BorderGlow from "@/components/reactbits/BorderGlow";
import { cn } from "@/lib/utils";

const inputMethods = [
  { label: "Record Audio", href: "/dashboard/new/audio", icon: "mic" },
  { label: "Upload File", href: "/dashboard/new/upload", icon: "upload_file" },
  { label: "Paste Text", href: "/dashboard/new/text", icon: "content_paste" },
];

interface NewSessionNavProps {
  isProcessing?: boolean;
}

export default function NewSessionNav({
  isProcessing = false,
}: NewSessionNavProps) {
  const pathname = usePathname();

  return (
    <FadeContent blur duration={500} delay={0}>
      <div className="mb-4">
        {/* ── Input Method Pills ── */}
        <div className="flex gap-3 flex-wrap">
          {inputMethods.map((method, index) => {
            const isActive = pathname === method.href;
            const showPulse = isActive && isProcessing;

            return (
              <FadeContent
                key={method.href}
                blur
                duration={500}
                delay={80 + index * 80}
              >
                <Magnet padding={12} magnetStrength={0.1} className="block">
                  <BorderGlow
                    borderRadius="9999px"
                    speed={4}
                    borderWidth={isActive ? 2 : 1.5}
                    glowOpacity={isActive ? 0.55 : 0.3}
                    className="block"
                  >
                    <Link href={method.href} className="block">
                      <motion.div
                        initial="rest"
                        whileHover="hover"
                        whileTap={{ scale: 0.96 }}
                        className={cn(
                          "relative overflow-hidden px-6 py-3 rounded-full",
                          "font-[family-name:var(--font-label)] text-sm",
                          "flex items-center gap-2.5 transition-all cursor-pointer",
                          isActive
                            ? "bg-[#1b1b1b] text-white"
                            : "bg-white text-[#636262] border border-[#eeeeee]",
                          showPulse && "processing-pulse"
                        )}
                        style={{
                          boxShadow: isActive
                            ? "0 10px 24px rgba(0,0,0,0.16)"
                            : "0 2px 10px rgba(0,0,0,0.04)",
                        }}
                      >
                        {/* Glare Sweep */}
                        <motion.div
                          variants={{
                            rest: { x: "-120%", opacity: 0 },
                            hover: { x: "220%", opacity: 1 },
                          }}
                          transition={{ duration: 0.85, ease: "easeInOut" }}
                          className="absolute inset-y-0 left-0 w-1/2 skew-x-12 z-0 pointer-events-none"
                          style={{
                            background:
                              "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
                          }}
                        />

                        {showPulse ? (
                          <div className="relative z-10 w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <motion.span
                            className={cn(
                              "material-symbols-outlined relative z-10",
                              isActive ? "text-white" : "text-[#7671ff]"
                            )}
                            style={{ fontSize: "20px" }}
                            animate={
                              isActive
                                ? { scale: [1, 1.12, 1] }
                                : { scale: 1 }
                            }
                            transition={{ duration: 0.3 }}
                          >
                            {method.icon}
                          </motion.span>
                        )}

                        <span className="relative z-10 font-semibold tracking-wide">
                          {showPulse ? "Processing..." : method.label}
                        </span>
                      </motion.div>
                    </Link>
                  </BorderGlow>
                </Magnet>
              </FadeContent>
            );
          })}
        </div>
      </div>
    </FadeContent>
  );
}