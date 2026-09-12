"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";

interface BorderGlowProps {
  children: ReactNode;
  className?: string;
  borderRadius?: string;
  glowColor?: string;
  glowSize?: number;
  borderWidth?: number;
  glowOpacity?: number;
}

const BorderGlow = ({
  children,
  className = "",
  borderRadius = "1.5rem",
  glowColor = "rgba(118, 113, 255, 0.6)",
  glowSize = 200,
  borderWidth = 1.5,
  glowOpacity = 0,
}: BorderGlowProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [opacity, setOpacity] = useState(glowOpacity);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setOpacity(1);
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setOpacity(0);
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        borderRadius,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glow border layer */}
      <div
        style={{
          position: "absolute",
          inset: `-${borderWidth}px`,
          borderRadius,
          background: `radial-gradient(${glowSize}px circle at ${position.x}px ${position.y}px, ${glowColor}, transparent 65%)`,
          opacity,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Outer glow (softer, larger) */}
      <div
        style={{
          position: "absolute",
          inset: `-${borderWidth + 8}px`,
          borderRadius,
          background: `radial-gradient(${glowSize * 1.4}px circle at ${position.x}px ${position.y}px, ${glowColor.replace(/[\d.]+\)$/, "0.15)")}, transparent 60%)`,
          opacity,
          transition: "opacity 0.4s ease",
          pointerEvents: "none",
          filter: "blur(8px)",
          zIndex: -1,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          borderRadius,
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default BorderGlow;