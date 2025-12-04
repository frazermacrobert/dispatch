import React from "react";
import { Consultant } from "../game/types";
import "./Intercom.css";

interface IntercomProps {
  dialogue: { consultantId: string; text: string } | null;
  consultants: Consultant[];
}

const Intercom: React.FC<IntercomProps> = ({ dialogue, consultants }) => {
  const consultant = dialogue
    ? consultants.find((c) => c.id === dialogue.consultantId)
    : null;

  // Construct the image path. Assumes Vite serves from the `public` directory.
  // Using Frazer as a fallback since the path is known to be good.
  const imageUrl = consultant
    ? `/dispatch/assets/consultants/${consultant.id}.png`
    : "/dispatch/assets/consultants/frazer.png";

  return (
    <div className={`intercom ${dialogue ? "visible" : ""}`}>
      {dialogue && consultant && (
        <div className="intercom-content">
          <img
            src={imageUrl}
            alt={consultant.name}
            className="intercom-image"
          />
          <p>{dialogue.text}</p>
        </div>
      )}
    </div>
  );
};

export default Intercom;
