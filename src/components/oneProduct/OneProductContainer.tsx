import React from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useRoomAvailability, useCreateRoom } from "@/hooks";
import { PATH } from "@/utils";
import type { RoomType } from "@/api/chatAPI";
import { OneProduct } from "@/components/oneProduct/OneProduct";
import type { InitialProductStateType } from "@/types/product.types";

type OneProductContainerType = {
  product: InitialProductStateType;
};

/**
 * OneProductContainer Component
 * Handles chat room creation and navigation logic for product detail page
 * Uses React Query instead of Redux for room availability and creation
 */
export const OneProductContainer: React.FC<OneProductContainerType> = ({ product }) => {
  const params = useParams();
  const id = params?.id as string;
  const postId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();

  // Auth state from React Query + Zustand (replaces Redux)
  const { user } = useAuth();
  const userID = user?.id;

  // React Query for room availability (replaces Redux selector + thunk)
  const { data: roomData } = useRoomAvailability(userID, postId);
  const isRoomExist = roomData?.exists ?? false;
  const existingRoom = roomData?.room;

  // React Query mutation for room creation (replaces Redux thunk)
  const createRoomMutation = useCreateRoom();

  const createRoom = async () => {
    const room = {
      requester: userID,
      sharer: product.profile_id,
      post_id: product.id,
      last_message_sent_by: userID,
      last_message_seen_by: userID,
      last_message: "Initial message",
    } as RoomType;
    return await createRoomMutation.mutateAsync(room);
  };

  const navigateHandler = async () => {
    if (product.profile_id === userID) {
      router.push(PATH.myListingsPage);
      return;
    }
    if (!isRoomExist) {
      const newRoom = await createRoom();
      // Navigate to chat with newly created room
      router.push(
        `/chat-main/?p=${product.id}&s=${product.profile_id}&r=${userID}&room=${newRoom.id}`
      );
      return;
    }
    // Navigate to existing chat room
    router.push(
      `/chat-main/?p=${product.id}&s=${product.profile_id}&r=${userID}&room=${existingRoom?.id}`
    );
  };

  return (
    <OneProduct
      navigateHandler={navigateHandler}
      product={product}
      buttonValue={
        product.profile_id === userID ? "go to my listings" : isRoomExist ? "go to chat" : "request"
      }
      key={Array.isArray(id) ? id[0] : id}
    />
  );
};
