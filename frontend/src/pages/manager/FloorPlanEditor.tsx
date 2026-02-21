import {
ArrowLeft,
Circle as CircleIcon,
Grid3x3,
Save,
Square,
Trash2,
Upload
} from "lucide-react";
import { useEffect,useRef,useState } from "react";
import { useNavigate,useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import api from "../../lib/api";

export default function FloorPlanEditor() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [plan, setPlan] = useState(null);
  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [zoom, _setZoom] = useState(1);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [backgroundImage, setBackgroundImage] = useState(null);
  
  const gridSize = 20;

  useEffect(() => {
    loadFloorPlan();
  }, [planId]);

  useEffect(() => {
    if (plan) {
      drawCanvas();
    }
  }, [objects, selectedObject, zoom, backgroundImage]);

  const loadFloorPlan = async () => {
    try {
      const response = await api.get(`/floor-plans/${planId}`);
      setPlan(response.data);
      setObjects(response.data.objects || []);
      
      if (response.data.background_image_url) {
        const img = new Image();
        img.src = response.data.background_image_url;
        img.onload = () => setBackgroundImage(img);
      }
    } catch (error) {
      toast.error("Failed to load floor plan");
      navigate("/manager/floor-plans");
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !plan) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image
    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    }

    // Draw grid
    if (snapToGrid) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw objects
    objects.forEach((obj) => {
      const isSelected = selectedObject?.id === obj.id;
      
      ctx.save();
      ctx.translate(obj.x + obj.w / 2, obj.y + obj.h / 2);
      ctx.rotate((obj.rotation || 0) * Math.PI / 180);
      ctx.translate(-(obj.x + obj.w / 2), -(obj.y + obj.h / 2));

      // Draw shape
      if (obj.shape === "circle") {
        ctx.beginPath();
        const radius = Math.min(obj.w, obj.h) / 2;
        ctx.arc(obj.x + obj.w / 2, obj.y + obj.h / 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = obj.meta_json?.vip ? "rgba(255, 215, 0, 0.3)" : "rgba(249, 115, 22, 0.3)";
        ctx.fill();
        ctx.strokeStyle = isSelected ? "#22c55e" : "#f97316";
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = obj.meta_json?.vip ? "rgba(255, 215, 0, 0.3)" : "rgba(249, 115, 22, 0.3)";
        ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
        ctx.strokeStyle = isSelected ? "#22c55e" : "#f97316";
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
      }

      // Draw label
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(obj.label, obj.x + obj.w / 2, obj.y + obj.h / 2);

      // Draw seat count
      if (obj.meta_json?.seats) {
        ctx.font = "12px sans-serif";
        ctx.fillText(
          `${obj.meta_json.seats} seats`,
          obj.x + obj.w / 2,
          obj.y + obj.h / 2 + 15
        );
      }

      ctx.restore();

      // Draw resize handle if selected
      if (isSelected) {
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(obj.x + obj.w - 8, obj.y + obj.h - 8, 16, 16);
      }
    });
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on an object
    const clicked = objects.find((obj) => {
      if (obj.shape === "circle") {
        const radius = Math.min(obj.w, obj.h) / 2;
        const dx = x - (obj.x + obj.w / 2);
        const dy = y - (obj.y + obj.h / 2);
        return Math.sqrt(dx * dx + dy * dy) <= radius;
      } else {
        return x >= obj.x && x <= obj.x + obj.w && y >= obj.y && y <= obj.y + obj.h;
      }
    });

    if (clicked) {
      setSelectedObject(clicked);
      setDragStart({ x, y, objX: clicked.x, objY: clicked.y });
    } else {
      setSelectedObject(null);
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!dragStart || !selectedObject) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    let newX = dragStart.objX + dx;
    let newY = dragStart.objY + dy;

    if (snapToGrid) {
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }

    setObjects(objects.map(obj => 
      obj.id === selectedObject.id 
        ? { ...obj, x: newX, y: newY }
        : obj
    ));
    setSelectedObject({ ...selectedObject, x: newX, y: newY });
  };

  const handleCanvasMouseUp = () => {
    setDragStart(null);
  };

  const addTable = (shape) => {
    const newTable = {
      id: `obj-${Date.now()}`,
      floor_plan_id: planId,
      type: "table",
      label: String(objects.filter(o => o.type === "table").length + 1),
      x: 100,
      y: 100,
      w: shape === "circle" ? 100 : 150,
      h: shape === "circle" ? 100 : 100,
      rotation: 0,
      shape,
      meta_json: { seats: 4, vip: false }
    };
    setObjects([...objects, newTable]);
    toast.success("Table added");
  };

  const deleteSelected = () => {
    if (!selectedObject) return;
    if (!window.confirm(`Delete ${selectedObject.label}?`)) return;
    
    setObjects(objects.filter(obj => obj.id !== selectedObject.id));
    setSelectedObject(null);
    toast.success("Object deleted");
  };

  const handleSave = async () => {
    try {
      await api.post(`/floor-plans/${planId}/objects/bulk-save`, objects);
      toast.success("Floor plan saved");
    } catch (error) {
      toast.error("Failed to save floor plan");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      // @ts-ignore
      img.src = event.target.result;
      img.onload = () => {
        setBackgroundImage(img);
        toast.success("Background image loaded");
      };
    };
    reader.readAsDataURL(file);
  };

  if (!plan) {
    return <div className="p-8 text-foreground">Loading...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Toolbar */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/manager/floor-plans")}
              className="border-border"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-heading font-bold text-foreground">{plan.name}</h1>
              <p className="text-sm text-muted-foreground">{objects.length} objects</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input aria-label="Input"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="border-border"
            >
              <Upload className="w-4 h-4 mr-2" />
              Background
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`border-border ${snapToGrid ? 'bg-red-500/20' : ''}`}
            >
              <Grid3x3 className="w-4 h-4 mr-2" />
              Grid
            </Button>

            <Button
              variant="outline"
              onClick={() => addTable("rectangle")}
              className="border-border"
            >
              <Square className="w-4 h-4 mr-2" />
              Rectangle
            </Button>

            <Button
              variant="outline"
              onClick={() => addTable("circle")}
              className="border-border"
            >
              <CircleIcon className="w-4 h-4 mr-2" />
              Circle
            </Button>

            {selectedObject && (
              <Button
                variant="outline"
                onClick={deleteSelected}
                className="border-border text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}

            <Button onClick={handleSave} className="bg-red-500 hover:bg-red-600">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto bg-background p-8">
        <Card className="inline-block bg-white">
          <canvas
            ref={canvasRef}
            width={plan.width}
            height={plan.height}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className="cursor-crosshair"
            style={{ /* keep-inline */
              transform: `scale(${zoom})`,
              transformOrigin: "top left"
             /* keep-inline */ }}
          />
        </Card>
      </div>

      {/* Properties Panel */}
      {selectedObject && (
        <div className="bg-card border-t border-border p-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Label</label>
              <Input aria-label="Input field"
                value={selectedObject.label}
                onChange={(e) => {
                  const updated = { ...selectedObject, label: e.target.value };
                  setObjects(objects.map(obj => obj.id === selectedObject.id ? updated : obj));
                  setSelectedObject(updated);
                }}
                className="w-24 bg-secondary border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Seats</label>
              <Input aria-label="Input field"
                type="number"
                value={selectedObject.meta_json?.seats || 4}
                onChange={(e) => {
                  const updated = {
                    ...selectedObject,
                    meta_json: { ...selectedObject.meta_json, seats: parseInt(e.target.value) }
                  };
                  setObjects(objects.map(obj => obj.id === selectedObject.id ? updated : obj));
                  setSelectedObject(updated);
                }}
                className="w-20 bg-secondary border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">X</label>
              <Input aria-label="Input field"
                type="number"
                value={Math.round(selectedObject.x)}
                onChange={(e) => {
                  const updated = { ...selectedObject, x: parseInt(e.target.value) };
                  setObjects(objects.map(obj => obj.id === selectedObject.id ? updated : obj));
                  setSelectedObject(updated);
                }}
                className="w-24 bg-secondary border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Y</label>
              <Input aria-label="Input field"
                type="number"
                value={Math.round(selectedObject.y)}
                onChange={(e) => {
                  const updated = { ...selectedObject, y: parseInt(e.target.value) };
                  setObjects(objects.map(obj => obj.id === selectedObject.id ? updated : obj));
                  setSelectedObject(updated);
                }}
                className="w-24 bg-secondary border-border text-foreground"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
