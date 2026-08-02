"use client";

import { useRef, useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

export function ZoomOverlay({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1.6);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - dragging.current.startX;
    const dy = e.clientY - dragging.current.startY;
    setPos({ x: dragging.current.origX + dx, y: dragging.current.origY + dy });
  }
  function onPointerUp() {
    dragging.current = null;
    setIsDragging(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setScale((s) => Math.min(4, s + 0.4));
          }}
          className="rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
          aria-label="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setScale((s) => Math.max(1, s - 0.4));
          }}
          className="rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
          aria-label="Zoom out"
        >
          <ZoomOut size={18} />
        </button>
        <button onClick={onClose} className="rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div
        className="max-h-[90vh] max-w-[92vw] overflow-hidden touch-none"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Zoomed page"
          draggable={false}
          className="select-none"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transition: isDragging ? "none" : "transform 120ms ease",
            cursor: scale > 1 ? "grab" : "default",
            maxHeight: "90vh",
          }}
        />
      </div>
    </div>
  );
}
