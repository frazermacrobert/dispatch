
import React from "react";
import { ActiveBrief } from "../game/types";

export const MarkerLayer: React.FC<{
  briefs: ActiveBrief[];
  onMarkerClick: (id: string) => void;
}> = ({ briefs, onMarkerClick }) => {
  return (
    <div>
      {briefs.map(b => (
        <button key={b.id} onClick={() => onMarkerClick(b.id)}>
          Marker: {b.name}
        </button>
      ))}
    </div>
  );
};
