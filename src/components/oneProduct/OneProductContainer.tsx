"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createFoodChatRoom } from "@/app/actions/chat";
import { PATH } from "@/utils";
import { OneProduct } from "@/components/oneProduct/OneProduct";
import type { InitialProductStateType } from "@/types/product.types";

type OneProductContainerType = {
  product: InitialProductStateType;
  /** Room availability data passed from server */
  roomData?: {
    exists: boolean;
    room?: { id: string } | null;
  } | null;
};

/**
 * OneProductContainer Component
 * Handles chat room creation and navigation logic for product detail page
 * Receives room availability as props from Server Component
 */
export const OneProductContainer: React.FC<OneProductContainerType> = ({ product, roomData }) => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  // Auth state
  const { user } = useAuth();
  const userID = user?.id;

  // Room availability from props
  const isRoomExist = roomData?.exists ?? false;
  const existingRoom = roomData?.room;

  // Local state for loading
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const navigateHandler = async () => {
    if (product.profile_id === userID) {
      router.push(PATH.myListingsPage);
      return;
    }
    if (!isRoomExist) {
      setIsCreatingRoom(true);
      try {
        const result = await createFoodChatRoom(product.id, product.profile_id);
        if (!result.success) {
          console.error("Failed to create room:", result.error);
          return;
        }

        const room = result.data;
        router.push(`/messages?roomId=${room.roomId}`);
        router.refresh();
      } catch (error) {
        console.error("Failed to create room:", error);
      } finally {
        setIsCreatingRoom(false);
      }
      return;
    }
    // Navigate to existing chat room
    router.push(`/chat?food=${product.id}&room=${existingRoom?.id}`);
  };

  return (
    <OneProduct
      navigateHandler={navigateHandler}
      product={product}
      buttonValue={
        isCreatingRoom
          ? "creating..."
          : product.profile_id === userID
            ? "go to my listings"
            : isRoomExist
              ? "go to chat"
              : "request"
      }
      key={Array.isArray(id) ? id[0] : id}
    />
  );
};
