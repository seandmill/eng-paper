import React from 'react';
import { Plus, Minus, RotateCcw } from 'lucide-react';

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ scale, onZoomIn, onZoomOut, onReset }) => {
  return (
    <div className="absolute bottom-6 right-6 flex flex-col bg-white rounded-lg shadow-md border border-slate-300 overflow-hidden z-50">
      <button 
        onClick={onZoomIn} 
        className="p-3 hover:bg-slate-100 active:bg-slate-200 border-b border-slate-200 text-slate-700 transition-colors"
        aria-label="Zoom In"
      >
        <Plus size={20} />
      </button>
      <div 
        className="py-2 px-1 text-[10px] font-mono font-medium text-slate-600 text-center bg-slate-50 border-b border-slate-200 cursor-default select-none"
      >
        {Math.round(scale * 100)}%
      </div>
      <button 
        onClick={onZoomOut} 
        className="p-3 hover:bg-slate-100 active:bg-slate-200 border-b border-slate-200 text-slate-700 transition-colors"
        aria-label="Zoom Out"
      >
        <Minus size={20} />
      </button>
       <button 
         onClick={onReset} 
         className="p-3 hover:bg-slate-100 active:bg-slate-200 text-slate-700 transition-colors" 
         title="Reset Zoom"
         aria-label="Reset Zoom"
        >
        <RotateCcw size={16} />
      </button>
    </div>
  );
};

export default ZoomControls;