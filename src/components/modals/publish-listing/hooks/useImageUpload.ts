"use client";

import { useState, useCallback, useRef } from "react";
import type { ImageItem } from "../types";
import {
  MAX_FILE_SIZE_MB,
  COMPRESS_THRESHOLD_MB,
  TARGET_FILE_SIZE_KB,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGES,
} from "../constants";
import { compressImage } from "../utils";

interface UseImageUploadOptions {
  maxImages?: number;
  onImageAdded?: () => void;
}

interface UseImageUploadReturn {
  images: ImageItem[];
  setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>;
  imageError: string;
  setImageError: (error: string) => void;
  isCompressing: boolean;
  isDragOver: boolean;
  draggedImageId: string | null;
  inputFileRef: React.RefObject<HTMLInputElement | null>;

  // Handlers
  addImage: (file: File) => Promise<void>;
  removeImage: (imageId: string) => void;
  handleChangeFile: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => Promise<void>;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileInputClick: () => void;

  // Image manipulation
  rotateImage: (imageId: string) => void;
  flipImageH: (imageId: string) => void;
  flipImageV: (imageId: string) => void;

  // Drag reorder
  handleImageDragStart: (imageId: string) => void;
  handleImageDragOver: (e: React.DragEvent, targetId: string) => void;
  handleImageDragEnd: () => void;

  // Initialize from existing images
  initializeFromProduct: (existingImages: string[]) => void;
  clearImages: () => void;
}

export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const { maxImages = MAX_IMAGES, onImageAdded } = options;

  const inputFileRef = useRef<HTMLInputElement | null>(null);

  const [images, setImages] = useState<ImageItem[]>([]);
  const [imageError, setImageError] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);

  const processImage = useCallback(async (fileToProcess: File): Promise<File | null> => {
    console.log("[useImageUpload] 🖼️ Processing image:", {
      name: fileToProcess.name,
      size: fileToProcess.size,
      type: fileToProcess.type,
    });

    const fileSizeMB = fileToProcess.size / (1024 * 1024);

    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      console.log("[useImageUpload] ❌ File too large:", fileSizeMB.toFixed(1), "MB");
      setImageError(`File size (${fileSizeMB.toFixed(1)}MB) exceeds ${MAX_FILE_SIZE_MB}MB limit`);
      return null;
    }

    // Always compress images over threshold (300KB) for storage savings
    if (fileSizeMB > COMPRESS_THRESHOLD_MB) {
      console.log(
        "[useImageUpload] 📦 Compressing image (target:",
        TARGET_FILE_SIZE_KB,
        "KB, max:",
        MAX_IMAGE_DIMENSION,
        "px)..."
      );
      setIsCompressing(true);
      try {
        const compressed = await compressImage(
          fileToProcess,
          TARGET_FILE_SIZE_KB,
          MAX_IMAGE_DIMENSION
        );
        const savedPercent = (
          ((fileToProcess.size - compressed.size) / fileToProcess.size) *
          100
        ).toFixed(0);
        console.log(
          "[useImageUpload] ✅ Compression complete:",
          (compressed.size / 1024).toFixed(0),
          "KB (",
          savedPercent,
          "% saved)"
        );
        setIsCompressing(false);
        return compressed;
      } catch (err) {
        console.error("[useImageUpload] ❌ Compression failed:", err);
        setIsCompressing(false);
        return fileToProcess;
      }
    }

    console.log(
      "[useImageUpload] ✅ Image ready (under",
      COMPRESS_THRESHOLD_MB,
      "MB, no compression needed)"
    );
    return fileToProcess;
  }, []);

  const addImage = useCallback(
    async (file: File) => {
      console.log(
        "[useImageUpload] ➕ addImage called - current count:",
        images.length,
        "max:",
        maxImages
      );

      if (images.length >= maxImages) {
        console.log("[useImageUpload] ❌ Max images reached");
        setImageError(`Maximum ${maxImages} images allowed`);
        return;
      }

      setImageError("");
      const processed = await processImage(file);
      if (processed) {
        const url = URL.createObjectURL(file);
        const newImage: ImageItem = {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url,
          file: processed,
          filePath: `${Date.now()}-${file.name}`,
        };
        console.log("[useImageUpload] ✅ Image added:", newImage.id, newImage.filePath);
        setImages((prev) => [...prev, newImage]);
        onImageAdded?.();
      } else {
        console.log("[useImageUpload] ❌ Image processing returned null");
      }
    },
    [images.length, maxImages, processImage, onImageAdded]
  );

  const handleChangeFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files) {
        for (let i = 0; i < Math.min(files.length, maxImages - images.length); i++) {
          await addImage(files[i]);
        }
      }
      if (inputFileRef.current) {
        inputFileRef.current.value = "";
      }
    },
    [addImage, images.length, maxImages]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      for (let i = 0; i < Math.min(files.length, maxImages - images.length); i++) {
        if (files[i].type.startsWith("image/")) {
          await addImage(files[i]);
        }
      }
    },
    [addImage, images.length, maxImages]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeImage = useCallback((imageId: string) => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === imageId);
      if (imageToRemove && !imageToRemove.isExisting) {
        URL.revokeObjectURL(imageToRemove.url);
      }
      return prev.filter((img) => img.id !== imageId);
    });
    setImageError("");
  }, []);

  const rotateImage = useCallback((imageId: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, rotation: ((img.rotation || 0) + 90) % 360 } : img
      )
    );
  }, []);

  const flipImageH = useCallback((imageId: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, flipH: !img.flipH } : img))
    );
  }, []);

  const flipImageV = useCallback((imageId: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, flipV: !img.flipV } : img))
    );
  }, []);

  const handleImageDragStart = useCallback((imageId: string) => {
    setDraggedImageId(imageId);
  }, []);

  const handleImageDragOver = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (draggedImageId && draggedImageId !== targetId) {
        setImages((prev) => {
          const draggedIndex = prev.findIndex((img) => img.id === draggedImageId);
          const targetIndex = prev.findIndex((img) => img.id === targetId);
          const newImages = [...prev];
          const [draggedImage] = newImages.splice(draggedIndex, 1);
          newImages.splice(targetIndex, 0, draggedImage);
          return newImages;
        });
      }
    },
    [draggedImageId]
  );

  const handleImageDragEnd = useCallback(() => {
    setDraggedImageId(null);
  }, []);

  const onFileInputClick = useCallback(() => {
    inputFileRef.current?.click();
  }, []);

  const initializeFromProduct = useCallback((existingImages: string[]) => {
    if (existingImages?.length > 0) {
      setImages(
        existingImages.map((url, index) => ({
          id: `existing-${index}`,
          url,
          file: null,
          filePath: "",
          isExisting: true,
        }))
      );
    } else {
      setImages([]);
    }
    setImageError("");
  }, []);

  const clearImages = useCallback(() => {
    // Revoke all object URLs to prevent memory leaks
    images.forEach((img) => {
      if (!img.isExisting) {
        URL.revokeObjectURL(img.url);
      }
    });
    setImages([]);
    setImageError("");
  }, [images]);

  return {
    images,
    setImages,
    imageError,
    setImageError,
    isCompressing,
    isDragOver,
    draggedImageId,
    inputFileRef,
    addImage,
    removeImage,
    handleChangeFile,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    onFileInputClick,
    rotateImage,
    flipImageH,
    flipImageV,
    handleImageDragStart,
    handleImageDragOver,
    handleImageDragEnd,
    initializeFromProduct,
    clearImages,
  };
}
