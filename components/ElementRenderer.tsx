import React from 'react';
import { CanvasElement, ElementType } from '../types';

interface ElementRendererProps {
  element: CanvasElement;
  isEditing: boolean;
  onTextChange: (text: string) => void;
}

// Helper to parse simple markdown (H1-H4, Bold, Italic)
const renderMarkdown = (text: string | undefined) => {
  if (!text) return <span className="opacity-50 italic">Double click to edit</span>;
  
  const lines = text.split('\n');
  
  return lines.map((line, i) => {
    let content = line;
    // Base styles
    let style: React.CSSProperties = { minHeight: '1.2em' }; 
    let className = "leading-normal block";

    // Heading parsing
    if (line.startsWith('# ')) {
      content = line.slice(2);
      className = "font-bold border-b-2 border-current mb-1 pb-1 leading-tight block";
      style = { ...style, fontSize: '1.5em' };
    } else if (line.startsWith('## ')) {
      content = line.slice(3);
      className = "font-bold mb-1 leading-tight block";
      style = { ...style, fontSize: '1.3em' };
    } else if (line.startsWith('### ')) {
      content = line.slice(4);
      className = "font-bold mb-1 leading-tight block";
      style = { ...style, fontSize: '1.1em' };
    } else if (line.startsWith('#### ')) {
      content = line.slice(5);
      className = "font-bold underline mb-1 leading-tight block";
      style = { ...style, fontSize: '1em' };
    }

    // Inline parsing: Bold then Italic
    // Regex splits by **...** or __...__
    const boldParts = content.split(/(\*\*.*?\*\*|__.*?__)/g);
    
    const parsedContent = boldParts.map((bPart, bIdx) => {
        // Check if this part is a bold match
        if ((bPart.startsWith('**') && bPart.endsWith('**') && bPart.length >= 4) || 
            (bPart.startsWith('__') && bPart.endsWith('__') && bPart.length >= 4)) {
            
            const inner = bPart.slice(2, -2);
            
            // Parse italic inside bold
            const iParts = inner.split(/(\*.*?\*|_.*?_)/g);
            return (
                <strong key={`b-${bIdx}`}>
                    {iParts.map((iPart, iIdx) => {
                         if ((iPart.startsWith('*') && iPart.endsWith('*') && iPart.length >= 2) || 
                             (iPart.startsWith('_') && iPart.endsWith('_') && iPart.length >= 2)) {
                             return <em key={`bi-${iIdx}`}>{iPart.slice(1, -1)}</em>;
                         }
                         return iPart;
                    })}
                </strong>
            );
        } else {
             // Parse italic in normal text
             const iParts = bPart.split(/(\*.*?\*|_.*?_)/g);
             return (
                 <React.Fragment key={`n-${bIdx}`}>
                     {iParts.map((iPart, iIdx) => {
                         if ((iPart.startsWith('*') && iPart.endsWith('*') && iPart.length >= 2) || 
                             (iPart.startsWith('_') && iPart.endsWith('_') && iPart.length >= 2)) {
                             return <em key={`ni-${iIdx}`}>{iPart.slice(1, -1)}</em>;
                         }
                         return iPart;
                     })}
                 </React.Fragment>
             );
        }
    });

    return (
      <div key={i} className={className} style={style}>
        {parsedContent.length === 0 || (parsedContent.length === 1 && parsedContent[0] === "") 
          ? <br/> 
          : parsedContent}
      </div>
    );
  });
};

