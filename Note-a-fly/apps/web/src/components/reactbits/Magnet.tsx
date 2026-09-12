"use client";

import { useRef, useState, type ReactNode } from "react";

interface MagnetProps {
  children: ReactNode;
  padding?: number;
  disabled?: boolean;
  magnetStrength?: number;
  className?: string;
}

const Magnet = ({
  children,
  padding = 50,
  disabled = false,
  magnetStrength = 0.3,
  className = "",
}: MagnetProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("translate3d(0,0,0)");

  const handleMouseMove = (e: React.MouseEvent) => {
    if (disabled || !ref.current) return;

    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    const distX = (e.clientX - centerX) * magnetStrength;
    const distY = (e.clientY - centerY) * magnetStrength;

    setTransform(`translate3d(${distX}px, ${distY}px, 0)`);
  };

  const handleMouseLeave = () => {
    setTransform("translate3d(0,0,0)");
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        display: "inline-block",
        transform,
        transition: "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        padding,
        margin: -padding,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
};

export default Magnet;