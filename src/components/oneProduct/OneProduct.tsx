"use client";

import { useState } from "react";

import { updateRoom } from "@/app/actions/chat";
import { updateProduct } from "@/app/actions/products";
import bus from "@/assets/busIcon.png";
import likes from "@/assets/likes.svg";
import loc from "@/assets/location-red.svg";
import AuthenticationUserModal from "@/components/modals/AuthenticationUser/AuthenticationUserModal";
import PopupNotificationModal from "@/components/modals/PopupNotificationModal";
import TopTips from "@/components/topTips/TopTips";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { InitialProductStateType } from "@/types/product.types";
import { StarIcon } from "@/utils/icons";
import Image from "next/image";
import { useRouter } from "next/navigation";

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
export function OneProduct({
  chat,
  product,
  buttonValue,
  navigateHandler,
  size,
  requesterId,
  roomId,
}: OneProductType) {
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
        setUpdateError(
          error instanceof Error
            ? error.message
            : "Could not update this listing. Please try again."
        );
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
      <div
        className="glass rounded-xl p-5 transition-all duration-300 ease-in-out"
        style={{ width: size }}
      >
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
          <Image src={loc} alt="location" width={20} height={20} />
          <p className="text-base">{product.post_stripped_address}</p>
        </div>

        <hr className="my-4 border-border" />

        {/* Stats Row */}
        <div className="flex justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Image src={likes} alt="likes" width={20} height={20} />
            <p className="text-sm">{product.post_like_counter || 0} likes</p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-sm font-medium">👁</span>
            <p className="text-sm">&quot;{product.post_views} views&quot;</p>
          </div>
        </div>

        {/* Rating */}
        <div className="flex justify-center gap-1 mb-4">
          {[0, 1, 2, 3, 4].map((star) => (
            <StarIcon
              key={star}
              onClick={() => onStarClick(star)}
              color={star < rating ? "teal.500" : "gray.300"}
              cursor="pointer"
            />
          ))}
        </div>

        <hr className="my-4 border-border" />

        {/* Details */}
        <div className="flex flex-col gap-3 mb-4">
          {/* Available Hours */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-foreground/80">
              <span className="text-lg">🕐</span>
              <p className="font-medium">&quot;Available&quot;</p>
            </div>
            <p className="text-muted-foreground">{product.available_hours}</p>
          </div>

          {/* Description/Quantity */}
          {product.post_description && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-foreground/80">
                <span className="text-lg">📦</span>
                <p className="font-medium">&quot;Details&quot;</p>
              </div>
              <p className="text-muted-foreground text-right max-w-[60%]">
                {product.post_description}
              </p>
            </div>
          )}

          {/* Transportation */}
          {product.transportation && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-foreground/80">
                <Image src={bus} alt="transport" width={16} height={16} />
                <p className="font-medium">&quot;Transport&quot;</p>
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
            <AuthenticationUserModal oneProductComponent buttonValue="Login" />
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
