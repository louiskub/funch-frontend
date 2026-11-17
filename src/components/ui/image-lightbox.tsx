"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent, WheelEvent } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "@/components/ui/icons";

export type LightboxImage = {
  id: string;
  url: string;
  originalName: string;
};

export type ImageLightboxLabels = {
  dialog: string;
  vehiclePhoto: string;
  zoomOut: string;
  zoomIn: string;
  reset: string;
  download: string;
  close: string;
  previous: string;
  next: string;
  dragToPan: string;
  doubleClickToZoom: string;
  thumbnail: (index: number) => string;
};

type ImageLightboxProps = {
  isOpen: boolean;
  onClose: () => void;
  images: LightboxImage[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  labels: ImageLightboxLabels;
};

export function ImageLightbox({
  isOpen,
  onClose,
  images,
  currentIndex,
  onIndexChange,
  labels,
}: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });

  const handleReset = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleNavigate = useCallback((newIndex: number) => {
    handleReset();
    onIndexChange(newIndex);
  }, [handleReset, onIndexChange]);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  const handleZoomChange = useCallback((newZoom: number) => {
    const clamped = Math.max(0.5, Math.min(4, Math.round(newZoom * 100) / 100));
    if (clamped <= 1) setPosition({ x: 0, y: 0 });
    setZoom(clamped);
  }, []);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (zoom <= 1) return;
    event.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      posX: position.x,
      posY: position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setPosition({
      x: dragStartRef.current.posX + event.clientX - dragStartRef.current.startX,
      y: dragStartRef.current.posY + event.clientY - dragStartRef.current.startY,
    });
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    handleZoomChange(zoom + (event.deltaY < 0 ? 0.25 : -0.25));
  }

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
      if (event.key === "ArrowLeft" && currentIndex > 0) handleNavigate(currentIndex - 1);
      if (event.key === "ArrowRight" && currentIndex < images.length - 1) handleNavigate(currentIndex + 1);
      if (event.key === "+" || event.key === "=") handleZoomChange(zoom + 0.25);
      if (event.key === "-") handleZoomChange(zoom - 0.25);
      if (event.key === "0") handleReset();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length, handleClose, handleNavigate, handleZoomChange, handleReset, zoom]);

  if (!isOpen || !images.length) return null;
  const current = images[currentIndex];
  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={labels.dialog}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isDragging) handleClose();
      }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-black/92 p-4 backdrop-blur-md animate-in fade-in duration-200 sm:p-6"
    >
      <div className="flex w-full max-w-6xl items-center justify-between text-white">
        <div className="text-xs font-semibold">
          {current.originalName || labels.vehiclePhoto} · {currentIndex + 1} / {images.length}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => handleZoomChange(zoom - 0.25)} aria-label={labels.zoomOut} className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <ZoomOutIcon size={18} />
          </button>
          <span className="w-12 text-center font-mono text-xs text-white/70">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => handleZoomChange(zoom + 0.25)} aria-label={labels.zoomIn} className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <ZoomInIcon size={18} />
          </button>
          <button type="button" onClick={handleReset} className="rounded-lg px-2 py-1 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            {labels.reset}
          </button>
          <span className="mx-1 h-4 w-px bg-white/20" />
          <button
            type="button"
            onClick={async () => {
              try {
                const response = await fetch(current.url);
                if (!response.ok) throw new Error("Image download failed");
                const blobUrl = window.URL.createObjectURL(await response.blob());
                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = current.originalName || "vehicle-photo.jpg";
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(blobUrl);
              } catch {
                window.open(current.url, "_blank", "noopener,noreferrer");
              }
            }}
            aria-label={labels.download}
            className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <DownloadIcon size={18} />
          </button>
          <button type="button" onClick={handleClose} aria-label={labels.close} className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <XIcon size={20} />
          </button>
        </div>
      </div>

      <div onWheel={handleWheel} className="relative my-2 flex w-full max-w-6xl flex-1 select-none items-center justify-center overflow-hidden">
        {currentIndex > 0 && (
          <button type="button" onClick={() => handleNavigate(currentIndex - 1)} aria-label={labels.previous} className="absolute left-2 z-20 rounded-full bg-black/60 p-3 text-white transition-colors hover:bg-black/90">
            <ChevronLeftIcon size={24} />
          </button>
        )}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={() => zoom > 1 ? handleReset() : handleZoomChange(2)}
          className="relative flex h-[72vh] w-full touch-none items-center justify-center overflow-hidden"
          style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in" }}
          title={zoom > 1 ? labels.dragToPan : labels.doubleClickToZoom}
        >
          <img
            src={current.url}
            alt={current.originalName || labels.vehiclePhoto}
            draggable={false}
            style={{
              transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${zoom})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.12s ease-out",
            }}
            className="pointer-events-none max-h-full max-w-full select-none rounded-lg object-contain"
          />
        </div>
        {zoom > 1 && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/75 px-3 py-1 text-[10px] font-semibold text-white/90 shadow-md backdrop-blur-xs">
            {labels.dragToPan}
          </div>
        )}
        {currentIndex < images.length - 1 && (
          <button type="button" onClick={() => handleNavigate(currentIndex + 1)} aria-label={labels.next} className="absolute right-2 z-20 rounded-full bg-black/60 p-3 text-white transition-colors hover:bg-black/90">
            <ChevronRightIcon size={24} />
          </button>
        )}
      </div>

      <div className="flex max-w-5xl gap-2 overflow-x-auto p-2">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => handleNavigate(index)}
            aria-label={labels.thumbnail(index + 1)}
            aria-current={index === currentIndex ? "true" : undefined}
            className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded-[6px] border-2 transition-all ${index === currentIndex ? "scale-105 border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}
          >
            <img src={image.url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
