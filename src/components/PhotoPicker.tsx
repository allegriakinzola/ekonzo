"use client";

import { useId, useRef, useState } from "react";
import { CameraIcon, ImageIcon, ArrowCounterClockwiseIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FacingMode = "user" | "environment";

type PhotoPickerProps = {
  /** Caméra avant (selfie) ou arrière (document) pour l'option capture native. */
  facingMode: FacingMode;
  label: string;
  hint?: string;
  onCapture: (file: File | null) => void;
  className?: string;
};

/**
 * Deux choix pour l'utilisateur :
 * 1. Ouvrir l'appareil photo natif (capture) → la photo revient dans le formulaire
 * 2. Importer une image depuis la galerie / fichiers
 */
export function PhotoPicker({
  facingMode,
  label,
  hint,
  onCapture,
  className,
}: PhotoPickerProps) {
  const id = useId();
  const cameraInputId = `${id}-camera`;
  const galleryInputId = `${id}-gallery`;
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [source, setSource] = useState<"camera" | "gallery" | null>(null);

  function applyFile(file: File | null, from: "camera" | "gallery") {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setSource(file ? from : null);
    onCapture(file);
  }

  function onInputChange(
    e: React.ChangeEvent<HTMLInputElement>,
    from: "camera" | "gallery",
  ) {
    const file = e.target.files?.[0] ?? null;
    applyFile(file, from);
    // permet de reprendre la même photo / de rouvrir la caméra
    e.target.value = "";
  }

  function clear() {
    applyFile(null, "camera");
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>

      {/* Inputs cachés */}
      <input
        ref={cameraRef}
        id={cameraInputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={facingMode}
        className="sr-only"
        onChange={(e) => onInputChange(e, "camera")}
      />
      <input
        ref={galleryRef}
        id={galleryInputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => onInputChange(e, "gallery")}
      />

      {previewUrl ? (
        <div className="space-y-3">
          <div
            className={cn(
              "relative overflow-hidden rounded-xl border bg-slate-100",
              facingMode === "user"
                ? "aspect-[3/4] max-h-[360px]"
                : "aspect-[4/3] max-h-[320px]",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Aperçu"
              className="h-full w-full object-contain"
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {source === "camera"
              ? "Photo prise avec l'appareil photo"
              : "Image importée depuis l'appareil"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => cameraRef.current?.click()}
            >
              <CameraIcon className="mr-1.5 size-4" />
              Reprendre
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={clear}
            >
              <ArrowCounterClockwiseIcon className="mr-1.5 size-4" />
              Effacer
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            className="h-12 w-full"
            onClick={() => cameraRef.current?.click()}
          >
            <CameraIcon className="mr-1.5 size-4" weight="bold" />
            Prendre une photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full"
            onClick={() => galleryRef.current?.click()}
          >
            <ImageIcon className="mr-1.5 size-4" weight="bold" />
            Importer une image
          </Button>
        </div>
      )}
    </div>
  );
}
