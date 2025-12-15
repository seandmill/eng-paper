import React, { useState } from 'react';
import { CanvasElement, ElementType } from '../types';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Type, 
  Bold, 
  RotateCcw,
  Settings2,
  Pen,
  Eraser,
  Ban
} from 'lucide-react';

interface PropertyPanelProps {
  element: CanvasElement | null;
  onChange: (updates: Partial<CanvasElement>) => void;
  isMarkupMode: boolean;
  markupTool: 'pen' | 'eraser';
  setMarkupTool: (t: 'pen' | 'eraser') => void;
  markupColor: string;
  setMarkupColor: (c: string) => void;
  markupWidth: number;
  setMarkupWidth: (w: number) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ 
    element, 
    onChange,
    isMarkupMode,
    markupTool,
    setMarkupTool,
    markupColor,
    setMarkupColor,
    markupWidth,
    setMarkupWidth
}) => {
  const [showMore, setShowMore] = useState(false);

  const handleNumChange = (field: keyof CanvasElement, value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      onChange({ [field]: num });
    }
  };

  // Helper Component: Compact Color Picker
  const ColorPicker = ({ 
    label, 
    value, 
    onChange, 
    allowTransparent = false 
  }: { 
    label: string, 
    value?: string, 
    onChange: (c: string) => void, 
    allowTransparent?: boolean 
  }) => {
    const isTransparent = value === 'transparent';
    // Fallback to black for the picker input if value is transparent or undefined
    const displayValue = isTransparent || !value ? '#000000' : value;

    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[8px] text-slate-400 font-bold uppercase">{label}</span>
        <div className="flex gap-1.5 items-center">
          {/* Native Color Input Masked */}
          <div 
            className={`relative w-6 h-6 rounded-full border overflow-hidden shadow-sm transition-all ${isTransparent ? 'border-slate-200 opacity-50' : 'border-slate-300'}`}
            style={{ backgroundColor: displayValue }}
          >
             <input
               type="color"
               value={displayValue}
               onChange={(e) => onChange(e.target.value)}
               className="absolute -top-2 -left-2 w-10 h-10 p-0 border-0 opacity-0 cursor-pointer"
               title="Choose Color"
             />
          </div>

          {/* Transparent Toggle */}
          {allowTransparent && (
             <button
               onClick={() => onChange('transparent')}
               className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${isTransparent ? 'bg-slate-100 border-slate-400 text-slate-600' : 'bg-transparent border-transparent text-slate-300 hover:text-slate-400'}`}
               title="Transparent / No Color"
             >
               <Ban size={14} />
             </button>
          )}
        </div>
      </div>
    );
  };

  // --- Markup Mode View ---
  if (isMarkupMode) {
    return (
        <div className="relative w-full h-14 bg-orange-50 border-b border-orange-200 flex items-center px-2 gap-3 z-40">
             <div className="flex items-center gap-1 bg-white border border-orange-200 rounded p-1">
                <button 
                    onClick={() => setMarkupTool('pen')}
                    className={`p-1.5 rounded ${markupTool === 'pen' ? 'bg-orange-100 text-orange-700' : 'text-slate-400 hover:bg-slate-50'}`}
                    title="Pen"
                >
                    <Pen size={18} />
                </button>
                <button 
                    onClick={() => setMarkupTool('eraser')}
                    className={`p-1.5 rounded ${markupTool === 'eraser' ? 'bg-orange-100 text-orange-700' : 'text-slate-400 hover:bg-slate-50'}`}
                    title="Eraser"
                >
                    <Eraser size={18} />
                </button>
             </div>

             <div className="w-px h-8 bg-orange-200"></div>

             {markupTool === 'pen' && (
                 <>
                    <ColorPicker 
                        label="Ink" 
                        value={markupColor} 
                        onChange={setMarkupColor} 
                        allowTransparent={false}
                    />
                    <div className="w-px h-8 bg-orange-200"></div>
                 </>
             )}

            <div className="flex flex-col gap-0.5 w-24">
                <span className="text-[8px] text-orange-400 font-bold uppercase">Size: {markupWidth}px</span>
                <input 
                    type="range" 
                    min="1" max="20" 
                    value={markupWidth} 
                    onChange={(e) => setMarkupWidth(Number(e.target.value))}
                    className="h-1.5 w-full bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                />
            </div>
            
             <div className="ml-auto text-xs font-medium text-orange-700 hidden sm:block">
                 Markup Mode Active
             </div>
        </div>
    );
  }

  // --- No Selection View ---
  if (!element) {
    return (
      <div className="w-full h-14 bg-slate-50 border-b border-slate-300 flex items-center px-4 text-slate-400 text-xs font-medium uppercase tracking-wide">
        Select an object to edit
      </div>
    );
  }

  // --- Element Selection View ---
  return (
    <div className="relative w-full h-14 bg-slate-50 border-b border-slate-300 flex items-center px-2 gap-3 z-40">
      
      {/* Scrollable container for visible items */}
      <div className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar whitespace-nowrap pr-2">
      
      {/* Text Specific Visible: Font Size & Color */}
      {element.type === ElementType.TEXT && (
        <>
           {/* Font Size */}
            <div className="flex items-center bg-white border border-slate-200 rounded px-1.5 py-1 flex-shrink-0" title="Font Size">
               <Type size={12} className="text-slate-400 mr-1" />
               <input 
                  type="number" 
                  min="8" max="100"
                  value={element.fontSize || 16} 
                  onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
                  className="w-8 text-xs outline-none bg-transparent font-medium text-slate-700"
                />
            </div>

            <div className="w-px h-8 bg-slate-200 flex-shrink-0"></div>

            <ColorPicker 
                label="Text" 
                value={element.color} 
                onChange={(c) => onChange({ color: c })}
                allowTransparent={false}
            />

             <div className="w-px h-8 bg-slate-200 flex-shrink-0"></div>
        </>
      )}

      {/* Common Visible: Fill, Stroke, Width */}
      {element.type !== ElementType.IMAGE && (
        <>
            <ColorPicker 
                label="Fill" 
                value={element.backgroundColor} 
                onChange={(c) => onChange({ backgroundColor: c })}
                allowTransparent={true}
            />

            <div className="w-px h-8 bg-slate-200 flex-shrink-0"></div>
        </>
      )}

      <ColorPicker 
          label={element.type === ElementType.IMAGE ? "Border" : "Stroke"} 
          value={element.borderColor} 
          onChange={(c) => onChange({ borderColor: c })}
          allowTransparent={true}
      />

       <div className="flex flex-col gap-0.5 w-16 flex-shrink-0">
            <span className="text-[8px] text-slate-400 font-bold uppercase">{element.type === ElementType.IMAGE ? "Border" : "Width"}: {element.borderWidth}px</span>
            <input 
              type="range" 
              min="0" max="10" 
              value={element.borderWidth ?? 2} 
              onChange={(e) => onChange({ borderWidth: Number(e.target.value) })}
              className="h-1.5 w-full bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
       </div>

      </div>

      {/* More Button */}
      <button 
        onClick={() => setShowMore(!showMore)}
        className={`p-2 rounded hover:bg-slate-200 text-slate-600 transition-colors flex-shrink-0 ${showMore ? 'bg-slate-200 text-slate-900' : ''}`}
        title="More Properties"
      >
        <Settings2 size={20} />
      </button>

      {/* Dropdown Menu */}
      {showMore && (
        <>
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowMore(false)}></div>
          <div className="absolute top-full right-0 mt-1 w-64 bg-white shadow-xl border border-slate-200 rounded-bl-lg p-3 z-50 flex flex-col gap-3">
             
             {/* Geometry Section */}
             <div className="flex flex-col gap-1">
                 <span className="text-xs font-semibold text-slate-500 uppercase">Geometry</span>
                 <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-2 py-1">
                        <span className="text-xs text-slate-400 font-bold w-4">X</span>
                        <input 
                            type="number" 
                            value={Math.round(element.x)} 
                            onChange={(e) => handleNumChange('x', e.target.value)}
                            className="w-full text-xs font-mono outline-none bg-transparent"
                        />
                    </div>
                     <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-2 py-1">
                        <span className="text-xs text-slate-400 font-bold w-4">Y</span>
                        <input 
                            type="number" 
                            value={Math.round(element.y)} 
                            onChange={(e) => handleNumChange('y', e.target.value)}
                            className="w-full text-xs font-mono outline-none bg-transparent"
                        />
                    </div>
                     <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-2 py-1">
                        <span className="text-xs text-slate-400 font-bold w-4">W</span>
                        <input 
                            type="number" 
                            value={Math.round(element.width)} 
                            onChange={(e) => handleNumChange('width', e.target.value)}
                            className="w-full text-xs font-mono outline-none bg-transparent"
                        />
                    </div>
                     <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-2 py-1">
                        <span className="text-xs text-slate-400 font-bold w-4">H</span>
                        <input 
                            type="number" 
                            value={Math.round(element.height)} 
                            onChange={(e) => handleNumChange('height', e.target.value)}
                            className="w-full text-xs font-mono outline-none bg-transparent"
                        />
                    </div>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-2 py-1 col-span-2">
                        <RotateCcw size={12} className="text-slate-400 mr-2" />
                        <input 
                            type="number" 
                            value={Math.round(element.rotation || 0)} 
                            onChange={(e) => handleNumChange('rotation', e.target.value)}
                            className="w-full text-xs font-mono outline-none bg-transparent"
                        />
                        <span className="text-xs text-slate-400 ml-1">deg</span>
                    </div>
                 </div>
             </div>

             {/* Text Extra Section */}
             {element.type === ElementType.TEXT && (
                <>
                    <div className="h-px bg-slate-100"></div>
                    <div className="flex flex-col gap-1">
                         <span className="text-xs font-semibold text-slate-500 uppercase">Typography</span>
                         
                         <select 
                          value={element.fontFamily || 'Patrick Hand'} 
                          onChange={(e) => onChange({ fontFamily: e.target.value })}
                          className="w-full text-sm border border-slate-200 rounded py-1.5 px-2 bg-slate-50 outline-none"
                        >
                          <option value="Patrick Hand">Patrick Hand</option>
                          <option value="Caveat">Caveat</option>
                          <option value="Kalam">Kalam</option>
                          <option value="Indie Flower">Indie Flower</option>
                          <option value="Architects Daughter">Architects</option>
                        </select>

                        <div className="flex gap-2 mt-1">
                             <button 
                                onClick={() => onChange({ fontWeight: element.fontWeight === 'bold' || element.fontWeight === '700' ? '400' : 'bold' })}
                                className={`flex-1 flex items-center justify-center p-1.5 border border-slate-200 rounded ${element.fontWeight === 'bold' || element.fontWeight === '700' ? 'bg-slate-200 text-black' : 'bg-slate-50 text-slate-500'}`}
                            >
                                <Bold size={16} />
                                <span className="text-xs ml-1">Bold</span>
                            </button>
                        </div>
                        
                        <div className="flex border border-slate-200 rounded bg-slate-50 overflow-hidden mt-1">
                            <button onClick={() => onChange({ textAlign: 'left' })} className={`flex-1 p-1.5 flex justify-center ${element.textAlign === 'left' ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}><AlignLeft size={16} /></button>
                            <button onClick={() => onChange({ textAlign: 'center' })} className={`flex-1 p-1.5 flex justify-center ${element.textAlign === 'center' ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}><AlignCenter size={16} /></button>
                            <button onClick={() => onChange({ textAlign: 'right' })} className={`flex-1 p-1.5 flex justify-center ${element.textAlign === 'right' ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}><AlignRight size={16} /></button>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">Padding:</span>
                            <input 
                                type="range" 
                                min="0" max="50"
                                value={element.padding ?? 4} 
                                onChange={(e) => onChange({ padding: Number(e.target.value) })}
                                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-xs text-slate-500 w-4">{element.padding ?? 4}</span>
                        </div>
                    </div>
                </>
             )}
          </div>
        </>
      )}
    </div>
  );
};

export default PropertyPanel;