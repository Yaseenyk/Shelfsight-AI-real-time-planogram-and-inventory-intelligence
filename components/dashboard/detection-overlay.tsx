"use client";

import { useEffect, useRef, useState } from "react";

import type { Detection } from "@/lib/types/api";
import { cn } from "@/lib/utils";

/**
 * Draws the detector's boxes over the photograph the user just took.
 *
 * This is the difference between a form and a demonstration. Reporting "138
 * products found" asks the reader to take the number on faith; drawing 138
 * boxes onto their own shelf lets them check it in a second, and is the moment
 * the system stops looking like a spreadsheet.
 *
 * Boxes are drawn on a canvas rather than as DOM nodes: at ~140 detections per
 * shelf, absolutely-positioned divs cost a layout pass each and the reveal
 * stutters on the low-end hardware this is meant to run on.
 *
 * The reveal is staggered so the count is legible as it climbs. Under
 * `prefers-reduced-motion` every box is drawn at once instead.
 */
export function DetectionOverlay({
  imageUrl,
  detections,
  className,
}: {
  imageUrl: string;
  detections: Detection[];
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef<number | null>(null);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = (count: number) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // Match the canvas to the image's *rendered* size so boxes land correctly
      // whatever the container width, then scale normalised coords onto it.
      const { width, height } = image.getBoundingClientRect();
      if (!width || !height) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < count && i < detections.length; i += 1) {
        const box = detections[i]!.bbox;
        const x = box.x1 * width;
        const y = box.y1 * height;
        const w = (box.x2 - box.x1) * width;
        const h = (box.y2 - box.y1) * height;

        // The newest few boxes glow, so the eye follows the reveal.
        const age = count - i;
        const fresh = age <= 6 && !reduceMotion;

        ctx.lineWidth = fresh ? 2.5 : 1.5;
        ctx.strokeStyle = fresh ? "rgba(56,189,248,0.95)" : "rgba(34,197,94,0.85)";
        ctx.fillStyle = fresh ? "rgba(56,189,248,0.18)" : "rgba(34,197,94,0.10)";
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 3);
        ctx.fill();
        ctx.stroke();
      }
    };

    if (reduceMotion || detections.length === 0) {
      setRevealed(detections.length);
      draw(detections.length);
      return;
    }

    // ~700 ms total regardless of count, so a dense shelf does not crawl.
    const perFrame = Math.max(1, Math.ceil(detections.length / 42));
    let shown = 0;
    const step = () => {
      shown = Math.min(shown + perFrame, detections.length);
      setRevealed(shown);
      draw(shown);
      if (shown < detections.length) {
        frameRef.current = requestAnimationFrame(step);
      }
    };
    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [detections, imageUrl]);

  return (
    <figure className={cn("relative overflow-hidden rounded-lg border border-border", className)}>
      {/* A blob/object URL cannot be optimised by next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={imageUrl}
        alt="The shelf you photographed, with each product the system found outlined"
        className="block w-full object-contain"
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute left-0 top-0"
        aria-hidden
      />
      <figcaption className="flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-2.5 text-sm">
        <span className="font-medium">
          <span className="tabular">{revealed}</span> product
          {revealed === 1 ? "" : "s"} found on this shelf
        </span>
        <span className="text-xs text-muted-foreground">Each box is one product</span>
      </figcaption>
    </figure>
  );
}
