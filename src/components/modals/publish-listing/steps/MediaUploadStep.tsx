"use client";

import React, { RefObject } from "react";
import { Loader2, Plus, ZoomIn, GripVertical, X, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RequiredStar } from "@/components";
import { ALLOWED_MIME_TYPES } from "@/constants/mime-types";
import { MAX_IMAGES } from "../constants";
import type { ImageItem } from "../types";

interface MediaUploadStepProps {
  images: ImageItem[];
  imageError: string | null;
  showImageError: boolean;
  isCompressing: boolean;
  isDragOver: boolean;
  draggedImageId: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  removeImage: (id: string) => void;
  handleChangeFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileInputClick: () => void;
  handleImageDragStart: (id: string) => void;
  handleImageDragOver: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  handleImageDragEnd: () => void;
  onOpenLightbox: (index: number) => void;
}

export function MediaUploadStep({
  images,
  imageError,
  showImageError,
  isCompressing,
  isDragOver,
  draggedImageId,
  fileInputRef,
  removeImage,
  handleChangeFile,
  handleDrop,
  handleDragOver,
  handleDragLeave,
  onFileInputClick,
  handleImageDragStart,
  handleImageDragOver,
  handleImageDragEnd,
  onOpenLightbox,
}: MediaUploadStepProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        Photos
        <RequiredStar />
        <span className="text-xs text-muted-foreground ml-1">
          ({images.length}/{MAX_IMAGES})
        </span>
      </Label>

      <div className="grid grid-cols-4 gap-2">
        {images.map((image, index) => (
          <div
            key={image.id}
            draggable
            onDragStart={() => handleImageDragStart(image.id)}
            onDragOver={(e) => handleImageDragOver(e, image.id)}
            onDragEnd={handleImageDragEnd}
            className={`relative aspect-square rounded-lg overflow-hidden border-2 group cursor-move
                ${index === 0 ? "col-span-2 row-span-2" : ""}
                ${draggedImageId === image.id ? "opacity-50 border-primary" : "border-transparent"}
              `}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={`Image ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
            {index === 0 && (
              <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-medium rounded">
                Primary
              </span>
            )}
            <button
              type="button"
              onClick={() => onOpenLightbox(index)}
              className="absolute top-1 left-1/2 -translate-x-1/2 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ZoomIn className="h-3 w-3 text-white" />
            </button>
            <div className="absolute top-1 right-8 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-3 w-3 text-white" />
            </div>
            <button
              type="button"
              onClick={() => removeImage(image.id)}
              className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {images.length < MAX_IMAGES && (
          <div
            onClick={onFileInputClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            role="button"
            tabIndex={0}
            aria-label="Add image"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onFileInputClick();
              }
            }}
            className={`
                aspect-square rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer
                flex flex-col items-center justify-center gap-1
                ${images.length === 0 ? "col-span-2 row-span-2" : ""}
                ${isDragOver ? "border-primary bg-primary/5 scale-[1.02]" : ""}
                ${showImageError ? "border-destructive bg-destructive/5" : ""}
                ${!isDragOver && !showImageError ? "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50" : ""}
              `}
          >
            {isCompressing ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <>
                <Plus
                  className={`h-6 w-6 ${showImageError ? "text-destructive" : "text-muted-foreground"}`}
                />
                {images.length === 0 && (
                  <span className="text-xs text-muted-foreground text-center px-2">
                    Drop images or click
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <input
        className="hidden"
        accept={ALLOWED_MIME_TYPES.POSTS.join(",")}
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleChangeFile}
      />

      {imageError && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {imageError}
        </p>
      )}
      {showImageError && !imageError && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Please add at least one photo
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Drag to reorder. First image will be the cover.
      </p>
    </div>
  );
}