const ElementRenderer: React.FC<ElementRendererProps> = ({ element, isEditing, onTextChange }) => {
  const commonStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: element.backgroundColor || 'transparent',
    borderColor: element.borderColor || 'black',
    borderWidth: `${element.borderWidth ?? 2}px`,
    opacity: element.opacity ?? 1,
    boxSizing: 'border-box',
  };

  const strokeColor = element.borderColor || '#000000';
  const strokeWidth = element.borderWidth ?? 2;
  const arrowSize = Math.max(8, strokeWidth * 3); // Dynamic arrow size based on stroke

  switch (element.type) {
    case ElementType.RECTANGLE:
      return (
        <div style={{ ...commonStyle, borderStyle: 'solid' }} />
      );

    case ElementType.CIRCLE:
      return (
        <div style={{ ...commonStyle, borderRadius: '50%', borderStyle: 'solid' }} />
      );

    case ElementType.LINE:
      // A line is just a div with a bottom border, positioned in the middle
      return (
        <div className="w-full h-full flex items-center justify-center">
            <div 
                style={{ 
                    width: '100%', 
                    height: `${strokeWidth}px`, 
                    backgroundColor: strokeColor 
                }} 
            />
        </div>
      );
      
    case ElementType.IMAGE:
      return (
        <div style={{ ...commonStyle, borderStyle: element.borderWidth ? 'solid' : 'none', overflow: 'hidden' }}>
            <img 
                src={element.src} 
                alt="User Content"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'fill',
                    pointerEvents: 'none', // Allow clicks to pass through to the container
                    userSelect: 'none'
                }}
                draggable={false}
            />
        </div>
      );

    case ElementType.XY_GRAPH: {
        const midX = element.width / 2;
        const midY = element.height / 2;
        return (
            <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                {/* Horizontal Line */}
                <line x1={0} y1={midY} x2={element.width} y2={midY} stroke={strokeColor} strokeWidth={strokeWidth} />
                {/* Vertical Line */}
                <line x1={midX} y1={0} x2={midX} y2={element.height} stroke={strokeColor} strokeWidth={strokeWidth} />
                
                {/* Right Arrow */}
                <path d={`M${element.width},${midY} L${element.width - arrowSize},${midY - arrowSize/2} L${element.width - arrowSize},${midY + arrowSize/2} Z`} fill={strokeColor} />
                {/* Left Arrow */}
                <path d={`M0,${midY} L${arrowSize},${midY - arrowSize/2} L${arrowSize},${midY + arrowSize/2} Z`} fill={strokeColor} />
                {/* Bottom Arrow */}
                <path d={`M${midX},${element.height} L${midX - arrowSize/2},${element.height - arrowSize} L${midX + arrowSize/2},${element.height - arrowSize} Z`} fill={strokeColor} />
                {/* Top Arrow */}
                <path d={`M${midX},0 L${midX - arrowSize/2},${arrowSize} L${midX + arrowSize/2},${arrowSize} Z`} fill={strokeColor} />
            </svg>
        );
    }

    case ElementType.XY_GRAPH_1Q: {
        // Adjust for stroke width so lines don't get clipped at the edges
        const xOffset = strokeWidth / 2;
        const yOffset = element.height - strokeWidth / 2;
        
        return (
            <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                {/* Horizontal Line */}
                <line x1={0} y1={yOffset} x2={element.width} y2={yOffset} stroke={strokeColor} strokeWidth={strokeWidth} />
                {/* Vertical Line */}
                <line x1={xOffset} y1={0} x2={xOffset} y2={element.height} stroke={strokeColor} strokeWidth={strokeWidth} />
                
                {/* Right Arrow */}
                <path d={`M${element.width},${yOffset} L${element.width - arrowSize},${yOffset - arrowSize/2} L${element.width - arrowSize},${yOffset + arrowSize/2} Z`} fill={strokeColor} />
                {/* Top Arrow */}
                <path d={`M${xOffset},0 L${xOffset - arrowSize/2},${arrowSize} L${xOffset + arrowSize/2},${arrowSize} Z`} fill={strokeColor} />
            </svg>
        );
    }

    case ElementType.TEXT:
      return (
        <div 
          style={{ 
            ...commonStyle, 
            borderStyle: element.borderWidth ? 'solid' : 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: `${element.padding ?? 4}px`,
          }}
        >
          {isEditing ? (
            <textarea
              className="w-full h-full bg-transparent resize-none outline-none p-0 m-0 leading-normal select-text"
              style={{
                fontFamily: element.fontFamily || 'Patrick Hand, cursive',
                fontSize: `${element.fontSize || 16}px`,
                fontWeight: element.fontWeight || '400',
                textAlign: element.textAlign || 'left',
                color: element.color || '#000000',
              }}
              value={element.content || ''}
              onChange={(e) => onTextChange(e.target.value)}
              autoFocus
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              placeholder="Type markdown here... (# Heading, **bold**, *italic*)"
            />
          ) : (
            <div
              className="w-full h-full break-words pointer-events-none"
              style={{
                fontFamily: element.fontFamily || 'Patrick Hand, cursive',
                fontSize: `${element.fontSize || 16}px`,
                fontWeight: element.fontWeight || '400',
                textAlign: element.textAlign || 'left',
                color: element.color || '#000000',
              }}
            >
              {renderMarkdown(element.content)}
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
};

export default ElementRenderer;