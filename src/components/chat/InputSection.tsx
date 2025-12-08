'use client';

import type { KeyboardEvent } from "react";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { sendFoodChatMessage } from "@/app/actions/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InputSectionType = {
  roomId: string;
  userID: string;
};

/**
 * InputSection Component
 * Chat message input with send functionality
 * Uses Server Actions for message operations
 */
export function InputSection({ roomId, userID }: InputSectionType) {
  const router = useRouter();
  const [val, setVal] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async () => {
    if (!val.trim()) return;
    
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.set('roomId', roomId);
      formData.set('text', val);

      const result = await sendFoodChatMessage(formData);
      if (result.error) {
        console.error('Failed to send message:', result.error);
        return;
      }
      
      setVal("");
      router.refresh();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const keyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <>
      <Input
        onKeyDown={(e) => keyDown(e)}
        type="text"
        placeholder="Enter..."
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="mr-2 bg-white/20 backdrop-blur-[12px] backdrop-saturate-[180%] border border-white/25 shadow-[inset_0_2px_4px_0_rgba(31,38,135,0.1)] transition-all duration-300 hover:bg-white/30 hover:border-white/35 hover:shadow-[inset_0_2px_4px_0_rgba(31,38,135,0.15)] focus-visible:bg-white/35 focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-green-500/40 focus-visible:ring-offset-2"
        style={{
          WebkitBackdropFilter: "blur(12px) saturate(180%)",
        }}
      />
      <Button
        onClick={sendMessage}
        aria-label="Send message"
        className="uppercase font-bold text-lg min-w-[50px] h-10 bg-green-500/15 backdrop-blur-[15px] backdrop-saturate-[180%] border border-green-500/30 shadow-[0_8px_32px_0_rgba(45,157,45,0.2)] transition-all duration-300 hover:bg-green-500/25 hover:border-green-500/40 hover:shadow-[0_12px_48px_0_rgba(45,157,45,0.3)] hover:-translate-y-0.5"
        style={{
          WebkitBackdropFilter: "blur(15px) saturate(180%)",
        }}
      >
        +
      </Button>
    </>
  );
}
