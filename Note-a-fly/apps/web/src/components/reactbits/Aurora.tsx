"use client";

interface AuroraProps {
  className?: string;
  colorOne?: string;
  colorTwo?: string;
  colorThree?: string;
  speed?: number;
  opacity?: number;
  blur?: number;
}

const Aurora = ({
  className = "",
  colorOne = "rgba(118, 113, 255, 0.12)",
  colorTwo = "rgba(15, 0, 105, 0.08)",
  colorThree = "rgba(194, 192, 255, 0.10)",
  speed = 8,
  opacity = 1,
  blur = 60,
}: AuroraProps) => {
  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ opacity }}
    >
      <style>{`
        @keyframes aurora-drift-1 {
          0%, 100% { transform: translate(0%, 0%) scale(1); }
          25% { transform: translate(8%, 10%) scale(1.1); }
          50% { transform: translate(-5%, -5%) scale(0.95); }
          75% { transform: translate(12%, 5%) scale(1.05); }
        }
        @keyframes aurora-drift-2 {
          0%, 100% { transform: translate(0%, 0%) scale(1.05); }
          25% { transform: translate(-12%, 8%) scale(0.95); }
          50% { transform: translate(8%, -8%) scale(1.1); }
          75% { transform: translate(-8%, -5%) scale(1); }
        }
        @keyframes aurora-drift-3 {
          0%, 100% { transform: translate(0%, 0%) scale(0.95); }
          25% { transform: translate(5%, 10%) scale(1.05); }
          50% { transform: translate(-8%, -5%) scale(1); }
          75% { transform: translate(8%, -8%) scale(1.1); }
        }
      `}</style>

      {/* Blob 1 — left area */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "-5%",
          width: "55%",
          height: "80%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colorOne} 0%, transparent 70%)`,
          filter: `blur(${blur}px)`,
          animation: `aurora-drift-1 ${speed}s ease-in-out infinite`,
        }}
      />

      {/* Blob 2 — right area */}
      <div
        style={{
          position: "absolute",
          top: "5%",
          right: "0%",
          width: "50%",
          height: "85%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colorTwo} 0%, transparent 70%)`,
          filter: `blur(${blur}px)`,
          animation: `aurora-drift-2 ${speed * 1.2}s ease-in-out infinite`,
        }}
      />

      {/* Blob 3 — center */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "20%",
          width: "50%",
          height: "75%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colorThree} 0%, transparent 70%)`,
          filter: `blur(${blur}px)`,
          animation: `aurora-drift-3 ${speed * 0.9}s ease-in-out infinite`,
        }}
      />
    </div>
  );
};

export default Aurora;