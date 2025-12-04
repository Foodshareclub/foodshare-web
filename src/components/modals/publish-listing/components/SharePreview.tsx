"use client";

import React, { useState, useCallback } from "react";
import { FaCheckCircle, FaFacebookF, FaLink, FaShareAlt, FaTwitter } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import { Button } from "@/components/ui/button";

interface SharePreviewProps {
  title: string;
  description: string;
  imageUrl: string;
  onClose: () => void;
}

export const SharePreview: React.FC<SharePreviewProps> = ({
  title,
  description,
  imageUrl,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.origin + "/listing/preview");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div className="p-4 rounded-lg bg-muted/50 space-y-3 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex items-center gap-2">
          <FaShareAlt className="h-4 w-4 text-muted-foreground" />
          Share Preview
        </p>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <IoMdClose className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Preview card */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {imageUrl && (
          <div className="h-32 bg-muted">
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}
        <div className="p-3">
          <p className="font-medium text-sm line-clamp-1">{title || "Your listing title"}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {description || "Your listing description will appear here..."}
          </p>
          <p className="text-xs text-primary mt-2">foodshare.app</p>
        </div>
      </div>

      {/* Share buttons */}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={copyLink}>
          {copied ? (
            <>
              <FaCheckCircle className="h-4 w-4 mr-1.5 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <FaLink className="h-4 w-4 mr-1.5" />
              Copy Link
            </>
          )}
        </Button>
        <Button type="button" variant="outline" size="sm" className="p-2" title="Share on Facebook">
          <FaFacebookF className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" className="p-2" title="Share on Twitter">
          <FaTwitter className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
