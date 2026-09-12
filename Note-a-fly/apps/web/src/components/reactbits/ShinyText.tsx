"use client";

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
}

const ShinyText = ({
  text,
  disabled = false,
  speed = 5,
  className = "",
}: ShinyTextProps) => {
  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        backgroundImage: disabled
          ? "none"
          : "linear-gradient(120deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 60%)",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: disabled ? undefined : "text",
        backgroundClip: disabled ? undefined : "text",
        color: disabled ? "inherit" : "transparent",
        WebkitTextFillColor: disabled ? undefined : "rgba(255,255,255,0.7)",
        animation: disabled ? "none" : `shiny-text ${speed}s infinite linear`,
      }}
    >
      <style>{`
        @keyframes shiny-text {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
      {text}
    </span>
  );
};

export default ShinyText;