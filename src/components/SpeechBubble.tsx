import React from "react";
import { Consultant } from "../game/types";

interface SpeechBubbleProps {
  dialogue: {
    consultantId: string;
    text: string;
  } | null;
  consultants: Consultant[];
}

const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  dialogue,
  consultants,
}) => {
  if (!dialogue) return null;

  const consultant = consultants.find((c) => c.id === dialogue.consultantId);
  if (!consultant) return null;

  const consultantIndex = consultants.findIndex(
    (c) => c.id === dialogue.consultantId
  );
  if (consultantIndex === -1) return null;

  const leftPosition = `${(consultantIndex / consultants.length) * 100 + 5}%`;

  return (
    <div
      className="speech-bubble"
      style={{
        position: "absolute",
        bottom: "100px",
        left: leftPosition,
        transform: "translateX(-50%)",
        background: "white",
        color: "black",
        padding: "10px 20px",
        borderRadius: "10px",
        zIndex: 200,
        opacity: 0,
        animation: "fadeInOut 4s ease-in-out",
      }}
    >
      {dialogue.text}
      <div
        style={{
          position: "absolute",
          bottom: "-10px",
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderTop: "10px solid white",
        }}
      />
    </div>
  );
};

export default SpeechBubble;
