"use client";

import { Camera, ImageUp, Loader2, StopCircle, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type Mode = "upload" | "camera";

/**
 * Shared capture surface for every pipeline page: drop/choose a file, or grab a
 * frame from the webcam. The parent owns what happens to the file — this
 * component only produces one.
 */
export function CapturePanel({
  title = "Capture",
  description = "Upload a shelf frame or grab one from the camera.",
  actionLabel = "Analyse frame",
  isPending = false,
  error,
  onSubmit,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  isPending?: boolean;
  error?: ApiError | null;
  onSubmit: (file: File) => void | Promise<unknown>;
}) {
  const [mode, setMode] = useState<Mode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const selectFile = useCallback((next: File) => {
    setFile(next);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(next);
    });
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Release the object URL and the camera when the panel unmounts.
  useEffect(() => {
    return () => {
      stopCamera();
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    };
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (caught) {
      setCameraError(
        caught instanceof Error ? caught.message : "Camera permission was denied",
      );
    }
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      selectFile(new File([blob], `frame-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }, [selectFile]);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex gap-1 rounded-md bg-muted p-1">
          <Button
            size="sm"
            variant={mode === "upload" ? "default" : "ghost"}
            onClick={() => {
              setMode("upload");
              stopCamera();
            }}
          >
            <ImageUp className="h-3.5 w-3.5" aria-hidden />
            Upload
          </Button>
          <Button
            size="sm"
            variant={mode === "camera" ? "default" : "ghost"}
            onClick={() => {
              setMode("camera");
              void startCamera();
            }}
          >
            <Camera className="h-3.5 w-3.5" aria-hidden />
            Camera
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {mode === "upload" ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              const dropped = event.dataTransfer.files?.[0];
              if (dropped?.type.startsWith("image/")) selectFile(dropped);
            }}
            className={cn(
              "flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40",
            )}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
            }}
          >
            {previewUrl ? (
              // Blob preview: next/image cannot optimise an object URL.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Selected shelf frame"
                className="max-h-[320px] rounded-md object-contain"
              />
            ) : (
              <>
                <Upload className="mb-2 h-7 w-7 text-muted-foreground" aria-hidden />
                <p className="text-sm font-medium">Drop a shelf image here</p>
                <p className="text-xs text-muted-foreground">JPEG, PNG or WebP · up to 20 MB</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/bmp"
              className="hidden"
              onChange={(event) => {
                const chosen = event.target.files?.[0];
                if (chosen) selectFile(chosen);
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-border bg-black">
              <video ref={videoRef} playsInline muted className="max-h-[320px] w-full object-contain" />
            </div>
            {cameraError ? (
              <p className="text-xs text-destructive">{cameraError}</p>
            ) : null}
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={captureFrame}>
                <Camera className="h-3.5 w-3.5" aria-hidden />
                Grab frame
              </Button>
              <Button size="sm" variant="ghost" onClick={stopCamera}>
                <StopCircle className="h-3.5 w-3.5" aria-hidden />
                Stop
              </Button>
            </div>
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Captured frame"
                className="max-h-[160px] rounded-md border border-border object-contain"
              />
            ) : null}
          </div>
        )}

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error.isServiceUnavailable
              ? `${error.message} — the pipeline runs once weights are in place.`
              : error.message}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs text-muted-foreground">
            {file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : "No frame selected"}
          </p>
          <Button disabled={!file || isPending} onClick={() => file && void onSubmit(file)}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Upload className="h-4 w-4" aria-hidden />
            )}
            {actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
