'use client';

import { useState, useMemo } from "react";

import loc from "@/assets/location-red.svg";
import likes from "@/assets/likes.svg";
import bus from "@/assets/busIcon.png";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateProduct, useUpdateRoom } from "@/hooks";
import { AuthenticationUserModal, PopupNotificationModal } from "@/components";
import TopTips from "@/components/topTips/TopTips";
import type { InitialProductStateType } from "@/types/product.types";
import { GlassCard, GlassButton } from "@/components/Glass";
import { StarIcon } from "@/utils/icons";

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
  const [rating, setRating] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Auth state from React Query + Zustand (replaces Redux)
  const { isAuthenticated } = useAuth();

  // React Query mutations (replaces Redux thunks)
  const updateProduct = useUpdateProduct();
  const updateRoom = useUpdateRoom();

  // React Compiler optimizes these handlers automatically
  const onClick = async () => {
    if (buttonValue === "completed") return;

    if (navigateHandler) {
      navigateHandler();
    }

    if (buttonValue === "approval pending") {
      await updateProduct.mutateAsync({
        images: product.images,
        id: product.id,
        is_active: false,
      });
      await updateRoom.mutateAsync({
        post_arranged_to: requesterId,
        id: roomId as string,
      });
    }

    if (buttonValue === "leave a feedBack") {
      setIsOpen(true);
    }
  };

  const onStarClick = (index: number) => setRating(index + 1);
  const onClose = () => setIsOpen(false);

  const buttonProps = useMemo(
    () => ({
      isDisabled: buttonValue === "leave a feedBack" ? product.is_active : false,
      variant: (buttonValue === "completed" ? "accentGreen" : "accentOrange") as
        | "accentGreen"
        | "accentOrange",
      cursor: buttonValue === "completed" ? "default" : "pointer",
    }),
    [buttonValue, product.is_active]
  );

    // Chat mode - compact view
    if (chat) {
      return (
        <GlassCard
          variant="standard"
          padding="md"
          w={size}
          className="transition-all duration-300 ease-in-out"
        >
          <div className="flex flex-col gap-3">
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
        </GlassCard>
      );
    }

    // Full product detail view
    return (
      <GlassCard
        variant="standard"
        padding="0"
        className="w-full max-w-[600px] overflow-hidden transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(0,0,0,0.1)]"
      >
        {/* Hero Image */}
        <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
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
            <img src={loc} alt="location" className="w-5 h-5" />
            <p className="text-base">{product.post_stripped_address}</p>
          </div>

          <hr className="my-4 border-border" />

          {/* Stats Row */}
          <div className="flex justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <img src={likes} alt="likes" className="w-5 h-5" />
              <p className="text-sm">{product.post_like_counter || 0} likes</p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm font-medium">👁</span>
              <p className="text-sm">
                "{product.post_views} views"
              </p>
            </div>
          </div>

          {/* Rating */}
          <div className="flex justify-center gap-1 mb-4">
            {Array(5)
              .fill("")
              .map((_, i) => (
                <StarIcon
                  key={i}
                  onClick={() => onStarClick(i)}
                  color={i < rating ? "teal.500" : "gray.300"}
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
                <p className="font-medium">
                  "Available"
                </p>
              </div>
              <p className="text-muted-foreground">{product.available_hours}</p>
            </div>

            {/* Description/Quantity */}
            {product.post_description && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-foreground/80">
                  <span className="text-lg">📦</span>
                  <p className="font-medium">
                    "Details"
                  </p>
                </div>
                <p className="text-muted-foreground text-right max-w-[60%]">{product.post_description}</p>
              </div>
            )}

            {/* Transportation */}
            {product.transportation && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-foreground/80">
                  <img src={bus.src} alt="transport" className="w-4 h-4" />
                  <p className="font-medium">
                    "Transport"
                  </p>
                </div>
                <p className="text-muted-foreground uppercase text-sm">{product.transportation}</p>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="mt-6">
            {!isAuthenticated ? (
              <AuthenticationUserModal oneProductComponent buttonValue="Login" />
            ) : (
              <GlassButton
                variant={buttonProps.variant}
                onClick={onClick}
                className={`w-full uppercase font-semibold py-3 ${
                  buttonProps.isDisabled ? "opacity-50 pointer-events-none" : ""
                }`}
                style={{ cursor: buttonProps.cursor }}
              >
                {buttonValue}
              </GlassButton>
            )}
          </div>
        </div>

      {/* Modals */}
      <PopupNotificationModal isOpen={isOpen} onClose={onClose} />
    </GlassCard>
  );
}
