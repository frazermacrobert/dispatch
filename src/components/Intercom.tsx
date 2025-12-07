import React from "react";
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
  const consultant = dialogue 
    ? consultants.find((c) => c.id === dialogue.consultantId)
    : null;

  const avatarFile = consultant ? getAvatarFile(consultant.id) : "";
  const avatarSrc = consultant ? `${import.meta.env.BASE_URL}avatars/${avatarFile}` : "";

  return (
    <div className={`intercom ${dialogue ? "visible" : ""}`}>
      <div className="intercom-content">
        <div className="intercom-message">
          {consultant && (
            <img
              src={avatarSrc}
              alt={consultant.name}
              className="intercom-image"
            />
          )}
          <div className="intercom-text">
            {dialogue ? (
              <>
                <strong>{consultant?.name}:</strong> {dialogue.text}
              </>
            ) : (
              "Awaiting transmission..."
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Intercom;
