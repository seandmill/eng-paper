import React, { useState, useRef } from 'react';
import {
  Wrench,
  Type,
  Square,
  Circle,
  Minus,
  Move,
  TrendingUp,
  PenTool,
  Image as ImageIcon,
  Grid3x3,
  Trash2,
  Download,
  Save,
  FolderOpen
} from 'lucide-react';
import { ElementType } from '../types';

interface FloatingToolsButtonProps {
  onAddElement: (type: ElementType) => void;
  onAddImage: (src: string, width: number, height: number) => void;
  onExport: () => void;
  onDelete: () => void;
  hasSelection: boolean;
  snapToGrid: boolean;
  onToggleSnap: () => void;
  isMarkupMode: boolean;
  onToggleMarkup: () => void;
  onSaveProject: () => void;
  onLoadProject: (file: File) => void;
}

const FloatingToolsButton: React.FC<FloatingToolsButtonProps> = ({
  onAddElement,
  onAddImage,
  onExport,
  onDelete,
  hasSelection,
  snapToGrid,
  onToggleSnap,
  isMarkupMode,
  onToggleMarkup,
  onSaveProject,
  onLoadProject
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const closeMenu = () => setIsOpen(false);

  const handleAction = (action: () => void) => {
    action();
    closeMenu();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const maxWidth = 300;
          const width = Math.min(img.naturalWidth, maxWidth);
          const height = (img.naturalHeight / img.naturalWidth) * width;
          onAddImage(src, width, height);
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
    closeMenu();
  };

  const handleProjectLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadProject(file);
    }
    e.target.value = '';
    closeMenu();
  };

  const triggerImageUpload = () => {
    imageInputRef.current?.click();
  };

  const triggerProjectLoad = () => {
    projectInputRef.current?.click();
  };

  const btnClass = "w-full p-3 rounded hover:bg-slate-100 transition-colors flex items-center gap-3 text-slate-700 active:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed";

  return (
    <div className="lg:hidden">
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        hidden
      />
      <input
        type="file"
        ref={projectInputRef}
        onChange={handleProjectLoad}
        accept=".engpaper.json,.engpaper,.json"
        hidden
      />

      {/* Floating Tools Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute bottom-6 left-6 w-14 h-14 bg-green-700 text-white rounded-full shadow-lg hover:bg-green-800 active:bg-green-900 transition-colors flex items-center justify-center z-50"
        aria-label="Tools"
      >
        <Wrench size={24} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Overlay to close menu when clicking outside */}
          <div className="fixed inset-0 z-40 bg-black/10" onClick={closeMenu}></div>

          <div className="absolute bottom-24 left-6 w-64 bg-white shadow-xl border border-slate-200 z-50 flex flex-col p-2 rounded-lg max-h-[70vh] overflow-y-auto">
            {/* File Operations */}
            <div className="flex gap-2 mb-2 pb-2 border-b border-slate-100">
              <button onClick={() => handleAction(triggerProjectLoad)} className={`flex-1 ${btnClass} justify-center bg-slate-50`}>
                <FolderOpen size={18} /> <span className="text-sm font-medium">Open</span>
              </button>
              <button onClick={() => handleAction(onSaveProject)} className={`flex-1 ${btnClass} justify-center bg-slate-50`}>
                <Save size={18} /> <span className="text-sm font-medium">Save</span>
              </button>
            </div>

            {/* Add Elements */}
            <button onClick={() => handleAction(() => onAddElement(ElementType.TEXT))} disabled={isMarkupMode} className={btnClass}>
              <Type size={20} /> <span className="text-sm font-medium">Add Text</span>
            </button>
            <button onClick={() => handleAction(triggerImageUpload)} disabled={isMarkupMode} className={btnClass}>
              <ImageIcon size={20} /> <span className="text-sm font-medium">Add Image</span>
            </button>
            <button onClick={() => handleAction(() => onAddElement(ElementType.RECTANGLE))} disabled={isMarkupMode} className={btnClass}>
              <Square size={20} /> <span className="text-sm font-medium">Add Box</span>
            </button>
            <button onClick={() => handleAction(() => onAddElement(ElementType.CIRCLE))} disabled={isMarkupMode} className={btnClass}>
              <Circle size={20} /> <span className="text-sm font-medium">Add Circle</span>
            </button>
            <button onClick={() => handleAction(() => onAddElement(ElementType.LINE))} disabled={isMarkupMode} className={btnClass}>
              <Minus size={20} /> <span className="text-sm font-medium">Add Line</span>
            </button>
            <button onClick={() => handleAction(() => onAddElement(ElementType.XY_GRAPH))} disabled={isMarkupMode} className={btnClass}>
              <Move size={20} /> <span className="text-sm font-medium">Add XY Graph</span>
            </button>
            <button onClick={() => handleAction(() => onAddElement(ElementType.XY_GRAPH_1Q))} disabled={isMarkupMode} className={btnClass}>
              <TrendingUp size={20} /> <span className="text-sm font-medium">Add 1Q Graph</span>
            </button>

            <div className="h-px bg-slate-200 my-1"></div>

            {/* Tools */}
            <button
              onClick={() => handleAction(onToggleMarkup)}
              className={`${btnClass} ${isMarkupMode ? 'bg-orange-50 text-orange-700' : ''}`}
            >
              <PenTool size={20} />
              <span className="text-sm font-medium">Draw Mode: {isMarkupMode ? 'On' : 'Off'}</span>
            </button>

            <button
              onClick={() => handleAction(onToggleSnap)}
              className={`${btnClass} ${snapToGrid ? 'bg-green-50 text-green-700' : ''}`}
            >
              <Grid3x3 size={20} />
              <span className="text-sm font-medium">Snap to Grid: {snapToGrid ? 'On' : 'Off'}</span>
            </button>

            {hasSelection && !isMarkupMode && (
              <button onClick={() => handleAction(onDelete)} className={`${btnClass} text-red-600 hover:bg-red-50`}>
                <Trash2 size={20} />
                <span className="text-sm font-medium">Delete Selection</span>
              </button>
            )}

            <div className="h-px bg-slate-200 my-1"></div>

            <button
              onClick={() => handleAction(onExport)}
              className={`${btnClass} text-green-700 hover:bg-green-50 font-semibold`}
            >
              <Download size={20} />
              <span className="text-sm font-medium">Export as PDF</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FloatingToolsButton;
