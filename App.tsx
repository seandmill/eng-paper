import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CanvasElement, ElementType, SelectionState, Page, ProjectFile } from './types';
import Toolbar from './components/Toolbar';
import PropertyPanel from './components/PropertyPanel';
import ElementRenderer from './components/ElementRenderer';
import ResizeHandle from './components/ResizeHandle';
import ZoomControls from './components/ZoomControls';
import FloatingToolsButton from './components/FloatingToolsButton';
import { exportToPdf } from './services/pdfService';
import { RotateCcw, AlertTriangle } from 'lucide-react';

const PAGE_WIDTH = 794; // approx A4 width in pixels at 96 DPI (or scaled for screen)
const PAGE_HEIGHT = 1123; 
const GRID_SIZE = 20;

// History State Definition
interface HistoryState {
  elements: CanvasElement[];
  markup: Record<string, string>; // Page ID -> Data URL
  pages: Page[];
}

function App() {
  // Initialize state from local storage once
  const [initialState] = useState(() => {
    try {
      const saved = localStorage.getItem('engineering-paper-data');
      if (!saved) {
          const defaultPageId = uuidv4();
          return {
              elements: [],
              pages: [{ id: defaultPageId }],
              markupData: {},
              scale: 1,
              snapToGrid: false,
              fileName: 'Untitled Project'
          };
      }
      
      const parsed = JSON.parse(saved);
      
      // Migration: Ensure pages exist
      let loadedPages = parsed.pages;
      let defaultPageId = '';
      if (!loadedPages || loadedPages.length === 0) {
          defaultPageId = uuidv4();
          loadedPages = [{ id: defaultPageId }];
      } else {
          defaultPageId = loadedPages[0].id;
      }

      // Migration: Ensure elements have pageId
      let loadedElements = parsed.elements || [];
      loadedElements = loadedElements.map((e: any) => e.pageId ? e : { ...e, pageId: defaultPageId });

      // Migration: Convert old single-string markup to object
      let loadedMarkup = parsed.markupData;
      if (typeof loadedMarkup === 'string') {
          loadedMarkup = { [defaultPageId]: loadedMarkup };
      } else if (!loadedMarkup) {
          loadedMarkup = {};
      }

      return {
          elements: loadedElements,
          pages: loadedPages,
          markupData: loadedMarkup,
          scale: parsed.scale,
          snapToGrid: parsed.snapToGrid,
          fileName: parsed.fileName || 'Untitled Project'
      };

    } catch (e) {
      console.error("Failed to load state", e);
      const defaultPageId = uuidv4();
      return {
          elements: [],
          pages: [{ id: defaultPageId }],
          markupData: {},
          scale: 1,
          snapToGrid: false,
          fileName: 'Untitled Project'
      };
    }
  });

  const [pages, setPages] = useState<Page[]>(initialState.pages);
  const [elements, setElements] = useState<CanvasElement[]>(initialState.elements);
  const [selection, setSelection] = useState<SelectionState>({ id: null, isEditingText: false });
  const [scale, setScale] = useState(initialState.scale || 1);
  const [snapToGrid, setSnapToGrid] = useState(initialState.snapToGrid || false);
  const [activePageId, setActivePageId] = useState<string>(initialState.pages[0].id);
  const [fileName, setFileName] = useState<string>(initialState.fileName);
  
  // --- Markup / Paint State ---
  const [isMarkupMode, setIsMarkupMode] = useState(false);
  const [markupTool, setMarkupTool] = useState<'pen' | 'eraser'>('pen');
  const [markupColor, setMarkupColor] = useState('#000000');
  const [markupWidth, setMarkupWidth] = useState(2);
  const [markupData, setMarkupData] = useState<Record<string, string>>(initialState.markupData || {});

  // --- UI State ---
  const [showDeletePageDialog, setShowDeletePageDialog] = useState(false);

  // Refs for multiple pages
  const markupCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const pageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  const isDrawingRef = useRef(false);
  const lastDrawPosRef = useRef<{ x: number, y: number } | null>(null);
  const currentDrawingPageIdRef = useRef<string | null>(null);

  // Undo/Redo Stacks
  const [past, setPast] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);

  // Dragging & Resizing State
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    isResizing: boolean;
    isRotating: boolean;
    resizeHandle: string | null;
    startX: number;
    startY: number;
    initialElement: CanvasElement | null;
  } | null>(null);

  // Refs for tracking interactions for history
  const historySnapshot = useRef<HistoryState | null>(null);
  const dragInteractedRef = useRef<boolean>(false);

  // Manual Double Click detection
  const lastClickRef = useRef<{ id: string, time: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Zoom & Pinch State ---
  const lastTouchDistance = useRef<number | null>(null);

  // --- Auto-Save Effect ---
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const data = {
        elements,
        pages,
        scale,
        snapToGrid,
        markupData,
        fileName
      };
      localStorage.setItem('engineering-paper-data', JSON.stringify(data));
    }, 1000); 

    return () => clearTimeout(timeoutId);
  }, [elements, pages, scale, snapToGrid, markupData, fileName]);

  // --- Load Initial Markup for ALL pages ---
  useEffect(() => {
    Object.entries(markupData).forEach(([pageId, src]) => {
        const canvas = markupCanvasRefs.current.get(pageId);
        if (canvas && typeof src === 'string') {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
                    ctx.drawImage(img, 0, 0);
                };
                img.src = src;
            }
        }
    });
  }, []); // Only run once on mount, updates handled by drawing events

  // --- History Helpers ---
  const getCurrentState = useCallback((): HistoryState => {
    return {
        elements: elements,
        markup: { ...markupData },
        pages: pages
    };
  }, [elements, markupData, pages]);

  const saveHistory = useCallback(() => {
    setPast(prev => [...prev, getCurrentState()]);
    setFuture([]);
  }, [getCurrentState]);

  const restoreState = useCallback((state: HistoryState) => {
    setElements(state.elements);
    setPages(state.pages);
    setMarkupData(state.markup);
    
    // Restore canvases visually
    requestAnimationFrame(() => {
        state.pages.forEach(page => {
            const canvas = markupCanvasRefs.current.get(page.id);
            const src = state.markup[page.id];
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
                    if (typeof src === 'string') {
                        const img = new Image();
                        img.onload = () => ctx.drawImage(img, 0, 0);
                        img.src = src;
                    }
                }
            }
        });
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    setFuture(prev => [...prev, getCurrentState()]);
    setPast(newPast);
    
    restoreState(previous);
    
    if (selection.id && !previous.elements.find(e => e.id === selection.id)) {
        setSelection({ id: null, isEditingText: false });
    }
  }, [past, getCurrentState, restoreState, selection]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[future.length - 1];
    const newFuture = future.slice(0, future.length - 1);

    setPast(prev => [...prev, getCurrentState()]);
    setFuture(newFuture);

    restoreState(next);
  }, [future, getCurrentState, restoreState]);

  // --- Project Save/Load Handlers ---

  const handleSaveProject = () => {
      const project: ProjectFile = {
          version: "1.0",
          metadata: {
              fileName: fileName,
              createdAt: Date.now(),
              lastModified: Date.now()
          },
          pages,
          elements,
          markupData,
          snapToGrid,
          scale // Optional to save zoom preference
      };

      const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Use .engpaper extension, or .json if preferred
      link.download = `${fileName.trim() || "project"}.engpaper`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handleLoadProject = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result as string;
              const project: ProjectFile = JSON.parse(text);

              // Basic validation
              if (!project.pages || !project.elements) {
                  throw new Error("Invalid project file structure");
              }

              // Load State
              saveHistory(); // Save current state before overwriting
              
              setPages(project.pages);
              setElements(project.elements);
              setMarkupData(project.markupData || {});
              setSnapToGrid(project.snapToGrid ?? false);
              
              if(project.metadata?.fileName) {
                  setFileName(project.metadata.fileName);
              } else {
                  // Fallback for older files or if metadata missing
                  setFileName(file.name.replace('.engpaper', '').replace('.json', ''));
              }
              
              // Reset Selection
              setSelection({ id: null, isEditingText: false });
              
              // Set Active Page to first page
              if(project.pages.length > 0) {
                  setActivePageId(project.pages[0].id);
              }

              // Restore Canvas Visuals
              // Need a slight delay or effect to ensure canvas DOM elements exist for new pages
              setTimeout(() => {
                  if(project.markupData) {
                      Object.entries(project.markupData).forEach(([pageId, src]) => {
                        const canvas = markupCanvasRefs.current.get(pageId);
                        if (canvas && typeof src === 'string') {
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                ctx.clearRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
                                const img = new Image();
                                img.onload = () => ctx.drawImage(img, 0, 0);
                                img.src = src;
                            }
                        }
                      });
                  }
              }, 100);

          } catch (err) {
              console.error(err);
              alert("Failed to load project file. It may be corrupted or invalid.");
          }
      };
      reader.readAsText(file);
  };

  // --- Handlers ---

  const handleAddPage = () => {
      saveHistory();
      const newPageId = uuidv4();
      setPages([...pages, { id: newPageId }]);
      setActivePageId(newPageId);
      // Scroll to new page?
      setTimeout(() => {
          const el = pageRefs.current.get(newPageId);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
  };

  const confirmRemovePage = () => {
      if (pages.length <= 1) return;

      saveHistory();
      
      const pageToRemove = activePageId;
      const index = pages.findIndex(p => p.id === pageToRemove);
      const newPages = pages.filter(p => p.id !== pageToRemove);
      const newActiveId = newPages[Math.max(0, index - 1)].id;
      
      setPages(newPages);
      setActivePageId(newActiveId);
      
      // Cleanup elements and markup
      setElements(prev => prev.filter(el => el.pageId !== pageToRemove));
      setMarkupData(prev => {
          const next = { ...prev };
          delete next[pageToRemove];
          return next;
      });
      setShowDeletePageDialog(false);
  };

  const handleRemovePageTrigger = () => {
      if (pages.length <= 1) return;
      setShowDeletePageDialog(true);
  };

  const handleAddElement = (type: ElementType) => {
    if (isMarkupMode) return;
    saveHistory(); 
    
    const id = uuidv4();
    const isGraph = type === ElementType.XY_GRAPH || type === ElementType.XY_GRAPH_1Q;
    const defaults = {
      x: 100,
      y: 100,
      width: type === ElementType.LINE || isGraph ? 200 : 160,
      height: type === ElementType.LINE ? 10 : (isGraph ? 200 : 100),
      rotation: 0,
      backgroundColor: type === ElementType.TEXT ? 'transparent' : 'transparent',
      borderColor: '#2f4f4f',
      borderWidth: 2,
    };

    const newElement: CanvasElement = {
      id,
      pageId: activePageId,
      type,
      ...defaults,
      content: type === ElementType.TEXT ? 'Text Box' : undefined,
      fontSize: 24,
      fontFamily: 'Patrick Hand',
      fontWeight: '400',
      color: '#000000',
      textAlign: 'left',
      padding: 8,
    };

    setElements([...elements, newElement]);
    setSelection({ id, isEditingText: false });
  };

  const handleAddImage = (src: string, width: number, height: number) => {
    if (isMarkupMode) return;
    saveHistory();

    const id = uuidv4();
    const newElement: CanvasElement = {
      id,
      pageId: activePageId,
      type: ElementType.IMAGE,
      x: 100,
      y: 100,
      width: width,
      height: height,
      rotation: 0,
      src: src,
      opacity: 1,
      borderColor: 'transparent',
      borderWidth: 0,
    };

    setElements([...elements, newElement]);
    setSelection({ id, isEditingText: false });
  };

  const handleUpdateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const handlePropertyChange = (updates: Partial<CanvasElement>) => {
    if (selection.id) {
        saveHistory();
        handleUpdateElement(selection.id, updates);
    }
  };

  const handleDelete = () => {
    if (selection.id) {
      saveHistory(); 
      setElements(prev => prev.filter(el => el.id !== selection.id));
      setSelection({ id: null, isEditingText: false });
    }
  };

  const handleExport = () => {
    setSelection({ id: null, isEditingText: false });
    // Temporary disable markup mode for clean view
    const wasMarkup = isMarkupMode;
    if(wasMarkup) setIsMarkupMode(false);

    const previousScale = scale;
    setScale(1);
    
    // Slight delay to allow render update
    setTimeout(() => {
        exportToPdf(pages, fileName)
            .finally(() => {
                setScale(previousScale);
                if(wasMarkup) setIsMarkupMode(true);
            });
    }, 100);
  };

  const handleZoomIn = () => setScale(s => Math.min(s + 0.1, 4));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.1, 0.25));
  const handleResetZoom = () => setScale(1);

  // --- Markup Logic ---

  const getCanvasCoords = (e: React.PointerEvent, pageId: string) => {
      const canvas = markupCanvasRefs.current.get(pageId);
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
          x: (e.clientX - rect.left) / scale,
          y: (e.clientY - rect.top) / scale
      };
  };

  const handlePointerDownMarkup = (e: React.PointerEvent, pageId: string) => {
      if (!isMarkupMode) return;
      e.stopPropagation();
      e.preventDefault();

      setActivePageId(pageId);
      historySnapshot.current = getCurrentState();
      currentDrawingPageIdRef.current = pageId;

      const canvas = markupCanvasRefs.current.get(pageId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      isDrawingRef.current = true;
      const coords = getCanvasCoords(e, pageId);
      lastDrawPosRef.current = coords;

      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = markupWidth;
      
      if (markupTool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
      } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = markupColor;
      }
  };

  const handlePointerMoveMarkup = (e: React.PointerEvent) => {
      if (!isDrawingRef.current || !lastDrawPosRef.current || !currentDrawingPageIdRef.current) return;
      
      const pageId = currentDrawingPageIdRef.current;
      const canvas = markupCanvasRefs.current.get(pageId);
      if (!canvas) return;

      e.stopPropagation();
      e.preventDefault();

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const coords = getCanvasCoords(e, pageId);
      
      ctx.beginPath();
      ctx.moveTo(lastDrawPosRef.current.x, lastDrawPosRef.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      lastDrawPosRef.current = coords;
  };

  const handlePointerUpMarkup = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      lastDrawPosRef.current = null;
      
      const pageId = currentDrawingPageIdRef.current;

      if (pageId && historySnapshot.current) {
         setPast(prev => [...prev, historySnapshot.current!]);
         setFuture([]);
         const canvas = markupCanvasRefs.current.get(pageId);
         if (canvas) {
             setMarkupData(prev => ({
                 ...prev,
                 [pageId]: canvas.toDataURL()
             }));
         }
      }
      currentDrawingPageIdRef.current = null;
  };

  // --- Pointer Interaction Logic ---

  const getPointerCoords = (clientX: number, clientY: number, pageId: string) => {
    const pageEl = pageRefs.current.get(pageId);
    if (!pageEl) return { x: 0, y: 0 };
    const rect = pageEl.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  };

  const handlePointerDownElement = (e: React.PointerEvent, element: CanvasElement) => {
    if (isMarkupMode) return;

    // Activate the page the element is on
    setActivePageId(element.pageId);

    if (selection.isEditingText && selection.id === element.id) {
        e.stopPropagation();
        return; 
    }
    
    e.stopPropagation();
    e.preventDefault(); 
    
    const now = Date.now();
    if (
      lastClickRef.current && 
      lastClickRef.current.id === element.id && 
      (now - lastClickRef.current.time) < 300
    ) {
      if (element.type === ElementType.TEXT) {
         saveHistory(); 
         setSelection({ id: element.id, isEditingText: true });
         setDragState(null);
         return;
      }
    }
    lastClickRef.current = { id: element.id, time: now };
    
    setSelection({ id: element.id, isEditingText: false });

    historySnapshot.current = getCurrentState();
    dragInteractedRef.current = false;

    const coords = getPointerCoords(e.clientX, e.clientY, element.pageId);
    setDragState({
      isDragging: true,
      isResizing: false,
      isRotating: false,
      resizeHandle: null,
      startX: coords.x,
      startY: coords.y,
      initialElement: { ...element },
    });
  };

  const handlePointerDownResize = (e: React.PointerEvent, handle: string, element: CanvasElement) => {
    e.stopPropagation();
    e.preventDefault();
    
    setActivePageId(element.pageId);

    historySnapshot.current = getCurrentState();
    dragInteractedRef.current = false;

    const coords = getPointerCoords(e.clientX, e.clientY, element.pageId);
    setDragState({
      isDragging: false,
      isRotating: false,
      isResizing: true,
      resizeHandle: handle,
      startX: coords.x,
      startY: coords.y,
      initialElement: { ...element },
    });
  };

  const handlePointerDownRotate = (e: React.PointerEvent, element: CanvasElement) => {
    e.stopPropagation();
    e.preventDefault();
    
    setActivePageId(element.pageId);

    historySnapshot.current = getCurrentState();
    dragInteractedRef.current = false;

    const coords = getPointerCoords(e.clientX, e.clientY, element.pageId);
    setDragState({
      isDragging: false,
      isResizing: false,
      isRotating: true,
      resizeHandle: null,
      startX: coords.x,
      startY: coords.y,
      initialElement: { ...element },
    });
  };

  // Helper to rotate a point around 0,0
  const rotatePoint = (x: number, y: number, angleDeg: number) => {
      const rad = (Math.PI / 180) * angleDeg;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
          x: x * cos - y * sin,
          y: x * sin + y * cos
      };
  };

  // Global Pointer Move / Up
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragState || !selection.id) return;
      e.preventDefault(); 
      
      dragInteractedRef.current = true;
      
      const initial = dragState.initialElement!;
      const coords = getPointerCoords(e.clientX, e.clientY, initial.pageId);
      
      const deltaX = coords.x - dragState.startX;
      const deltaY = coords.y - dragState.startY;
      
      const snap = (value: number) => snapToGrid ? Math.round(value / GRID_SIZE) * GRID_SIZE : value;

      if (dragState.isDragging) {
        const rawX = initial.x + deltaX;
        const rawY = initial.y + deltaY;
        handleUpdateElement(selection.id, { x: snap(rawX), y: snap(rawY) });
      } 
      else if (dragState.isRotating) {
         const centerX = initial.x + initial.width / 2;
         const centerY = initial.y + initial.height / 2;
         const dx = coords.x - centerX;
         const dy = coords.y - centerY;
         let angle = Math.atan2(dy, dx) * (180 / Math.PI);
         angle += 90; 
         if (snapToGrid) angle = Math.round(angle / 15) * 15;
         handleUpdateElement(selection.id, { rotation: angle });
      }
      else if (dragState.isResizing) {
        const localDelta = rotatePoint(deltaX, deltaY, -(initial.rotation || 0));
        let dW = 0, dH = 0, cShiftLocalX = 0, cShiftLocalY = 0;
        const MIN_SIZE = snapToGrid ? GRID_SIZE : 20;

        switch (dragState.resizeHandle) {
          case 'se': dW = localDelta.x; dH = localDelta.y; break;
          case 'sw': dW = -localDelta.x; dH = localDelta.y; break;
          case 'ne': dW = localDelta.x; dH = -localDelta.y; break;
          case 'nw': dW = -localDelta.x; dH = -localDelta.y; break;
        }

        // Apply constraints
        if (initial.width + dW < MIN_SIZE) dW = MIN_SIZE - initial.width;
        if (initial.height + dH < MIN_SIZE) dH = MIN_SIZE - initial.height;
        
        // Recalculate center shift based on final dW/dH
        switch (dragState.resizeHandle) {
            case 'se': cShiftLocalX = dW / 2; cShiftLocalY = dH / 2; break;
            case 'sw': cShiftLocalX = -dW / 2; cShiftLocalY = dH / 2; break;
            case 'ne': cShiftLocalX = dW / 2; cShiftLocalY = -dH / 2; break;
            case 'nw': cShiftLocalX = -dW / 2; cShiftLocalY = -dH / 2; break;
        }

        let finalW = initial.width + dW;
        let finalH = initial.height + dH;
        
        if (snapToGrid) {
            finalW = Math.round(finalW / GRID_SIZE) * GRID_SIZE;
            finalH = Math.round(finalH / GRID_SIZE) * GRID_SIZE;
            dW = finalW - initial.width;
            dH = finalH - initial.height;
            // Recalc shift again for snap
            switch (dragState.resizeHandle) {
                case 'se': cShiftLocalX = dW/2; cShiftLocalY = dH/2; break;
                case 'sw': cShiftLocalX = -dW/2; cShiftLocalY = dH/2; break;
                case 'ne': cShiftLocalX = dW/2; cShiftLocalY = -dH/2; break;
                case 'nw': cShiftLocalX = -dW/2; cShiftLocalY = -dH/2; break;
            }
        }

        const cx = initial.x + initial.width / 2;
        const cy = initial.y + initial.height / 2;
        const shiftWorld = rotatePoint(cShiftLocalX, cShiftLocalY, initial.rotation || 0);
        handleUpdateElement(selection.id, {
          x: (cx + shiftWorld.x) - finalW / 2,
          y: (cy + shiftWorld.y) - finalH / 2,
          width: finalW,
          height: finalH,
        });
      }
    };

    const handlePointerUp = () => {
      if (dragState && dragInteractedRef.current && historySnapshot.current) {
         setPast(prev => [...prev, historySnapshot.current!]);
         setFuture([]);
      }
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragState, selection, scale, snapToGrid]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? handleRedo() : handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
          return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection.id && !selection.isEditingText) {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, handleUndo, handleRedo, handleDelete]);

  // Wheel Zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = -e.deltaY;
            setScale(prev => Math.min(Math.max(prev + delta * 0.002, 0.25), 4));
        }
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // Pinch Zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastTouchDistance.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragState || isDrawingRef.current) return;
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - lastTouchDistance.current;
      setScale(prev => Math.min(Math.max(prev + delta * 0.005, 0.25), 4));
      lastTouchDistance.current = dist;
    }
  };

  const handleTouchEnd = () => {
    lastTouchDistance.current = null;
  };

  const selectedElement = elements.find(el => el.id === selection.id) || null;

  const handleToggleMarkup = () => {
      if (!isMarkupMode) {
          setSelection({ id: null, isEditingText: false });
      }
      setIsMarkupMode(!isMarkupMode);
  };

  const handleBackgroundClick = (pageId: string) => {
      setActivePageId(pageId);
      setSelection({ id: null, isEditingText: false });
  };

  return (
    <div className="flex flex-col h-screen supports-[height:100dvh]:h-[100dvh] overflow-hidden bg-slate-200 select-none">
      <Toolbar 
        onAddElement={handleAddElement} 
        onAddImage={handleAddImage}
        onAddPage={handleAddPage}
        onRemovePage={handleRemovePageTrigger}
        canRemovePage={pages.length > 1}
        onExport={handleExport} 
        onDelete={handleDelete}
        hasSelection={!!selection.id} 
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid(!snapToGrid)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        isMarkupMode={isMarkupMode}
        onToggleMarkup={handleToggleMarkup}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        fileName={fileName}
        onFileNameChange={setFileName}
      />

      <PropertyPanel 
        element={selectedElement} 
        onChange={handlePropertyChange} 
        isMarkupMode={isMarkupMode}
        markupTool={markupTool}
        setMarkupTool={setMarkupTool}
        markupColor={markupColor}
        setMarkupColor={setMarkupColor}
        markupWidth={markupWidth}
        setMarkupWidth={setMarkupWidth}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto custom-scrollbar p-8 bg-slate-300 relative"
          style={{ touchAction: 'pan-x pan-y' }}
          onClick={() => setSelection({ id: null, isEditingText: false })}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div style={{ 
            width: PAGE_WIDTH * scale, 
            minHeight: (PAGE_HEIGHT * pages.length + (pages.length - 1) * 32) * scale, // Approximate height for scrolling
            position: 'relative',
            margin: '0 auto', 
            display: 'flex',
            flexDirection: 'column',
            gap: `${32 * scale}px`, // Gap between pages scales with zoom
          }}>
              
              {pages.map((page, index) => {
                  const pageElements = elements.filter(el => el.pageId === page.id);
                  const isActive = page.id === activePageId;

                  return (
                    <div 
                        key={page.id}
                        id={`engineering-paper-page-${page.id}`}
                        ref={(el) => {
                            if (el) pageRefs.current.set(page.id, el);
                            else pageRefs.current.delete(page.id);
                        }}
                        className={`relative shadow-2xl bg-[#f4f9f4] overflow-hidden origin-top-left flex-shrink-0 transition-shadow duration-200`}
                        style={{ 
                            width: PAGE_WIDTH, 
                            height: PAGE_HEIGHT,
                            transform: `scale(${scale})`,
                            // We don't want the pages themselves to move with transform origin, we let flex gap handle layout
                            // but we do need to scale them. 
                            // Trick: We scale individual pages. 
                            // Better Trick: The parent container sets width/layout.
                            // Actually, simpler to apply scale to the page itself via style, 
                            // but flex gap needs to be adjusted.
                            // To keep it simple like before:
                            transformOrigin: 'top left',
                            backgroundImage: `
                                linear-gradient(#88c999 1px, transparent 1px),
                                linear-gradient(90deg, #88c999 1px, transparent 1px),
                                linear-gradient(#88c99980 0.5px, transparent 0.5px),
                                linear-gradient(90deg, #88c99980 0.5px, transparent 0.5px)
                            `,
                            backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px',
                            backgroundPosition: '-1px -1px',
                            transformStyle: 'preserve-3d',
                            backfaceVisibility: 'hidden',
                            willChange: 'transform',
                            boxShadow: isActive ? '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1), 0 0 0 2px #3b82f6' : undefined
                        }}
                        onPointerDown={() => handleBackgroundClick(page.id)}
                    >
                        {/* Page Number / Indicator */}
                        <div className="absolute top-2 right-4 text-[10px] font-mono text-slate-400 select-none z-0">
                            Page {index + 1}
                        </div>

                        {/* Grid Lines & Decoration */}
                        <div className="absolute top-0 bottom-0 left-[80px] w-0.5 bg-[#4a7a5a] z-0 pointer-events-none"></div>
                        <div className="absolute top-[80px] left-0 right-0 h-0.5 bg-[#4a7a5a] z-0 pointer-events-none"></div>
                        <div className="absolute top-0 h-[80px] left-[80px] right-0 border-b border-[#4a7a5a] z-0 pointer-events-none opacity-50 flex">
                            <div className="w-1/3 border-r border-[#4a7a5a]"></div>
                            <div className="w-1/3 border-r border-[#4a7a5a]"></div>
                        </div>
                        <div className="absolute left-4 top-24 w-6 h-6 rounded-full bg-slate-200/50 shadow-inner border border-slate-300 z-0"></div>
                        <div className="absolute left-4 top-1/2 w-6 h-6 rounded-full bg-slate-200/50 shadow-inner border border-slate-300 z-0 transform -translate-y-1/2"></div>
                        <div className="absolute left-4 bottom-24 w-6 h-6 rounded-full bg-slate-200/50 shadow-inner border border-slate-300 z-0"></div>

                        {/* Elements Layer */}
                        {pageElements.map(el => {
                            const isSelected = selection.id === el.id;
                            return (
                                <div
                                key={el.id}
                                className={`absolute group ${isSelected ? 'z-20' : 'z-10'}`}
                                style={{
                                    left: el.x,
                                    top: el.y,
                                    width: el.width,
                                    height: el.height,
                                    transform: `rotate(${el.rotation || 0}deg)`,
                                    outline: isSelected && !selection.isEditingText && !isMarkupMode ? '1px dashed #3b82f6' : 'none',
                                    cursor: isMarkupMode ? 'default' : (selection.isEditingText ? 'text' : 'move'),
                                    touchAction: 'none',
                                    backfaceVisibility: 'hidden',
                                    willChange: isSelected ? 'transform, left, top' : 'auto'
                                }}
                                onPointerDown={(e) => handlePointerDownElement(e, el)}
                                onClick={(e) => e.stopPropagation()} 
                                >
                                <ElementRenderer 
                                    element={el} 
                                    isEditing={isSelected && selection.isEditingText} 
                                    onTextChange={(text) => handleUpdateElement(el.id, { content: text })}
                                />

                                {isSelected && !selection.isEditingText && !isMarkupMode && (
                                    <>
                                    <ResizeHandle scale={scale} cursor="nw-resize" positionClass="-top-1.5 -left-1.5" onPointerDown={(e) => handlePointerDownResize(e, 'nw', el)} />
                                    <ResizeHandle scale={scale} cursor="ne-resize" positionClass="-top-1.5 -right-1.5" onPointerDown={(e) => handlePointerDownResize(e, 'ne', el)} />
                                    <ResizeHandle scale={scale} cursor="sw-resize" positionClass="-bottom-1.5 -left-1.5" onPointerDown={(e) => handlePointerDownResize(e, 'sw', el)} />
                                    <ResizeHandle scale={scale} cursor="se-resize" positionClass="-bottom-1.5 -right-1.5" onPointerDown={(e) => handlePointerDownResize(e, 'se', el)} />
                                    
                                    <div 
                                        className="absolute left-1/2 -top-8 w-6 h-6 bg-white border border-slate-400 rounded-full flex items-center justify-center shadow-sm -translate-x-1/2"
                                        style={{ 
                                            cursor: 'grab', 
                                            transform: `scale(${1/scale})`,
                                            transformOrigin: 'center bottom',
                                            backfaceVisibility: 'hidden'
                                        }}
                                        onPointerDown={(e) => handlePointerDownRotate(e, el)}
                                    >
                                        <RotateCcw size={14} className="text-slate-600" />
                                    </div>
                                    <div className="absolute left-1/2 -top-5 w-px h-3.5 bg-slate-400 -translate-x-1/2" style={{ transform: `scaleY(${1/scale})`, transformOrigin: 'bottom' }}></div>
                                    </>
                                )}
                                </div>
                            );
                        })}

                        {/* Markup Layer - One per page */}
                        <canvas
                            ref={(el) => {
                                if (el) markupCanvasRefs.current.set(page.id, el);
                                else markupCanvasRefs.current.delete(page.id);
                            }}
                            width={PAGE_WIDTH}
                            height={PAGE_HEIGHT}
                            className="absolute top-0 left-0 z-30 touch-none"
                            style={{ 
                                pointerEvents: isMarkupMode ? 'auto' : 'none',
                                cursor: isMarkupMode ? (markupTool === 'eraser' ? 'crosshair' : 'crosshair') : 'default'
                            }}
                            onPointerDown={(e) => handlePointerDownMarkup(e, page.id)}
                            onPointerMove={handlePointerMoveMarkup}
                            onPointerUp={handlePointerUpMarkup}
                            onPointerLeave={handlePointerUpMarkup}
                        />
                    </div>
                  );
              })}
              
          </div>
          
        </div>
        
        {/* Zoom Controls */}
        <ZoomControls
              scale={scale}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onReset={handleResetZoom}
              onAddPage={handleAddPage}
              onRemovePage={handleRemovePageTrigger}
              canRemovePage={pages.length > 1}
        />

        {/* Floating Tools Button - Mobile Only */}
        <FloatingToolsButton
              onAddElement={handleAddElement}
              onAddImage={handleAddImage}
              onExport={handleExport}
              onDelete={handleDelete}
              hasSelection={!!selection.id}
              snapToGrid={snapToGrid}
              onToggleSnap={() => setSnapToGrid(!snapToGrid)}
              isMarkupMode={isMarkupMode}
              onToggleMarkup={handleToggleMarkup}
              onSaveProject={handleSaveProject}
              onLoadProject={handleLoadProject}
        />

        {/* Delete Confirmation Modal */}
        {showDeletePageDialog && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeletePageDialog(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 border border-slate-200 animate-[fadeIn_0.2s_ease-out]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="text-red-600" size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Delete Page?</h3>
              </div>
              
              <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                Are you sure you want to delete this page? All content on this page, including text, shapes, and drawings, will be permanently removed. This action cannot be undone.
              </p>
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowDeletePageDialog(false)} 
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmRemovePage} 
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm transition-colors"
                >
                  Delete Page
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;