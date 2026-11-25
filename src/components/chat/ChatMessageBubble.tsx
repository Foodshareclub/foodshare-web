"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { BadgeCheck, Check } from "lucide-react";
import Image from "next/image";

export interface ChatMessageItem {
  id: string;
  text: string;
  senderId: string;
  timestamp: string;
  image?: string;
  isOwn: boolean;
  senderName?: string;
  senderAvatar?: string;
  readBy?: string[];
}

interface ChatMessageBubbleProps {
  message: ChatMessageItem;
  otherParticipant: { id: string; firstName: string; secondName: string; avatarUrl: string | null } | undefined;
}

export function ChatMessageBubble({ message, otherParticipant }: ChatMessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      className={cn("flex gap-2 group py-1", message.isOwn ? "justify-end" : "justify-start")}
    >
      {!message.isOwn && (
        <Avatar className="h-8 w-8 flex-shrink-0 mt-1 ring-2 ring-background shadow-sm">
          <AvatarImage src={message.senderAvatar || otherParticipant?.avatarUrl || ""} />
          <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {message.senderName?.[0] || otherParticipant?.firstName?.[0] || "?"}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="relative max-w-[75%] sm:max-w-[65%]">
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 relative transition-all duration-200",
            message.isOwn
              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md shadow-md shadow-primary/20"
              : "bg-card text-card-foreground rounded-bl-md shadow-sm border border-border",
          )}
        >
          {message.image && (
            <div className="relative w-52 h-52 mb-2 rounded-xl overflow-hidden shadow-inner">
              <Image src={message.image} alt="" fill className="object-cover" />
            </div>
          )}
          <p className="break-words text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
          <div className={cn("flex items-center gap-1.5 mt-1.5", message.isOwn ? "justify-end" : "justify-start")}>
            <span
              className={cn(
                "text-[10px] font-medium",
                message.isOwn ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {message.isOwn && (
              <span className="ms-0.5 flex items-center">
                {message.readBy && message.readBy.length > 0 ? (
                  <BadgeCheck className="h-3.5 w-3.5 text-blue-300" />
                ) : (
                  <Check className="h-3 w-3 text-primary-foreground/60" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
