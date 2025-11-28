
import React from "react";
import { ActiveBrief, Consultant } from "../game/types";

export const BriefModal: React.FC<{
  brief: ActiveBrief;
  consultants: Consultant[];
  onDispatch: (ids: string[]) => void;
  onClose: () => void;
}> = ({ brief, consultants, onDispatch, onClose }) => {
  return (
    <div style={{ background: "#222", padding: "1rem", color: "white" }}>
      <h2>{brief.name}</h2>
      <p>{brief.description}</p>
      <button onClick={onClose}>Close</button>
      <button onClick={() => onDispatch(consultants.map(c => c.id))}>
        Dispatch All
      </button>
    </div>
  );
};
