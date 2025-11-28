import React from 'react';

interface PauseMenuProps {
  onResume: () => void;
  onQuit: () => void;
}

const PauseMenu: React.FC<PauseMenuProps> = ({ onResume, onQuit }) => {
  return (
    <div className="pause-menu-overlay">
      <div className="pause-menu">
        <h2>Paused</h2>
        <button onClick={onResume} className="button">Resume</button>
        <button onClick={onQuit} className="button">Quit</button>
      </div>
    </div>
  );
};

export default PauseMenu;
