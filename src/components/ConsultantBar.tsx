
import React from "react";
import { Consultant } from "../game/types";

export const ConsultantBar: React.FC<{
  consultants: Consultant[];
  onToggleSelect: (id: string) => void;
}> = ({ consultants, onToggleSelect }) => {
  return (
    <div style={{ padding: "1rem", background: "#111", color: "white" }}>
      {consultants.map(c => (
        <button
          key={c.id}
          onClick={() => onToggleSelect(c.id)}
          style={{ marginRight: "0.5rem" }}
        >
          {c.name} ({c.state})
        </button>
      ))}
    </div>
  );
};
