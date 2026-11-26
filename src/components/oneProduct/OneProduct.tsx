"use client";

import { useState } from "react";

import { updateRoom } from "@/app/actions/chat";
import { updateProduct } from "@/app/actions/products";
import { OpenStatus } from "@/components/OpenStatus";
import AuthenticationUserModal from "@/components/modals/AuthenticationUser/AuthenticationUserModal";
import PopupNotificationModal from "@/components/modals/PopupNotificationModal";
import TopTips from "@/components/topTips/TopTips";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { InitialProductStateType } from "@/types/product.types";
import { Bus, Clock, Eye, Heart, MapPin, Package, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";

const ONE_PRODUCT_LABELS = {
  likesSuffix: "likes",
} as const;

export type OneProductType = {
  product: InitialProductStateType;
  buttonValue: string;
  chat?: string;
  navigateHandler?: () => void;
  size?: string;
  sharerId?: string;
  requesterId?: string;
  roomId?: string;
};

/**
 * OneProduct Component
 * Displays product details with actions
 * Uses React Query instead of Redux for mutations
 */
export function OneProduct({ chat, product, buttonValue, navigateHandler, size, requesterId, roomId }: OneProductType) {
  const t = useTranslations();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Auth state from Zustand
  const { isAuthenticated } = useAuth();

  // Handler using Server Actions
  const onClick = async () => {
    if (buttonValue === "completed" || isUpdating) return;

    if (navigateHandler) {
      navigateHandler();
    }

    if (buttonValue === "approval pending") {
      setIsUpdating(true);
      setUpdateError(null);
      try {
        const formData = new FormData();
        formData.set("is_active", "false");
        formData.set("version", String(product.version ?? ""));

        const result = await updateProduct(product.id, formData);
        if (!result.success) throw new Error(result.error.message);

        if (roomId && requesterId) {
          const roomFormData = new FormData();
          roomFormData.set("post_arranged_to", requesterId);
          const roomResult = await updateRoom(roomId, roomFormData);
          if (!roomResult.success) throw new Error(roomResult.error.message);
        }

        router.refresh();
      } catch (error) {
        console.error("Failed to update:", error);
        setUpdateError(error instanceof Error ? error.message : "Could not update this listing. Please try again.");
      } finally {
        setIsUpdating(false);
      }
    }

    if (buttonValue === "leave a feedBack") {
      setIsOpen(true);
    }
  };

  const onStarClick = (index: number) => setRating(index + 1);
  const onClose = () => setIsOpen(false);

  // React Compiler handles memoization automatically
  const isDisabled = buttonValue === "leave a feedBack" ? product.is_active : false;
  const variant = buttonValue === "completed" ? "accentGreen" : "accentOrange";
  const cursor = buttonValue === "completed" ? "default" : "pointer";

  // Chat mode - compact view
  if (chat) {
    return (
      <div className="glass rounded-xl p-5 transition-all duration-300 ease-in-out" style={{ width: size }}>
        <div className="flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.images?.[0] || ""}
            className="rounded-full mx-auto"
            alt={product.post_name}
            width="100"
            height="100"
            style={{ objectFit: "cover" }}
            loading="lazy"
            decoding="async"
          />
          <h2 className="text-lg font-semibold text-center">{product.post_name}</h2>
          <TopTips />
        </div>
      </div>
    );
  }

  // Full product detail view
  return (
    <div className="glass rounded-xl p-0 w-full max-w-[600px] overflow-hidden transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(0,0,0,0.1)]">
      {/* Hero Image */}
      <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.images?.[0] || ""}
          alt={product.post_name}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title */}
        <h1 className="text-2xl font-semibold mb-2">{product.post_name}</h1>

        {/* Location */}
        <div className="flex items-center gap-2 mb-4 text-muted-foreground">
          <MapPin className="size-4 shrink-0 text-primary/80" aria-hidden="true" />
          <p className="text-base">{product.post_stripped_address}</p>
        </div>

        {product.partner_status && (
          <p className="mb-4 text-sm font-medium text-muted-foreground">{product.partner_status}</p>
        )}

        <hr className="my-4 border-border" />

        {/* Stats Row */}
        <div className="flex justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Heart className="size-4 text-rose-500/80" aria-hidden="true" />
            <p className="text-sm">{`${product.post_like_counter || 0} ${ONE_PRODUCT_LABELS.likesSuffix}`}</p>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Eye className="size-4 text-blue-500/80" aria-hidden="true" />
            <p className="text-sm">{t("views_count", { count: product.post_views || 0 })}</p>
          </div>
        </div>

        {/* Rating */}
        <div className="flex justify-center gap-1 mb-4" role="group" aria-label="Rating">
          {[0, 1, 2, 3, 4].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onStarClick(star)}
              className="p-1 rounded-sm transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring"
              aria-label={`Rate ${star + 1} stars`}
            >
              <Star
                className={cn(
                  "size-5 transition-colors",
                  star < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30 hover:text-amber-300",
                )}
              />
            </button>
          ))}
        </div>

        <hr className="my-4 border-border" />

        {/* Details */}
        <div className="flex flex-col gap-3 mb-4">
          {/* Available Hours */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-foreground/80">
              <Clock className="size-4 text-primary/70" aria-hidden="true" />
              <p className="font-medium">{t("available")}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {product.partner_status || product.opening_hours ? (
                <OpenStatus hours={product.opening_hours} timezone={product.timezone} />
              ) : null}
              <p className="text-muted-foreground">
                {product.available_hours || (product.partner_status ? "Hours unavailable" : "Anytime")}
              </p>
            </div>
          </div>

          {/* Description/Quantity */}
          {product.post_description && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-foreground/80">
                <Package className="size-4 text-primary/70" aria-hidden="true" />
                <p className="font-medium">{t("details")}</p>
              </div>
              <p className="text-muted-foreground text-end max-w-[60%]">{product.post_description}</p>
            </div>
          )}

          {/* Transportation */}
          {product.transportation && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-foreground/80">
                <Bus className="size-4 text-primary/70" aria-hidden="true" />
                <p className="font-medium">{t("transport")}</p>
              </div>
              <p className="text-muted-foreground uppercase text-sm">{product.transportation}</p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-6">
          {updateError && (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {updateError}
            </p>
          )}
          {!isAuthenticated ? (
            <AuthenticationUserModal oneProductComponent mode="login" />
          ) : (
            <Button
              variant="glass"
              onClick={onClick}
              disabled={isUpdating || isDisabled}
              className={`w-full uppercase font-semibold py-3 ${
                variant === "accentGreen" ? "glass-accent-primary" : "glass-accent-orange"
              } ${isDisabled ? "opacity-50 pointer-events-none" : ""}`}
              style={{ cursor }}
            >
              {buttonValue}
            </Button>
          )}
        </div>
      </div>

      {/* Modals */}
      <PopupNotificationModal isOpen={isOpen} onClose={onClose} />
    </div>
  );
}
