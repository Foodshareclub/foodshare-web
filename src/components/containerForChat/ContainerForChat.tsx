'use client';

import React, { useEffect } from "react";
import { chatAPI } from "@/api/chatAPI";
import { useChatStore } from "@/store/zustand/useChatStore";

/**
 * ContainerForChat - Initializes chat channel listening
 * Sets up global real-time subscription for chat messages
 * Uses Zustand store instead of Redux
 */
const ContainerForChat: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { setChannel, addMessage, channel } = useChatStore();

  useEffect(() => {
    // Set up global real-time subscription for chat messages
    const newChannel = chatAPI.listenChannel((message) => {
      addMessage(message);
    });

    setChannel(newChannel);

    // Cleanup on unmount
    return () => {
      if (newChannel) {
        chatAPI.removeChannel(newChannel);
        setChannel(null);
      }
    };
  }, [setChannel, addMessage]);

  return <>{children}</>;
};

export default ContainerForChat;
