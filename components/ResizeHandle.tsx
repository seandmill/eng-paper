import React from 'react';

interface ResizeHandleProps {
  cursor: string;
  onPointerDown: (e: React.PointerEvent) => void;
  positionClass: string;
  scale?: number;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ cursor, onPointerDown, positionClass, scale = 1 }) => {
  return (
    <div
      className={`absolute w-4 h-4 bg-white border border-green-600 rounded-full z-20 ${positionClass} shadow-sm`}
      style={{ 
        cursor,
        // Counter-scale the handle so it remains the same visual size regardless of canvas zoom
        transform: `scale(${1 / scale})`, 
        transformOrigin: 'center center',
        touchAction: 'none'
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent default touch actions
        onPointerDown(e);
      }}
    />
  );
};

export default ResizeHandle;