import { useEffect, useRef, useState } from "react";
import { Loader2, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

// Render every page of a PDF as <canvas> stacked vertically so the page scroll
// (not an iframe) controls navigation. Click a page to view it fullscreen.
export function PdfPagesView({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreenSrc, setFullscreenSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const pdfjs: any = await import("pdfjs-dist");
        const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

        const loadingTask = pdfjs.getDocument({ url });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";

        const containerWidth = container.clientWidth || 600;

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          const scale = (containerWidth - 4) / viewport.width;
          const scaled = page.getViewport({ scale: scale * (window.devicePixelRatio || 1) });

          const wrapper = document.createElement("button");
          wrapper.type = "button";
          wrapper.className = "block w-full p-0 m-0 bg-transparent border-0 cursor-zoom-in";
          wrapper.style.marginBottom = "8px";
          wrapper.setAttribute("aria-label", `Ver página ${i} en pantalla completa`);

          const canvas = document.createElement("canvas");
          canvas.width = scaled.width;
          canvas.height = scaled.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          canvas.style.background = "white";
          canvas.style.borderRadius = "4px";
          canvas.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";

          const label = document.createElement("div");
          label.textContent = `Página ${i} de ${pdf.numPages} · tocá para ampliar`;
          label.className = "text-xs text-muted-foreground text-center pt-1 pb-2";

          wrapper.appendChild(canvas);
          wrapper.appendChild(label);
          container.appendChild(wrapper);

          wrapper.addEventListener("click", () => {
            setFullscreenSrc(canvas.toDataURL("image/png"));
          });

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport: scaled, canvas }).promise;
        }
        if (!cancelled) setLoading(false);
      } catch (e: any) {
        console.error("PDF render error", e);
        if (!cancelled) {
          setError("No se pudo mostrar el PDF. Tocá 'Abrir / descargar' para verlo.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="w-full">
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && <p className="text-sm text-destructive p-3">{error}</p>}
      <div ref={containerRef} className="w-full" />

      {fullscreenSrc && (
        <FullscreenZoom src={fullscreenSrc} onClose={() => setFullscreenSrc(null)} />
      )}
    </div>
  );
}

function FullscreenZoom({ src, onClose }: { src: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const clamp = (z: number) => Math.min(6, Math.max(0.5, z));
  const zoomIn = () => setZoom((z) => clamp(z + 0.25));
  const zoomOut = () => setZoom((z) => clamp(z - 0.25));
  const reset = () => setZoom(1);

  // Pinch-to-zoom via wheel + ctrl (trackpads) and touch gesture
  const lastDist = useRef<number | null>(null);
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (lastDist.current != null) {
      const delta = (dist - lastDist.current) / 200;
      setZoom((z) => clamp(z + delta));
    }
    lastDist.current = dist;
  };
  const onTouchEnd = () => {
    lastDist.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) => clamp(z - e.deltaY * 0.01));
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col"
      onClick={onClose}
    >
      <div
        className="absolute top-3 right-3 z-10 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2" onClick={zoomOut} aria-label="Alejar">
          <ZoomOut className="w-5 h-5" />
        </button>
        <div className="bg-white/10 text-white text-xs px-2 py-1 rounded-full min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </div>
        <button type="button" className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2" onClick={zoomIn} aria-label="Acercar">
          <ZoomIn className="w-5 h-5" />
        </button>
        <button type="button" className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2" onClick={reset} aria-label="Restablecer zoom">
          <RotateCcw className="w-5 h-5" />
        </button>
        <button type="button" className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2" onClick={onClose} aria-label="Cerrar">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto flex items-start justify-center p-2"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
        style={{ touchAction: "pan-x pan-y pinch-zoom" }}
      >
        <img
          src={src}
          alt="Página ampliada"
          style={{
            width: `${zoom * 100}%`,
            maxWidth: "none",
            height: "auto",
            transition: "width 0.1s ease-out",
            userSelect: "none",
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
