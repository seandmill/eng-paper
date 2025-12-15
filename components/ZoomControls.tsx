import React from 'react';
import { Plus, Minus, RotateCcw, FilePlus, FileMinus } from 'lucide-react';

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onAddPage: () => void;
  onRemovePage: () => void;
  canRemovePage: boolean;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
  onAddPage,
  onRemovePage,
  canRemovePage
}) => {
  return (
    <div className="absolute bottom-6 right-6 flex flex-col bg-white rounded-lg shadow-md border border-slate-300 overflow-hidden z-50">
      {/* Page Controls - Mobile Only */}
      <button
        onClick={onAddPage}
        className="lg:hidden p-3 hover:bg-slate-100 active:bg-slate-200 border-b border-slate-200 text-slate-700 transition-colors"
        aria-label="Add Page"
        title="Add Page"
      >
        <FilePlus size={20} />
      </button>
      <button
        onClick={onRemovePage}
        disabled={!canRemovePage}
        className="lg:hidden p-3 hover:bg-slate-100 active:bg-slate-200 border-b border-slate-200 text-slate-700 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
        aria-label="Remove Page"
        title="Remove Page"
      >
        <FileMinus size={20} />
      </button>

      {/* Zoom Controls */}
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