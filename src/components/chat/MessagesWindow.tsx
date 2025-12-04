'use client';

import React, { memo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { RoomParticipantsType } from "@/api/chatAPI";
import { useMediaQuery } from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentProfile } from "@/hooks/queries/useProfileQueries";
import { useChatStore } from "@/store/zustand/useChatStore";
import { InputSection } from "@/components";
import MessageItem from "./MessageItem";

type MessagesWindowType = {
  messages: Array<RoomParticipantsType>;
  userID: string;
  roomId: string;
};

/**
 * MessagesWindow Component
 * Displays the chat messages and input section
 * Uses React Query + Zustand instead of Redux
 */
export const MessagesWindow: React.FC<MessagesWindowType> = memo(
  ({ messages, userID, roomId }) => {
    const messagesAnchorRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const isSmaller = useMediaQuery("(min-width:1200px)");

    // Get current user's profile from React Query
    const { user } = useAuth();
    const { avatarUrl } = useCurrentProfile(user?.id);

    // Get chat data from Zustand store (synced from React Query)
    const rooms = useChatStore((state) => state.rooms);
    const currentRoom = rooms.find((room) => room.id === roomId);

    // Get requester info from current room (the other person in the chat)
    const requesterImg = currentRoom?.profiles?.avatar_url;
    const requesterId = currentRoom?.profiles?.id;
    const requesterName = currentRoom?.profiles?.first_name;
    const userImg = avatarUrl;

    // Auto-scroll to latest message when messages change
    useEffect(() => {
      messagesAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Memoized callback to prevent re-creating function on every render
    const handleAvatarClick = useCallback(
      (isUserRequester: boolean) => {
        const targetId = isUserRequester ? currentRoom?.profiles.id : requesterId;
        router.push(`/volunteers/${targetId}`);
      },
      [currentRoom?.profiles.id, requesterId, router]
    );

    return (
      <div
        className={`${isSmaller ? "w-[52vw]" : "w-screen"} mx-3 rounded-2xl flex justify-between flex-col p-3 bg-white/25 backdrop-blur-[15px] backdrop-saturate-[180%] border border-white/30 shadow-[0_8px_32px_0_rgba(31,38,135,0.2)]`}
        style={{
          WebkitBackdropFilter: "blur(15px) saturate(180%)",
          animation: "glass-fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        }}
      >
        <div
          className="h-[60vh] overflow-y-scroll scrollbar-thin scrollbar-thumb-gray-400/60 scrollbar-track-gray-100/20 scrollbar-thumb-rounded-lg scrollbar-track-rounded-lg"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(211, 211, 211, 0.6) rgba(249, 249, 253, 0.2)",
          }}
        >
          <style>{`
            .scrollbar-thin::-webkit-scrollbar {
              width: 4px;
              border-radius: 10px;
              background-color: rgba(249, 249, 253, 0.3);
            }
            .scrollbar-thin::-webkit-scrollbar-thumb {
              border-radius: 10px;
              background-color: rgba(211, 211, 211, 0.6);
            }
            .scrollbar-thin::-webkit-scrollbar-track {
              box-shadow: inset 0 0 6px rgba(0,0,0,0.1);
              border-radius: 10px;
              background-color: rgba(249, 249, 253, 0.2);
            }
          `}</style>
          {messages
            ?.filter((m) => m.text !== "") // Remove initial empty message
            .map((m) => {
              const isOwnMessage = userID === m.profile_id;
              const isUserRequester = userImg === requesterImg;
              const avatarUrl = isUserRequester ? currentRoom?.profiles.avatar_url : requesterImg;
              const userName = isUserRequester ? currentRoom?.profiles.first_name : requesterName;

              return (
                <MessageItem
                  key={m.id}
                  message={m}
                  isOwnMessage={isOwnMessage}
                  onAvatarClick={() => handleAvatarClick(isUserRequester)}
                  avatarUrl={avatarUrl}
                  userName={userName}
                />
              );
            })}
          <div ref={messagesAnchorRef} />
        </div>
        <div className="flex pt-3">
          <InputSection roomId={roomId} userID={userID} />
        </div>
      </div>
    );
  },
  // Custom comparison to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    return (
      prevProps.userID === nextProps.userID &&
      prevProps.roomId === nextProps.roomId &&
      prevProps.messages.length === nextProps.messages.length &&
      prevProps.messages[prevProps.messages.length - 1]?.id ===
        nextProps.messages[nextProps.messages.length - 1]?.id
    );
  }
);

MessagesWindow.displayName = "MessagesWindow";
