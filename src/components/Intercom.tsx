import React, { useEffect, useState, useRef } from "react";
import { Consultant } from "../game/types";

interface IntercomProps {
  dialogue: {
    consultantId: string;
    text: string;
  } | null;
  consultants: Consultant[];
}

const getAvatarFile = (id: string): string => {
  switch (id) {
    case "craig":
      return "craig-design-1.png";
    case "miles":
      return "miles-motion-1.png";
    case "ste":
      return "ste-content-1.png";
    default:
      return `${id}-consultant-1.png`;
  }
};

const Intercom: React.FC<IntercomProps> = ({ dialogue, consultants }) => {
  const [displayText, setDisplayText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    if (!dialogue) {
      // Clear animation when dialogue is null
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setDisplayText("");
      setIsAnimating(false);
      return;
    }

    // Start new ticker animation
    setIsAnimating(true);
    const fullText = dialogue.text;
    const scrollDuration = 6000; // 6 seconds to scroll across
    startTimeRef.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current!;
      const progress = elapsed / scrollDuration;

      if (progress >= 1) {
        // Animation complete - clear everything
        setDisplayText("");
        setIsAnimating(false);
        return;
      }

      // Calculate visible text based on progress
      // Text enters from right and exits to left
      const containerWidth = 100; // percentage
      const textStartPos = 100 - (progress * 200); // Starts at 100%, ends at -100%
      
      // Only show text when it's in the visible area
      if (textStartPos < 100 && textStartPos > -100) {
        setDisplayText(fullText);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dialogue]);

  const consultant = dialogue
    ? consultants.find((c) => c.id === dialogue.consultantId)
    : null;

  const avatarSrc = consultant
    ? `${import.meta.env.BASE_URL}avatars/${getAvatarFile(consultant.id)}`
    : "";

  return (
    <div
      style={{
        position: "absolute",
        top: "4.5rem",
        left: "2rem",
        right: "2rem",
        height: "4rem",
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(8px)",
        borderRadius: "0.75rem",
        border: "1px solid rgba(148, 163, 184, 0.4)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "0 1rem",
        zIndex: 90,
        overflow: "hidden",
      }}
    >
      {/* Broadcasting icon - left */}
      <div
        style={{
          fontSize: "1.5rem",
          opacity: isAnimating ? 1 : 0.3,
          transition: "opacity 0.3s ease",
          animation: isAnimating ? "pulse 2s ease-in-out infinite" : "none",
        }}
      >
        📡
      </div>

      {/* Avatar box - left side */}
      <div
        style={{
          width: "3rem",
          height: "3rem",
          borderRadius: "0.5rem",
          border: "2px solid rgba(148, 163, 184, 0.5)",
          background: "rgba(30, 41, 59, 0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
          opacity: isAnimating ? 1 : 0,
          transform: isAnimating ? "scale(1)" : "scale(0.8)",
          transition: "opacity 0.3s ease, transform 0.3s ease",
        }}
      >
        {consultant && (
          <img
            src={avatarSrc}
            alt={consultant.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "0.375rem",
            }}
          />
        )}
      </div>

      {/* Ticker message area */}
      <div
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            whiteSpace: "nowrap",
            fontSize: "0.95rem",
            color: "#e5e7eb",
            fontWeight: 500,
            animation: isAnimating ? "ticker 6s linear forwards" : "none",
            letterSpacing: "0.02em",
          }}
        >
          {displayText}
        </div>
      </div>

      {/* Broadcasting icon - right */}
      <div
        style={{
          fontSize: "1.5rem",
          opacity: isAnimating ? 1 : 0.3,
          transition: "opacity 0.3s ease",
          animation: isAnimating ? "pulse 2s ease-in-out infinite 1s" : "none",
        }}
      >
        📡
      </div>

      {/* CSS animations injected via style tag */}
      <style>{`
        @keyframes ticker {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
};

export default Intercom;
