import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface Props {
  onChange?: (dataUrl: string | null) => void;
  height?: number;
}

export function FirmaCanvas({ onChange, height = 180 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  const point = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const c = canvasRef.current!;
    onChange?.(hasInk ? c.toDataURL("image/png") : null);
  };

  const clear = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const rect = c.getBoundingClientRect();
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasInk(false);
    onChange?.(null);
  };

  return (
    <div className="space-y-2">
      <div className="border-2 border-dashed border-border rounded-md bg-white" style={{ height }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none rounded-md"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </div>
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Firmá con el dedo o el mouse</p>
        <Button type="button" size="sm" variant="ghost" onClick={clear}>
          <Eraser className="w-3 h-3 mr-1" /> Borrar
        </Button>
      </div>
    </div>
  );
}
