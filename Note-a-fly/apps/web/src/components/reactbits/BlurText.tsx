"use client";

import { useRef, useEffect, useState } from "react";

interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  animationFrom?: Record<string, string | number>;
  animationTo?: Record<string, string | number>;
  easing?: string;
  onAnimationComplete?: () => void;
}

const BlurText = ({
  text,
  className = "",
  delay = 50,
  animateBy = "words",
  direction = "top",
  threshold = 0.1,
  rootMargin = "-50px",
  animationFrom,
  animationTo,
  easing = "cubic-bezier(0.22, 1, 0.36, 1)",
  onAnimationComplete,
}: BlurTextProps) => {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  const defaultFrom = {
    opacity: 0,
    filter: "blur(10px)",
    transform: direction === "top" ? "translateY(-20px)" : "translateY(20px)",
  };

  const defaultTo = {
    opacity: 1,
    filter: "blur(0px)",
    transform: "translateY(0px)",
  };

  const fromStyles = animationFrom
    ? Object.entries(animationFrom).reduce(
        (acc, [key, value]) => {
          if (key === "filter") acc.filter = String(value);
          else if (key === "transform") acc.transform = String(value);
          else if (key === "opacity") acc.opacity = Number(value);
          return acc;
        },
        { ...defaultFrom }
      )
    : defaultFrom;

  const toStyles = animationTo
    ? Object.entries(animationTo).reduce(
        (acc, [key, value]) => {
          if (key === "filter") acc.filter = String(value);
          else if (key === "transform") acc.transform = String(value);
          else if (key === "opacity") acc.opacity = Number(value);
          return acc;
        },
        { ...defaultTo }
      )
    : defaultTo;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsVisible(true);
          setHasAnimated(true);
        }
      },
      { threshold, rootMargin }
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin, hasAnimated]);

  const elements = animateBy === "words" ? text.split(" ") : text.split("");

  return (
    <p ref={containerRef} className={`split-parent ${className}`}>
      {elements.map((el, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            transition: `all 0.6s ${easing} ${isVisible ? i * delay : 0}ms`,
            opacity: isVisible ? toStyles.opacity : fromStyles.opacity,
            filter: isVisible ? toStyles.filter : fromStyles.filter,
            transform: isVisible ? toStyles.transform : fromStyles.transform,
            willChange: "transform, opacity, filter",
          }}
          onTransitionEnd={
            i === elements.length - 1 ? onAnimationComplete : undefined
          }
        >
          {el}
          {animateBy === "words" && i < elements.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </p>
  );
};

export default BlurText;