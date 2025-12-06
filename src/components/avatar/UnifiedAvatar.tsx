'use client';

import React, { useRef, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { createPhotoUrl } from '@/utils';
import { ALLOWED_MIME_TYPES } from '@/constants/mime-types';
import cloud from '@/assets/cloud.svg';

// ============================================================================
// Types
// ============================================================================

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

type BaseAvatarProps = {
  src?: string | null;
  alt?: string;
  size?: AvatarSize;
  className?: string;
  fallback?: React.ReactNode;
};

type DisplayAvatarProps = BaseAvatarProps & {
  variant?: 'display';
};

type UploadAvatarProps = BaseAvatarProps & {
  variant: 'upload';
  onUpload: (filePath: string, file: File) => void;
};

type RippleAvatarProps = BaseAvatarProps & {
  variant: 'ripple';
  rippleColor?: string;
};

type UnifiedAvatarProps = DisplayAvatarProps | UploadAvatarProps | RippleAvatarProps;

// ============================================================================
// Size Mapping
// ============================================================================

const sizeMap: Record<string, number> = {
  xs: 32,
  sm: 40,
  md: 64,
  lg: 96,
  xl: 128,
};

const getSize = (size: AvatarSize): number => {
  if (typeof size === 'number') return size;
  return sizeMap[size] || sizeMap.md;
};

// ============================================================================
// Avatar Fallback
// ============================================================================

function AvatarFallback({ size, className }: { size: number; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-full bg-muted flex items-center justify-center text-muted-foreground',
        className
      )}
      style={{ width: size, height: size }}
    >
      <span style={{ fontSize: size * 0.4 }}>👤</span>
    </div>
  );
}

// ============================================================================
// Display Avatar
// ============================================================================

function DisplayAvatar({ src, alt = 'Avatar', size = 'md', className, fallback }: BaseAvatarProps) {
  const pixelSize = getSize(size);

  if (!src) {
    return fallback ? <>{fallback}</> : <AvatarFallback size={pixelSize} className={className} />;
  }

  return (
    <div
      className={cn('relative rounded-full overflow-hidden', className)}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes={`${pixelSize}px`}
      />
    </div>
  );
}

// ============================================================================
// Ripple Avatar
// ============================================================================

function RippleAvatar({
  src,
  alt = 'Avatar',
  size = 'lg',
  className,
  rippleColor = 'teal',
}: BaseAvatarProps & { rippleColor?: string }) {
  const pixelSize = getSize(size);

  return (
    <div className={cn('flex justify-center items-center w-full overflow-hidden', className)}>
      <div className="relative" style={{ width: pixelSize, height: pixelSize }}>
        <div
          className="absolute block w-[300%] h-[300%] -ml-[100%] -mt-[100%] rounded-full animate-pulse-ring"
          style={{ backgroundColor: rippleColor }}
        />
        <div className="absolute top-0 w-full h-full">
          {src ? (
            <Image
              src={src}
              alt={alt}
              fill
              className="rounded-full object-cover"
              sizes={`${pixelSize}px`}
            />
          ) : (
            <AvatarFallback size={pixelSize} />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Upload Avatar
// ============================================================================

function UploadAvatar({
  src,
  alt = 'Avatar',
  size = 'lg',
  className,
  onUpload,
}: BaseAvatarProps & { onUpload: (filePath: string, file: File) => void }) {
  const pixelSize = getSize(size);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(src ?? undefined);
  const inputFileRef = useRef<HTMLInputElement | null>(null);

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const { file, filePath, url } = createPhotoUrl(event);
    onUpload(filePath, file);
    setPreviewUrl(url);
  };

  const displayUrl = previewUrl || src;

  return (
    <div
      className={cn(
        'glass-input rounded-xl p-4 border border-dashed border-blue-400',
        'transition-all duration-300 ease-in-out hover:border-blue-500 hover:-translate-y-0.5',
        className
      )}
    >
      <div className="flex justify-between items-center gap-4">
        {displayUrl ? (
          <div className="relative mx-auto" style={{ height: pixelSize, width: pixelSize }}>
            <Image
              src={displayUrl}
              alt={alt}
              fill
              className="object-cover rounded-lg"
              sizes={`${pixelSize}px`}
            />
          </div>
        ) : (
          <>
            <div className="self-center relative w-[50px] h-[50px]">
              <Image className="rounded-full" src={cloud} alt="Upload icon" fill />
            </div>
            <div className="flex-1">
              <p className="font-medium">Select a file or drag and drop here</p>
              <p className="text-sm text-muted-foreground">JPG or PNG file size no more than 10MB</p>
            </div>
          </>
        )}
        <div className="self-center relative">
          <input
            className="opacity-0 absolute h-[22%] left-0 top-[9%]"
            accept={ALLOWED_MIME_TYPES.PROFILES.join(',')}
            ref={inputFileRef}
            type="file"
            onChange={handleUpload}
          />
          <button
            onClick={() => inputFileRef?.current?.click()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Unified Avatar Component
// ============================================================================

export function UnifiedAvatar(props: UnifiedAvatarProps) {
  const { variant = 'display' } = props;

  switch (variant) {
    case 'upload':
      return <UploadAvatar {...props} onUpload={(props as UploadAvatarProps).onUpload} />;
    case 'ripple':
      return <RippleAvatar {...props} rippleColor={(props as RippleAvatarProps).rippleColor} />;
    default:
      return <DisplayAvatar {...props} />;
  }
}

// Named exports for convenience
export { DisplayAvatar, RippleAvatar, UploadAvatar, AvatarFallback };
