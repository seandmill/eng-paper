import React, { useState, useRef } from 'react';
import {
  Type,
  Square,
  Circle,
  Minus,
  Download,
  Trash2,
  Grid3x3,
  Undo2,
  Redo2,
  Menu,
  X,
  PenTool,
  Move,
  TrendingUp,
  Shapes,
  ChevronDown,
  Image as ImageIcon,
  FilePlus,
  FileMinus,
  Save,
  FolderOpen,
  Share2
} from 'lucide-react';
import { ElementType } from '../types';
import logoImage from '../assets/images/eng_paper_logo.png';

interface ToolbarProps {
  onAddElement: (type: ElementType) => void;
  onAddImage: (src: string, width: number, height: number) => void;
  onAddPage: () => void;
  onRemovePage: () => void;
  canRemovePage: boolean;
  onExport: () => void;
  onDelete: () => void;
  hasSelection: boolean;
  snapToGrid: boolean;
  onToggleSnap: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isMarkupMode: boolean;
  onToggleMarkup: () => void;
  // Project Management
  onSaveProject: () => void;
  onLoadProject: (file: File) => void;
  onShareProject: () => void;
  fileName: string;
  onFileNameChange: (name: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onAddElement,
  onAddImage,
  onAddPage,
  onRemovePage,
  canRemovePage,
  onExport,
  onDelete,
  hasSelection,
  snapToGrid,
  onToggleSnap,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isMarkupMode,
  onToggleMarkup,
  onSaveProject,
  onLoadProject,
  onShareProject,
  fileName,
  onFileNameChange
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'shapes' | 'graphs' | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  // Desktop button style (Vertical layout)
  const desktopBtnClass = "p-2 rounded hover:bg-slate-200 transition-colors flex flex-col items-center gap-1 text-slate-700 active:bg-slate-300 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed min-w-[3rem]";
  const desktopLabelClass = "text-[10px] font-medium whitespace-nowrap";

  // Mobile menu button style (Horizontal layout)
  const mobileBtnClass = "w-full p-3 rounded hover:bg-slate-100 transition-colors flex items-center gap-3 text-slate-700 active:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed";
  const mobileLabelClass = "text-sm font-medium";

  const closeMenu = () => setIsMenuOpen(false);
  const closeDropdown = () => setActiveDropdown(null);

  const handleAction = (action: () => void) => {
    action();
    closeMenu();
    closeDropdown();
  };

  const handleAdd = (type: ElementType) => {
    onAddElement(type);
    closeDropdown();
  };

  const toggleDropdown = (name: 'shapes' | 'graphs') => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          // Default max width 300px, calculate height to maintain aspect ratio
          const maxWidth = 300;
          const width = Math.min(img.naturalWidth, maxWidth);
          const height = (img.naturalHeight / img.naturalWidth) * width;
          onAddImage(src, width, height);
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    }
    // Reset input
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
  }

  const triggerImageUpload = () => {
    imageInputRef.current?.click();
  };

  const triggerProjectLoad = () => {
      projectInputRef.current?.click();
  }

  return (
    <div className="h-16 bg-white border-b border-slate-300 flex items-center px-4 shadow-sm justify-between z-50 relative">
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

      {/* Left Side: Logo + File Controls */}
      <div className="flex items-center gap-2">
        {/* Logo + Title */}
        <div className="flex items-center gap-2 pr-2 lg:pr-4 lg:border-r lg:border-slate-300 lg:mr-2">
          <img src={logoImage} alt="Eng.Paper" className="w-8 h-8 rounded-sm" />
          <input
            type="text"
            value={fileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            className="w-32 lg:w-40 text-sm font-semibold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-green-600 outline-none bg-transparent px-1 truncate transition-colors"
            placeholder="Untitled Project"
            title="Edit File Name"
          />
        </div>

        {/* Desktop-only toolbar buttons */}
        <div className="hidden lg:flex items-center gap-2 border-l border-slate-300 pl-2">
          {/* File Operations */}
          <button
              onClick={triggerProjectLoad}
              className={desktopBtnClass}
              title="Open Project"
          >
            <FolderOpen size={20} />
            <span className={desktopLabelClass}>Open</span>
          </button>

          <button
              onClick={onSaveProject}
              className={desktopBtnClass}
              title="Save Project (.engpaper.json)"
          >
            <Save size={20} />
            <span className={desktopLabelClass}>Save</span>
          </button>

          <button
              onClick={onShareProject}
              className={desktopBtnClass}
              title="Share Project Link"
          >
            <Share2 size={20} />
            <span className={desktopLabelClass}>Share</span>
          </button>

          <div className="w-px h-8 bg-slate-300 mx-1"></div>

          {/* Text Tool */}
          <button
              onClick={() => { if(!isMarkupMode) handleAdd(ElementType.TEXT); }}
              disabled={isMarkupMode}
              className={desktopBtnClass}
          >
            <Type size={20} />
            <span className={desktopLabelClass}>Text</span>
          </button>

          {/* Image Tool */}
          <button
              onClick={() => { if(!isMarkupMode) triggerImageUpload(); }}
              disabled={isMarkupMode}
              className={desktopBtnClass}
          >
            <ImageIcon size={20} />
            <span className={desktopLabelClass}>Image</span>
          </button>

          <div className="w-px h-8 bg-slate-300 mx-1"></div>

          {/* Shapes Dropdown */}
          <div className="relative">
            <button
              onClick={() => !isMarkupMode && toggleDropdown('shapes')}
              disabled={isMarkupMode}
              className={`${desktopBtnClass} ${activeDropdown === 'shapes' ? 'bg-slate-200' : ''}`}
            >
              <Shapes size={20} />
              <span className={`${desktopLabelClass} flex items-center gap-0.5`}>
                Shapes <ChevronDown size={8} />
              </span>
            </button>

            {activeDropdown === 'shapes' && (
              <>
                <div className="fixed inset-0 z-40" onClick={closeDropdown} />
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg p-1 flex flex-col gap-1 min-w-[140px] z-50">
                  <button onClick={() => handleAdd(ElementType.RECTANGLE)} className="w-full flex items-center gap-3 p-2 hover:bg-slate-100 rounded text-slate-700 text-left">
                    <Square size={16} /> <span className="text-sm font-medium">Box</span>
                  </button>
                  <button onClick={() => handleAdd(ElementType.CIRCLE)} className="w-full flex items-center gap-3 p-2 hover:bg-slate-100 rounded text-slate-700 text-left">
                    <Circle size={16} /> <span className="text-sm font-medium">Circle</span>
                  </button>
                  <button onClick={() => handleAdd(ElementType.LINE)} className="w-full flex items-center gap-3 p-2 hover:bg-slate-100 rounded text-slate-700 text-left">
                    <Minus size={16} /> <span className="text-sm font-medium">Line</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Graphs Dropdown */}
          <div className="relative">
            <button
              onClick={() => !isMarkupMode && toggleDropdown('graphs')}
              disabled={isMarkupMode}
              className={`${desktopBtnClass} ${activeDropdown === 'graphs' ? 'bg-slate-200' : ''}`}
            >
              <Move size={20} />
              <span className={`${desktopLabelClass} flex items-center gap-0.5`}>
                Graphs <ChevronDown size={8} />
              </span>
            </button>

            {activeDropdown === 'graphs' && (
              <>
                <div className="fixed inset-0 z-40" onClick={closeDropdown} />
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg p-1 flex flex-col gap-1 min-w-[140px] z-50">
                  <button onClick={() => handleAdd(ElementType.XY_GRAPH)} className="w-full flex items-center gap-3 p-2 hover:bg-slate-100 rounded text-slate-700 text-left">
                    <Move size={16} /> <span className="text-sm font-medium">XY Graph</span>
                  </button>
                  <button onClick={() => handleAdd(ElementType.XY_GRAPH_1Q)} className="w-full flex items-center gap-3 p-2 hover:bg-slate-100 rounded text-slate-700 text-left">
                    <TrendingUp size={16} /> <span className="text-sm font-medium">1Q Graph</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="w-px h-8 bg-slate-300 mx-1"></div>

          <button
              onClick={onToggleMarkup}
              className={`${desktopBtnClass} ${isMarkupMode ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' : ''}`}
              title="Toggle Markup Mode"
          >
            <PenTool size={20} />
            <span className={desktopLabelClass}>Draw</span>
          </button>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2 lg:gap-4">

        {/* Page Controls - Desktop Only */}
        <div className="hidden lg:flex items-center gap-1">
             <button
              onClick={onAddPage}
              className={desktopBtnClass}
              title="Add Page"
            >
              <FilePlus size={20} />
              <span className={desktopLabelClass}>Add Page</span>
            </button>
            <button
              onClick={onRemovePage}
              disabled={!canRemovePage}
              className={`${desktopBtnClass} hover:text-red-600`}
              title="Remove Page"
            >
              <FileMinus size={20} />
              <span className={desktopLabelClass}>Del Page</span>
            </button>
        </div>

        <div className="hidden lg:block w-px h-8 bg-slate-300"></div>

        {/* Undo/Redo - Always visible */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={desktopBtnClass}
          title="Undo"
        >
          <Undo2 size={20} />
          <span className={desktopLabelClass}>Undo</span>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={desktopBtnClass}
          title="Redo"
        >
          <Redo2 size={20} />
          <span className={desktopLabelClass}>Redo</span>
        </button>

        <div className="hidden lg:block w-px h-8 bg-slate-300"></div>

        <button
          onClick={onToggleSnap}
          className={`hidden lg:flex ${desktopBtnClass} ${snapToGrid ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}`}
          title="Toggle Snap to Grid"
        >
          <Grid3x3 size={20} />
          <span className={desktopLabelClass}>{snapToGrid ? 'On' : 'Off'}</span>
        </button>

        <div className="hidden lg:block w-px h-8 bg-slate-300"></div>

         {hasSelection && !isMarkupMode && (
            <button onClick={onDelete} className={`hidden lg:flex ${desktopBtnClass} text-red-600 hover:bg-red-50 hover:text-red-700`}>
              <Trash2 size={20} />
              <span className={desktopLabelClass}>Delete</span>
            </button>
         )}

        <button
          onClick={onExport}
          className="hidden lg:flex bg-green-700 text-white px-4 py-2 rounded shadow hover:bg-green-800 items-center gap-2 transition-colors ml-2 h-10"
        >
          <Download size={18} />
          <span className={desktopLabelClass}>Export PDF</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;