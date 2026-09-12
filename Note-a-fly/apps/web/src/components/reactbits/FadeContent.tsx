"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";

interface FadeContentProps {
  children: ReactNode;
  blur?: boolean;
  duration?: number;
  delay?: number;
  easing?: string;
  threshold?: number;
  initialOpacity?: number;
  className?: string;
}

const FadeContent = ({
  children,
  blur = false,
  duration = 600,
  delay = 0,
  easing = "cubic-bezier(0.22, 1, 0.36, 1)",
  threshold = 0.1,
  initialOpacity = 0,
  className = "",
}: FadeContentProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsVisible(true);
          setHasAnimated(true);
        }
      },
      { threshold }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, hasAnimated]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : initialOpacity,
        filter: blur ? (isVisible ? "blur(0px)" : "blur(8px)") : "none",
        transform: isVisible ? "translateY(0)" : "translateY(20px)",
        transition: `all ${duration}ms ${easing} ${delay}ms`,
        willChange: "opacity, transform, filter",
      }}
    >
      {children}
    </div>
  );
};

export default FadeContent;