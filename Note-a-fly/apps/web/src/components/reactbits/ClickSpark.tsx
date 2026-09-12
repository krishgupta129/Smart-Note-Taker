"use client";

import { useRef, useCallback, type ReactNode, type MouseEvent } from "react";

interface ClickSparkProps {
  children: ReactNode;
  sparkColor?: string;
  sparkCount?: number;
  sparkSize?: number;
  duration?: number;
  className?: string;
}

const ClickSpark = ({
  children,
  sparkColor = "#7671ff",
  sparkCount = 8,
  sparkSize = 10,
  duration = 500,
  className = "",
}: ClickSparkProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const createSpark = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (let i = 0; i < sparkCount; i++) {
        const spark = document.createElement("div");
        const angle = (360 / sparkCount) * i;
        const distance = 20 + Math.random() * 30;

        spark.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: ${sparkSize}px;
          height: ${sparkSize}px;
          background: ${sparkColor};
          border-radius: 50%;
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -50%);
          animation: spark-fly-${angle} ${duration}ms ease-out forwards;
        `;

        const style = document.createElement("style");
        style.textContent = `
          @keyframes spark-fly-${angle} {
            0% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
            100% {
              opacity: 0;
              transform: translate(
                calc(-50% + ${Math.cos((angle * Math.PI) / 180) * distance}px),
                calc(-50% + ${Math.sin((angle * Math.PI) / 180) * distance}px)
              ) scale(0);
            }
          }
        `;

        document.head.appendChild(style);
        containerRef.current.appendChild(spark);

        setTimeout(() => {
          spark.remove();
          style.remove();
        }, duration);
      }
    },
    [sparkColor, sparkCount, sparkSize, duration]
  );

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", display: "inline-block" }}
      onClick={createSpark}
    >
      {children}
    </div>
  );
};

export default ClickSpark;