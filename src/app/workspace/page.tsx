'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as fabric from 'fabric'; 
import { 
  MousePointer2, 
  Hand, 
  LayoutGrid, 
  Scissors, 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  Trash,
  RotateCw,
  FlipHorizontal,
  ChevronLeft,
  Settings2,
  Plus,
  CheckCircle2,
  Maximize2,
  X,
  Loader2,
  AlertTriangle,
  Monitor,
  Wifi
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuth } from '@/context/AuthContext';

export default function WorkspacePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<any>(null);

  const [activeObject, setActiveObject] = useState<any>(null);
  const [materialUsed, setMaterialUsed] = useState(0);
  const [queuedPatterns, setQueuedPatterns] = useState<any[]>([]);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Undo / Redo history state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef<boolean>(false);

  // Tracking patterns placed on bed
  const [placedPatternIds, setPlacedPatternIds] = useState<string[]>([]);

  // Send to Plotter modal state
  const [showPlotterModal, setShowPlotterModal] = useState(false);
  const [isSendingJob, setIsSendingJob] = useState(false);
  const [jobSent, setJobSent] = useState(false);
  const [sentJobData, setSentJobData] = useState<any>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [availablePlotters, setAvailablePlotters] = useState<any[]>([]);
  const [selectedPlotterId, setSelectedPlotterId] = useState<string>('');
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [selectedVehicleOverride, setSelectedVehicleOverride] = useState<string>('');

  const { 
    activeTool, 
    setActiveTool, 
    filmWidth,
    setFilmWidth,
    selectedPatternIds,
    vehicleId,
  } = useWorkspaceStore();

  const { user } = useAuth();

  // Fetch plotters and vehicles when Send to Plotter modal opens
  useEffect(() => {
    if (!showPlotterModal || !user?.token) return;

    fetch('http://localhost:5000/api/plotters', {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailablePlotters(data);
          const online = data.find((p: any) => p.status === 'online');
          setSelectedPlotterId(online ? online._id : data[0]._id);
        }
      })
      .catch((err) => console.warn('Failed to load plotters:', err));

    fetch('http://localhost:5000/api/vehicles', {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableVehicles(data);
          if (!vehicleId) {
            setSelectedVehicleOverride(data[0]._id);
          }
        }
      })
      .catch((err) => console.warn('Failed to load vehicles:', err));
  }, [showPlotterModal, user?.token, vehicleId]);

  // Helper to update placed pattern IDs
  const updatePlacedIds = useCallback(() => {
    if (!fabricRef.current) return;
    const objects = fabricRef.current.getObjects().filter((o: any) => o.id !== 'film-bg');
    const ids = objects.map((o: any) => o.patternId).filter(Boolean);
    setPlacedPatternIds(Array.from(new Set(ids)));
  }, []);

  // Calculate material usage along film height
  const calculateMaterialUsage = useCallback(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const objects = canvas.getObjects().filter((o: any) => o.id !== 'film-bg');
    if (objects.length === 0) {
      setMaterialUsed(0);
      return;
    }
    let maxBottom = 0;
    objects.forEach((obj: any) => {
      const rect = obj.getBoundingRect();
      const bottom = rect.top + rect.height;
      if (bottom > maxBottom) maxBottom = bottom;
    });
    const used = Math.max(0, maxBottom - 40);
    setMaterialUsed(used);
  }, []);

  // Save Canvas State to History Stack
  const saveHistoryState = useCallback(() => {
    if (!fabricRef.current || isUndoRedoRef.current) return;
    const canvas = fabricRef.current;
    const json = JSON.stringify(
      canvas.toJSON(['patternId', 'patternLabel', 'id', 'stroke', 'strokeWidth', 'strokeUniform', 'selectable', 'evented'])
    );

    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(json);
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;

    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);

    updatePlacedIds();
    calculateMaterialUsage();
  }, [updatePlacedIds, calculateMaterialUsage]);

  // Undo action
  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0 || !fabricRef.current) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current -= 1;
    const jsonState = historyRef.current[historyIndexRef.current];

    const canvas = fabricRef.current;
    canvas.loadFromJSON(jsonState).then(() => {
      // Fix background object non-selectability after reload
      const filmBg = canvas.getObjects().find((o: any) => o.id === 'film-bg');
      if (filmBg) {
        filmBg.set({ selectable: false, evented: false });
        canvas.sendObjectToBack(filmBg);
      }
      canvas.renderAll();
      isUndoRedoRef.current = false;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      updatePlacedIds();
      calculateMaterialUsage();
    });
  }, [updatePlacedIds, calculateMaterialUsage]);

  // Redo action
  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1 || !fabricRef.current) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current += 1;
    const jsonState = historyRef.current[historyIndexRef.current];

    const canvas = fabricRef.current;
    canvas.loadFromJSON(jsonState).then(() => {
      const filmBg = canvas.getObjects().find((o: any) => o.id === 'film-bg');
      if (filmBg) {
        filmBg.set({ selectable: false, evented: false });
        canvas.sendObjectToBack(filmBg);
      }
      canvas.renderAll();
      isUndoRedoRef.current = false;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      updatePlacedIds();
      calculateMaterialUsage();
    });
  }, [updatePlacedIds, calculateMaterialUsage]);

  // Zoom controls with proper Fabric rendering
  const zoomIn = () => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    let z = canvas.getZoom();
    z = Math.min(z + 0.2, 4.0);
    const center = new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
    canvas.zoomToPoint(center, z);
    canvas.renderAll();
    setZoomLevel(Math.round(z * 100));
  };

  const zoomOut = () => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    let z = canvas.getZoom();
    z = Math.max(z - 0.2, 0.2);
    const center = new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
    canvas.zoomToPoint(center, z);
    canvas.renderAll();
    setZoomLevel(Math.round(z * 100));
  };

  const resetZoom = () => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.setZoom(1.0);
    canvas.renderAll();
    setZoomLevel(100);
  };

  // Back Navigation
  const handleBack = () => {
    if (vehicleId) {
      router.push(`/installer/vehicles/${vehicleId}`);
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/installer');
    }
  };

  // Canvas Setup & Centering
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth || 800;
    const containerHeight = containerRef.current.clientHeight || 600;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: containerWidth,
      height: containerHeight,
      backgroundColor: '#171717',
      preserveObjectStacking: true,
      selection: true,
    });

    fabricRef.current = canvas;

    // Center film background horizontally in canvas container
    const filmLeft = Math.max(40, (containerWidth - filmWidth) / 2);

    const filmBg = new fabric.Rect({
      left: filmLeft,
      top: 40,
      width: filmWidth,
      height: 3000, 
      fill: '#262626',
      selectable: false,
      evented: false,
      stroke: '#404040',
      strokeWidth: 2,
      id: 'film-bg'
    } as any);
    canvas.add(filmBg);
    canvas.sendObjectToBack(filmBg);

    // Mouse wheel zoom listener
    canvas.on('mouse:wheel', (opt: any) => {
      const delta = opt.e.deltaY;
      let z = canvas.getZoom();
      z *= 0.999 ** delta;
      if (z > 4.0) z = 4.0;
      if (z < 0.2) z = 0.2;
      const point = new fabric.Point(opt.e.offsetX, opt.e.offsetY);
      canvas.zoomToPoint(point, z);
      canvas.renderAll();
      setZoomLevel(Math.round(z * 100));
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Panning support
    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;

    canvas.on('mouse:down', (opt: any) => {
      const evt = opt.e;
      if (canvas.defaultCursor === 'grab' || opt.e.altKey) {
        isPanning = true;
        canvas.defaultCursor = 'grabbing';
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
    });

    canvas.on('mouse:move', (opt: any) => {
      if (isPanning) {
        const evt = opt.e;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += evt.clientX - lastPosX;
          vpt[5] += evt.clientY - lastPosY;
          canvas.requestRenderAll();
        }
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
    });

    canvas.on('mouse:up', () => {
      if (isPanning) {
        isPanning = false;
        canvas.defaultCursor = canvas.isDrawingMode ? 'default' : (activeTool === 'pan' ? 'grab' : 'default');
      }
    });

    // Load patterns from backend
    const loadPatterns = async () => {
      const token = user?.token;
      let patternsToLoad: any[] = [];

      if (selectedPatternIds && selectedPatternIds.length > 0 && token) {
        const fetches = selectedPatternIds.map(id =>
          fetch(`http://localhost:5000/api/patterns/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.ok ? r.json() : null)
        );
        patternsToLoad = (await Promise.all(fetches)).filter(Boolean);
      }

      if (patternsToLoad.length === 0 && token) {
        try {
          const res = await fetch('http://localhost:5000/api/patterns', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const all = await res.json();
            const withFiles = all.filter((p: any) => p.files?.svg?.url || p.files?.dxf?.url);
            patternsToLoad = withFiles.length > 0 ? withFiles : all.slice(0, 4);
          }
        } catch (err) {
          console.error('Error fetching fallback patterns:', err);
        }
      }

      setQueuedPatterns(patternsToLoad);

      if (patternsToLoad.length === 0) {
        saveHistoryState();
        return;
      }

      let yOffset = 90;
      for (const p of patternsToLoad) {
        const svgPath = p.files?.svg?.url || (p.files?.dxf?.url ? `${p.files.dxf.url}.svg` : null);
        const svgUrl = svgPath
          ? (svgPath.startsWith('http') ? svgPath : `http://localhost:5000${svgPath}`)
          : null;

        if (svgUrl) {
          try {
            const { objects } = await (fabric as any).loadSVGFromURL(svgUrl);
            const validObjects = (objects as any[]).filter(Boolean);

            if (validObjects.length > 0) {
              validObjects.forEach((obj: any) => {
                obj.set({
                  stroke: '#14b8a6',
                  strokeWidth: 2,
                  strokeUniform: true,
                  fill: 'rgba(20, 184, 166, 0.08)',
                });
              });

              const group = new (fabric as any).Group(validObjects, {
                top: yOffset,
                cornerColor: '#ffffff',
                cornerStrokeColor: '#14b8a6',
                borderColor: '#14b8a6',
                cornerSize: 8,
                transparentCorners: false,
              });

              const maxDim = Math.max(group.width || 1, group.height || 1);
              if (maxDim < 200) {
                group.scale(450 / maxDim);
              } else if (maxDim > 1300) {
                group.scale(1100 / maxDim);
              }

              const groupW = (group.width || 1) * (group.scaleX || 1);
              group.left = filmLeft + Math.max(20, (filmWidth - groupW) / 2);

              (group as any).patternId = p._id;
              (group as any).patternLabel = p.name;
              canvas.add(group);
              const renderedHeight = (group.height || 200) * (group.scaleY || 1);
              yOffset += renderedHeight + 50;
            }
          } catch (err) {
            console.warn('SVG load failed:', err);
          }
        }
      }
      canvas.renderAll();
      saveHistoryState();
    };

    loadPatterns();

    // Intersection check logic
    const checkIntersections = () => {
      const objects = canvas.getObjects().filter((o: any) => o.id !== 'film-bg');
      objects.forEach(obj => {
        obj.set('stroke', '#14b8a6');
        obj.set('fill', 'rgba(20, 184, 166, 0.15)');
      });

      for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
          if (objects[i].intersectsWithObject(objects[j])) {
            objects[i].set('stroke', '#ef4444');
            objects[i].set('fill', 'rgba(239, 68, 68, 0.2)');
            objects[j].set('stroke', '#ef4444');
            objects[j].set('fill', 'rgba(239, 68, 68, 0.2)');
          }
        }
      }
      canvas.renderAll();
    };

    canvas.on('object:moving', (e) => {
      const obj = e.target;
      if (!obj) return;

      obj.setCoords();
      if (obj.getBoundingRect().left < filmBg.left) {
        obj.left = filmBg.left + (obj.left - obj.getBoundingRect().left);
      }
      if (obj.getBoundingRect().left + obj.getBoundingRect().width > filmBg.left + filmBg.width) {
        obj.left = filmBg.left + filmBg.width - obj.getBoundingRect().width + (obj.left - obj.getBoundingRect().left);
      }

      checkIntersections();
      calculateMaterialUsage();
    });

    canvas.on('object:rotating', checkIntersections);
    canvas.on('object:scaling', checkIntersections);
    
    canvas.on('object:modified', () => {
      checkIntersections();
      calculateMaterialUsage();
      saveHistoryState();
    });

    canvas.on('object:added', () => {
      updatePlacedIds();
      calculateMaterialUsage();
    });

    canvas.on('object:removed', () => {
      updatePlacedIds();
      calculateMaterialUsage();
    });

    canvas.on('selection:created', (e) => setActiveObject(e.selected?.[0] || null));
    canvas.on('selection:updated', (e) => setActiveObject(e.selected?.[0] || null));
    canvas.on('selection:cleared', () => setActiveObject(null));

    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth || 800;
      const newHeight = containerRef.current.clientHeight || 600;
      canvas.setDimensions({ width: newWidth, height: newHeight });
      const newFilmLeft = Math.max(40, (newWidth - filmWidth) / 2);
      filmBg.set('left', newFilmLeft);
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, [filmWidth, saveHistoryState, updatePlacedIds, calculateMaterialUsage, user?.token, selectedPatternIds]);

  // Keyboard Shortcuts (Delete, Backspace, Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (fabricRef.current) {
          const activeObjs = fabricRef.current.getActiveObjects();
          if (activeObjs && activeObjs.length > 0) {
            activeObjs.forEach((obj: any) => {
              if (obj.id !== 'film-bg') {
                fabricRef.current.remove(obj);
              }
            });
            fabricRef.current.discardActiveObject();
            setActiveObject(null);
            fabricRef.current.renderAll();
            saveHistoryState();
          }
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveHistoryState, undo, redo]);

  // Tool changes (Select vs Pan)
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;

    if (activeTool === 'pan') {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.forEachObject((obj: any) => { obj.selectable = false; });
      canvas.defaultCursor = 'grab';
    } else {
      canvas.selection = true;
      canvas.forEachObject((obj: any) => { 
        if (obj.id !== 'film-bg') obj.selectable = true; 
      });
      canvas.defaultCursor = 'default';
    }
  }, [activeTool]);

  // Add pattern onto canvas bed
  const addPatternToCanvas = async (p: any) => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const filmBg = canvas.getObjects().find((o: any) => o.id === 'film-bg');
    const filmLeft = filmBg ? filmBg.left : 50;

    const svgPath = p.files?.svg?.url || (p.files?.dxf?.url ? `${p.files.dxf.url}.svg` : null);
    const svgUrl = svgPath ? (svgPath.startsWith('http') ? svgPath : `http://localhost:5000${svgPath}`) : null;

    let yPos = 90;
    const existingObjects = canvas.getObjects().filter((o: any) => o.id !== 'film-bg');
    if (existingObjects.length > 0) {
      let maxY = 0;
      existingObjects.forEach((o: any) => {
        const rect = o.getBoundingRect();
        const bottom = rect.top + rect.height;
        if (bottom > maxY) maxY = bottom;
      });
      yPos = maxY + 40;
    }

    if (svgUrl) {
      try {
        const { objects } = await (fabric as any).loadSVGFromURL(svgUrl);
        const validObjects = (objects as any[]).filter(Boolean);
        if (validObjects.length > 0) {
          validObjects.forEach((obj: any) => {
            obj.set({
              stroke: '#14b8a6',
              strokeWidth: 2,
              strokeUniform: true,
              fill: 'rgba(20, 184, 166, 0.08)',
            });
          });

          const group = new (fabric as any).Group(validObjects, {
            top: yPos,
            cornerColor: '#ffffff',
            cornerStrokeColor: '#14b8a6',
            borderColor: '#14b8a6',
            cornerSize: 8,
            transparentCorners: false,
          });

          const maxDim = Math.max(group.width || 1, group.height || 1);
          if (maxDim < 200) group.scale(450 / maxDim);
          else if (maxDim > 1300) group.scale(1100 / maxDim);

          const groupW = (group.width || 1) * (group.scaleX || 1);
          group.left = filmLeft + Math.max(20, (filmWidth - groupW) / 2);

          (group as any).patternId = p._id;
          (group as any).patternLabel = p.name;
          canvas.add(group);
          canvas.setActiveObject(group);
          canvas.renderAll();
          saveHistoryState();
          return;
        }
      } catch (err) {
        console.warn('Failed to add pattern to canvas:', err);
      }
    }

    // Fallback Rect
    const rect = new fabric.Rect({
      left: filmLeft + 50,
      top: yPos,
      width: 300,
      height: 150,
      fill: 'rgba(20, 184, 166, 0.15)',
      stroke: '#14b8a6',
      strokeWidth: 2,
    } as any);
    (rect as any).patternLabel = p.name;
    (rect as any).patternId = p._id;
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    saveHistoryState();
  };

  // Remove pattern from canvas by patternId
  const removePatternFromCanvas = (patternId: string) => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const toRemove = canvas.getObjects().filter((o: any) => o.patternId === patternId);
    toRemove.forEach((o: any) => canvas.remove(o));
    canvas.discardActiveObject();
    setActiveObject(null);
    canvas.renderAll();
    saveHistoryState();
  };

  const deleteSelected = () => {
    if (!fabricRef.current || !activeObject) return;
    fabricRef.current.remove(activeObject);
    fabricRef.current.discardActiveObject();
    setActiveObject(null);
    saveHistoryState();
  };

  const rotateSelected = () => {
    if (!activeObject) return;
    const currentAngle = activeObject.angle || 0;
    activeObject.set('angle', currentAngle + 90);
    activeObject.setCoords();
    fabricRef.current.renderAll();
    saveHistoryState();
  };

  const flipSelected = () => {
    if (!activeObject) return;
    activeObject.set('flipX', !activeObject.flipX);
    fabricRef.current.renderAll();
    saveHistoryState();
  };

  const addBleedSelected = () => {
    if (!activeObject) return;
    const currentScaleX = activeObject.scaleX || 1;
    activeObject.scale(currentScaleX * 1.05);
    activeObject.setCoords();
    fabricRef.current.renderAll();
    saveHistoryState();
  };

  const autoNest = () => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const filmBg = canvas.getObjects().find((o: any) => o.id === 'film-bg');
    if (!filmBg) return;

    const objects = canvas.getObjects().filter((o: any) => o.id !== 'film-bg');
    objects.sort((a: any, b: any) => (b.height * b.scaleY) - (a.height * a.scaleY));

    let currentY = filmBg.top + 20;
    let currentX = filmBg.left + 20;
    let maxRowHeight = 0;

    objects.forEach((obj: any) => {
      const objWidth = obj.width * obj.scaleX;
      const objHeight = obj.height * obj.scaleY;

      if (currentX + objWidth > filmBg.left + filmBg.width - 20) {
        currentX = filmBg.left + 20;
        currentY += maxRowHeight + 20;
        maxRowHeight = 0;
      }

      obj.set({ left: currentX, top: currentY });
      obj.setCoords();

      currentX += objWidth + 20;
      if (objHeight > maxRowHeight) maxRowHeight = objHeight;
    });

    canvas.renderAll();
    saveHistoryState();
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-white">
      {/* Top Toolbar */}
      <header className="h-16 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          {/* Dynamic Back Button */}
          <Button 
            onClick={handleBack} 
            variant="ghost" 
            size="sm" 
            className="text-neutral-300 hover:text-white hover:bg-neutral-900 rounded-lg px-3 h-9 gap-1.5 font-semibold text-xs border border-neutral-800"
            title="Back to vehicle patterns catalog"
          >
            <ChevronLeft className="w-4 h-4 text-teal-400" />
            <span>Back</span>
          </Button>

          <div className="h-6 w-px bg-neutral-800 mx-1" />
          
          {/* Select vs Pan */}
          <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveTool('select')}
              className={`rounded-md px-3 h-8 text-xs font-semibold ${activeTool === 'select' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'}`}
            >
              <MousePointer2 className="w-3.5 h-3.5 mr-1.5" /> Select
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveTool('pan')}
              className={`rounded-md px-3 h-8 text-xs font-semibold ${activeTool === 'pan' ? 'bg-neutral-800 text-white shadow-xs' : 'text-neutral-400 hover:text-white'}`}
            >
              <Hand className="w-3.5 h-3.5 mr-1.5" /> Pan
            </Button>
          </div>

          <div className="h-6 w-px bg-neutral-800 mx-1" />
          
          {/* Working Undo & Redo Buttons */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={undo}
            disabled={!canUndo}
            className={`h-9 w-9 rounded-lg ${canUndo ? 'text-neutral-300 hover:text-white hover:bg-neutral-900' : 'text-neutral-600 opacity-40 cursor-not-allowed'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={redo}
            disabled={!canRedo}
            className={`h-9 w-9 rounded-lg ${canRedo ? 'text-neutral-300 hover:text-white hover:bg-neutral-900' : 'text-neutral-600 opacity-40 cursor-not-allowed'}`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </Button>

          <div className="h-6 w-px bg-neutral-800 mx-1" />

          {/* Auto Nest Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={autoNest}
            className="bg-neutral-900 border-neutral-800 text-teal-400 hover:text-teal-300 hover:bg-neutral-800 h-9 font-semibold text-xs"
          >
            <LayoutGrid className="w-4 h-4 mr-2" /> Auto Nest
          </Button>

          <div className="h-6 w-px bg-neutral-800 mx-1" />

          {/* Film Roll Width Selector */}
          <div className="flex items-center gap-2">
             <Settings2 className="w-4 h-4 text-neutral-400" />
             <select 
               value={filmWidth} 
               onChange={(e) => setFilmWidth(Number(e.target.value))}
               className="bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
             >
               <option value={1524}>60" (1524mm) Roll</option>
               <option value={914}>36" (914mm) Roll</option>
               <option value={610}>24" (610mm) Roll</option>
             </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right mr-2">
            <p className="text-xs text-neutral-400">Material Used</p>
            <p className="text-sm font-bold text-teal-400">{(materialUsed / 1000).toFixed(2)} m</p>
          </div>
          <Button
            onClick={() => {
              setShowPlotterModal(true);
              setJobSent(false);
              setJobError(null);
            }}
            disabled={placedPatternIds.length === 0}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full px-6 shadow-md font-semibold"
          >
            <Scissors className="w-4 h-4 mr-2" />
            Send to Plotter
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Queue & Add to Bed Buttons */}
        <aside className="w-[380px] min-w-[340px] shrink-0 bg-neutral-950 border-r border-neutral-800 flex flex-col">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Queue</h3>
            <span className="text-xs bg-neutral-900 border border-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full font-mono">
              {queuedPatterns.length} {queuedPatterns.length === 1 ? 'part' : 'parts'}
            </span>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {queuedPatterns.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                <p className="text-xs">No patterns queued.<br />Select patterns from a vehicle and send to workspace.</p>
              </div>
            ) : queuedPatterns.map((p) => {
              const vehicle = typeof p.vehicleId === 'object' ? p.vehicleId : null;
              const vehicleLabel = vehicle
                ? `${vehicle.manufacturer} ${vehicle.model} (${vehicle.generation || vehicle.year})`
                : 'Vehicle Pattern';
              const svgPath = p.files?.svg?.url || (p.files?.dxf?.url ? `${p.files.dxf.url}.svg` : null);
              const svgThumb = svgPath
                ? (svgPath.startsWith('http') ? svgPath : `http://localhost:5000${svgPath}`)
                : null;
              const fileType = p.files?.dxf ? 'DXF' : (p.files?.svg ? 'SVG' : null);
              const isPlaced = placedPatternIds.includes(p._id);

              return (
                <div
                  key={p._id}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-teal-500/50 transition-all shadow-md group"
                >
                  {/* SVG/DXF Preview Thumbnail */}
                  {svgThumb ? (
                    <div className="w-full h-44 bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-center p-3 relative overflow-hidden">
                      <img
                        src={svgThumb}
                        alt={p.name}
                        className="max-w-full max-h-full object-contain filter drop-shadow-[0_0_8px_rgba(20,184,166,0.3)] transition-transform group-hover:scale-105"
                      />
                      {fileType && (
                        <span className="absolute top-2 right-2 bg-teal-500/10 text-teal-400 border border-teal-500/30 text-[10px] font-mono font-semibold px-2 py-0.5 rounded">
                          {fileType}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-20 bg-neutral-950/50 border-b border-neutral-800 flex items-center justify-center">
                      <span className="text-xs text-neutral-500">No Vector File</span>
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-teal-400/80 uppercase tracking-wide truncate max-w-[200px]">{vehicleLabel}</span>
                        {isPlaced ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> On Bed
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 capitalize">Ready</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-white tracking-tight mt-0.5">{p.name}</p>
                      {p.part && (
                        <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                          {p.part}
                        </p>
                      )}
                    </div>

                    {/* Add / Copy / Remove Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => addPatternToCanvas(p)}
                        className={`flex-1 h-9 text-xs font-semibold gap-1.5 transition-all ${
                          isPlaced
                            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                            : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isPlaced ? 'Add Copy' : 'Add to Cutting Bed'}
                      </Button>

                      {isPlaced && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removePatternFromCanvas(p._id)}
                          className="h-9 w-9 bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 shrink-0"
                          title="Remove all instances of this pattern from bed"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main Canvas Container Area - Centered Film Bed */}
        <main ref={containerRef} className="flex-1 bg-neutral-900 relative flex items-center justify-center overflow-hidden">
          {/* Zoom Controls Overlay */}
          <div className="absolute bottom-6 right-6 flex items-center bg-neutral-950/90 backdrop-blur-md border border-neutral-800 rounded-xl p-1.5 z-10 shadow-2xl gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={zoomOut}
              className="text-neutral-300 hover:text-white hover:bg-neutral-800 h-8 w-8 rounded-lg"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            
            <button 
              onClick={resetZoom}
              className="text-xs font-mono font-semibold px-2.5 py-1 text-neutral-200 hover:text-teal-400 transition-colors"
              title="Reset Zoom to 100%"
            >
              {zoomLevel}%
            </button>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={zoomIn}
              className="text-neutral-300 hover:text-white hover:bg-neutral-800 h-8 w-8 rounded-lg"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>

            <div className="h-4 w-px bg-neutral-800 mx-1" />

            <Button
              variant="ghost"
              size="icon"
              onClick={resetZoom}
              className="text-neutral-400 hover:text-white hover:bg-neutral-800 h-8 w-8 rounded-lg"
              title="Reset View and Centering"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <canvas ref={canvasRef} />
          </div>
        </main>

        {/* Right Properties Panel */}
        <aside className="w-[380px] min-w-[340px] shrink-0 bg-neutral-950 border-l border-neutral-800 flex flex-col">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Properties</h3>
            {activeObject && (
              <span className="text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-full font-medium">
                Active Selection
              </span>
            )}
          </div>
          
          {activeObject ? (
            <div className="p-5 space-y-6 overflow-y-auto">
              {/* Pattern Info Header */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-1">
                <span className="text-xs text-neutral-500 uppercase tracking-wider">Selected Pattern</span>
                <h4 className="text-base font-semibold text-white">
                  {activeObject.patternLabel || 'Pattern Element'}
                </h4>
              </div>

              {/* Dimensions */}
              <div>
                <h4 className="text-xs text-neutral-400 uppercase tracking-wider mb-3 font-semibold">Dimensions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-3">
                    <span className="text-xs text-neutral-500 block mb-1">Width</span>
                    <span className="text-base font-medium text-white font-mono">
                      {((activeObject.width || 0) * (activeObject.scaleX || 1)).toFixed(1)} <span className="text-xs text-neutral-500">mm</span>
                    </span>
                  </div>
                  <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-3">
                    <span className="text-xs text-neutral-500 block mb-1">Height</span>
                    <span className="text-base font-medium text-white font-mono">
                      {((activeObject.height || 0) * (activeObject.scaleY || 1)).toFixed(1)} <span className="text-xs text-neutral-500">mm</span>
                    </span>
                  </div>
                  <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-3">
                    <span className="text-xs text-neutral-500 block mb-1">Position X</span>
                    <span className="text-base font-medium text-white font-mono">
                      {Math.round(activeObject.left || 0)} <span className="text-xs text-neutral-500">mm</span>
                    </span>
                  </div>
                  <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-3">
                    <span className="text-xs text-neutral-500 block mb-1">Position Y</span>
                    <span className="text-base font-medium text-white font-mono">
                      {Math.round(activeObject.top || 0)} <span className="text-xs text-neutral-500">mm</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Transform Actions */}
              <div>
                <h4 className="text-xs text-neutral-400 uppercase tracking-wider mb-3 font-semibold">Transform Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={rotateSelected} className="bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 h-10">
                    <RotateCw className="w-4 h-4 mr-2 text-teal-400" /> Rotate 90°
                  </Button>
                  <Button variant="outline" size="sm" onClick={flipSelected} className="bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 h-10">
                    <FlipHorizontal className="w-4 h-4 mr-2 text-teal-400" /> Flip H
                  </Button>
                  <Button variant="outline" size="sm" onClick={addBleedSelected} className="col-span-2 bg-teal-500/10 border-teal-500/30 text-teal-400 hover:bg-teal-500/20 h-10 font-medium">
                    + Add 5mm Edge Bleed
                  </Button>
                  <Button variant="outline" size="sm" onClick={deleteSelected} className="col-span-2 bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 h-10">
                    <Trash className="w-4 h-4 mr-2" /> Remove from Bed
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-neutral-500">
              <LayoutGrid className="w-10 h-10 mb-3 opacity-20 text-teal-400" />
              <p className="text-sm font-medium text-neutral-400">No Pattern Selected</p>
              <p className="text-xs text-neutral-600 mt-1 max-w-[200px]">Click any shape on the cutting bed to adjust its dimensions, orientation or cut margin.</p>
            </div>
          )}
        </aside>
      </div>

      {/* ── Send to Plotter Modal ───────────────────────────────────── */}
      {showPlotterModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Send to Plotter</h3>
                  <p className="text-xs text-neutral-400">{placedPatternIds.length} pattern(s) positioned on film bed</p>
                </div>
              </div>
              <button
                onClick={() => setShowPlotterModal(false)}
                className="text-neutral-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {jobSent ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-teal-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-1">Cutting Job Queued!</h4>
                  <p className="text-sm text-neutral-400 mb-2">
                    Job has been transmitted to <strong className="text-teal-400">{availablePlotters.find(p => p._id === selectedPlotterId)?.name || 'Cutting Plotter'}</strong>.
                  </p>
                  {sentJobData?._id && (
                    <p className="text-xs font-mono text-neutral-500 mb-5">
                      Job ID: #{sentJobData._id.slice(-8).toUpperCase()}
                    </p>
                  )}
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={() => setShowPlotterModal(false)}
                      variant="outline"
                      className="border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800"
                    >
                      Stay in Workspace
                    </Button>
                    <Button
                      onClick={() => router.push('/installer/history')}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      View Cutting History
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {jobError && (
                    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-sm text-red-300">{jobError}</p>
                    </div>
                  )}

                  {/* Target Plotter Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-teal-400" />
                      Select Target Plotter Station
                    </label>
                    <select
                      value={selectedPlotterId}
                      onChange={(e) => setSelectedPlotterId(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      {availablePlotters.map((plt: any) => (
                        <option key={plt._id} value={plt._id}>
                          {plt.name} ({plt.model}) — {plt.status.toUpperCase()} [{plt.filmWidth}mm]
                        </option>
                      ))}
                      {availablePlotters.length === 0 && (
                        <option value="">Default Cutter Station (Roland CAMM-1)</option>
                      )}
                    </select>
                  </div>

                  {/* Vehicle Selector if missing */}
                  {!vehicleId && availableVehicles.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300">
                        Assign to Vehicle
                      </label>
                      <select
                        value={selectedVehicleOverride}
                        onChange={(e) => setSelectedVehicleOverride(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        {availableVehicles.map((v: any) => (
                          <option key={v._id} value={v._id}>
                            {v.year} {v.manufacturer} {v.model} {[v.generation, v.variant].filter(Boolean).join(' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-4 space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-400">Selected Roll Width</span>
                      <span className="text-white font-medium">
                        {filmWidth >= 1524 ? '60"' : filmWidth >= 914 ? '36"' : '24"'} ({filmWidth}mm)
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-400">Pieces to Cut</span>
                      <span className="text-white font-medium">{placedPatternIds.length} placed parts</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-400">Total Material Needed</span>
                      <span className="text-teal-400 font-semibold">{(materialUsed / 1000).toFixed(2)} meters</span>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Once sent, the cutter will be signaled via local TCP/IP and the job will appear in both the installer's cut history and admin plotter monitor.
                  </p>
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!jobSent && (
              <div className="px-6 pb-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPlotterModal(false)}
                  className="flex-1 border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800 h-10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!user?.token) {
                      setJobError('You must be logged in to send a job.');
                      return;
                    }

                    const effectiveVehicleId = vehicleId || selectedVehicleOverride || (
                      queuedPatterns[0]?.vehicleId 
                        ? (typeof queuedPatterns[0].vehicleId === 'object' ? (queuedPatterns[0].vehicleId as any)._id : queuedPatterns[0].vehicleId)
                        : (availableVehicles[0]?._id || null)
                    );

                    if (!effectiveVehicleId) {
                      setJobError('Please select or assign a vehicle for this cutting job.');
                      return;
                    }

                    const canvas = fabricRef.current;
                    const placedObjects = canvas
                      ? canvas.getObjects().filter((o: any) => o.id !== 'film-bg' && o.patternId)
                      : [];

                    const patterns = placedObjects.map((o: any) => ({
                      patternId: o.patternId,
                      name: o.patternLabel || '',
                      transform: {
                        left: Math.round(o.left || 0),
                        top: Math.round(o.top || 0),
                        scaleX: o.scaleX || 1,
                        scaleY: o.scaleY || 1,
                        angle: o.angle || 0,
                        flipX: o.flipX || false,
                        flipY: o.flipY || false,
                      },
                    }));

                    try {
                      setIsSendingJob(true);
                      setJobError(null);
                      const res = await fetch('http://localhost:5000/api/jobs', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${user.token}`,
                        },
                        body: JSON.stringify({
                          vehicleId: effectiveVehicleId,
                          patterns,
                          plotterId: selectedPlotterId || undefined,
                          filmWidth,
                          materialUsed: Math.round(materialUsed),
                        }),
                      });

                      if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.message || 'Failed to send job to plotter');
                      }

                      const created = await res.json();
                      setSentJobData(created);
                      setJobSent(true);
                    } catch (err: any) {
                      setJobError(err.message || 'An unexpected error occurred.');
                    } finally {
                      setIsSendingJob(false);
                    }
                  }}
                  disabled={isSendingJob}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white h-10 font-semibold"
                >
                  {isSendingJob ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Transmitting...</>
                  ) : (
                    <><Scissors className="w-4 h-4 mr-2" /> Confirm & Send to Plotter</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

