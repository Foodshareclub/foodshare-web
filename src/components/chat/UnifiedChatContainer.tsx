"use client";

/**
 * UnifiedChatContainer Component
 * Chat interface for food sharing conversations
 * Features: typing indicators, image upload, real-time messages
 */

import React, { useState, useEffect, useRef, useTransition, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  ImageIcon,
  MoreVertical,
  ArrowLeft,
  Check,
  Smile,
  BadgeCheck,
  RotateCcw,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Sparkles,
  PartyPopper,
  Mail,
} from "lucide-react";
import { useUnifiedChat } from "@/hooks/useUnifiedChat";
import { useActionToast } from "@/hooks/useActionToast";
import {
  sendFoodChatMessage,
  markFoodChatAsRead,
  acceptRequestAndShareAddress,
  completeExchange,
} from "@/app/actions/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Icon aliases for consistency
const FiSend = Send;
const FiImage = ImageIcon;
const FiMoreVertical = MoreVertical;
const FiArrowLeft = ArrowLeft;
const FiCheck = Check;
const FiSmile = Smile;
const HiCheckBadge = BadgeCheck;
import type { UnifiedChatRoom } from "@/lib/data/chat";

const FALLBACK = {
  typeMessage: "Type a message...",
  typing: "typing...",
  online: "Online",
  offline: "Offline",
  today: "Today",
  yesterday: "Yesterday",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  foodSharing: "Food Sharing",
};

type Message = {
  id: string;
  text: string;
  senderId: string;
  timestamp: string;
  image?: string;
  isOwn: boolean;
  senderName?: string;
  senderAvatar?: string;
  readBy?: string[];
};

type UnifiedChatContainerProps = {
  userId: string;
  userName?: string;
  userAvatar?: string;
  chatRoom: UnifiedChatRoom;
  initialMessages?: Message[];
  onBack?: () => void;
  isLoadingMessages?: boolean;
};

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function UnifiedChatContainer({
  userId,
  userName = "",
  userAvatar = "",
  chatRoom,
  initialMessages = [],
  onBack,
  isLoadingMessages = false,
}: UnifiedChatContainerProps) {
  const t = useTranslations("Chat");

  const getText = (key: keyof typeof FALLBACK) => {
    try {
      return t(key);
    } catch {
      return FALLBACK[key];
    }
  };

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [failedMessages, setFailedMessages] = useState<
    Map<string, { text: string; retries: number }>
  >(new Map());
  const [isAccepting, setIsAccepting] = useState(false);
  const [localIsAccepted, setLocalIsAccepted] = useState(chatRoom.isAccepted ?? false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useActionToast();

  const { typingUsers, onlineUsers, sendTypingIndicator, sendReadReceipt } = useUnifiedChat({
    userId,
    userName,
    userAvatar,
    roomId: chatRoom.id,
    onNewFoodMessage: (msg) => {
      const newMessage: Message = {
        id: msg.id || crypto.randomUUID(),
        text: msg.text,
        senderId: msg.profile_id,
        timestamp: msg.timestamp || new Date().toISOString(),
        image: msg.image,
        isOwn: msg.profile_id === userId,
      };
      setMessages((prev) => [...prev, newMessage]);
      if (!newMessage.isOwn) sendReadReceipt(newMessage.id);
    },
    onMessageRead: (messageId, readBy) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, readBy: [...(m.readBy || []), readBy] } : m))
      );
    },
  });

  // Sync messages when initialMessages changes
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (chatRoom.hasUnread) {
      markFoodChatAsRead(chatRoom.id);
    }
  }, [chatRoom.id, chatRoom.hasUnread]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    sendTypingIndicator(e.target.value.length > 0);
  };

  const handleSendMessage = async (retryText?: string) => {
    const messageText = retryText || inputValue.trim();
    if (!messageText || isPending) return;

    if (!retryText) {
      setInputValue("");
      sendTypingIndicator(false);
    }

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      text: messageText,
      senderId: userId,
      timestamp: new Date().toISOString(),
      isOwn: true,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("roomId", chatRoom.id);
      formData.set("text", messageText);
      const result = await sendFoodChatMessage(formData);
      if (!result.success) {
        // Remove optimistic message
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));

        // Track failed message for retry
        const existingRetry = failedMessages.get(optimisticMessage.id);
        const retries = existingRetry?.retries || 0;

        if (retries < 3) {
          setFailedMessages((prev) =>
            new Map(prev).set(optimisticMessage.id, {
              text: messageText,
              retries: retries + 1,
            })
          );
          toast.error("Failed to send message", "Tap retry to try again");
        } else {
          // Max retries reached
          setFailedMessages((prev) => {
            const next = new Map(prev);
            next.delete(optimisticMessage.id);
            return next;
          });
          toast.error("Message failed", "Please try again later");
        }
      } else {
        // Success - remove from failed messages if it was a retry
        if (retryText) {
          setFailedMessages((prev) => {
            const next = new Map(prev);
            // Remove all entries with this text
            for (const [key, val] of next) {
              if (val.text === retryText) next.delete(key);
            }
            return next;
          });
        }
      }
    });
    inputRef.current?.focus();
  };

  // Retry a failed message
  const handleRetryMessage = useCallback(
    (failedId: string) => {
      const failed = failedMessages.get(failedId);
      if (failed) {
        handleSendMessage(failed.text);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [failedMessages]
  );

  // Accept request and share address
  const handleAcceptAndShareAddress = async () => {
    if (isAccepting || localIsAccepted) return;

    setIsAccepting(true);
    try {
      const result = await acceptRequestAndShareAddress(chatRoom.id);
      if (result.success) {
        setLocalIsAccepted(true);
        toast.success(
          "Request accepted!",
          "Your pickup address has been shared with the requester."
        );
      } else {
        toast.error("Failed to accept request", result.error?.message || "Please try again.");
      }
    } catch {
      toast.error("Failed to accept request", "Please try again.");
    } finally {
      setIsAccepting(false);
    }
  };

  // Mark exchange as complete and send emails to both parties
  const handleCompleteExchange = async () => {
    if (isCompleting || isCompleted) return;

    setIsCompleting(true);
    try {
      const result = await completeExchange(chatRoom.id);
      if (result.success) {
        setIsCompleted(true);
        toast.success("Exchange complete!", "Completion emails have been sent to both parties.");
      } else {
        toast.error("Failed to complete exchange", result.error?.message || "Please try again.");
      }
    } catch {
      toast.error("Failed to complete exchange", "Please try again.");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Memoize grouped messages for performance
  const groupedMessages = useMemo(
    () =>
      messages.reduce(
        (groups, message) => {
          const date = new Date(message.timestamp).toDateString();
          if (!groups[date]) groups[date] = [];
          groups[date].push(message);
          return groups;
        },
        {} as Record<string, Message[]>
      ),
    [messages]
  );

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return getText("today");
    if (date.toDateString() === yesterday.toDateString()) return getText("yesterday");
    return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  };

  const otherParticipant = chatRoom.participants[0];
  const isOtherOnline = onlineUsers.some((u) => u.id === otherParticipant?.id);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/95 backdrop-blur-xl flex-shrink-0 shadow-sm">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden -ml-2 hover:bg-muted transition-colors"
            onClick={onBack}
          >
            <FiArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Button>
        )}

        {/* Food sharing chat avatar */}
        {chatRoom.postImage && (
          <div className="relative h-11 w-11 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-green-500/30 shadow-md">
            <Image
              src={chatRoom.postImage}
              alt={chatRoom.postName || ""}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Chat info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="font-semibold truncate text-foreground">{chatRoom.title}</h2>
            {/* Role badge - shows if user is the sharer or requester */}
            <span
              className={cn(
                "px-1.5 py-0.5 text-[10px] font-medium rounded-md flex-shrink-0",
                chatRoom.isSharer
                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400"
                  : "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400"
              )}
            >
              {chatRoom.isSharer ? "Your listing" : "Requested"}
            </span>
          </div>
          {/* Other participant name - prominently displayed */}
          {otherParticipant && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {chatRoom.isSharer ? "Requester:" : "Owner:"}
              </span>
              <span className="text-xs font-medium text-foreground truncate">
                {otherParticipant.firstName} {otherParticipant.secondName}
              </span>
              {isOtherOnline && (
                <span className="flex items-center gap-1 text-[10px] text-green-500 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  {getText("online")}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Header actions */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <FiMoreVertical className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>More options</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </header>

      {/* Share Address Action Bar - Only for sharer when not yet accepted */}
      <AnimatePresence>
        {chatRoom.isSharer && !localIsAccepted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-border overflow-hidden"
          >
            <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Ready to share your food?</p>
                  <p className="text-xs text-muted-foreground">
                    Accept this request to share your pickup address
                  </p>
                </div>
                <Button
                  onClick={handleAcceptAndShareAddress}
                  disabled={isAccepting}
                  className="flex-shrink-0 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 border-0 gap-2"
                >
                  {isAccepting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="h-4 w-4" />
                      </motion.div>
                      Accepting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Accept & Share Address
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mark as Complete Action Bar - Shows after request accepted, before completion */}
      <AnimatePresence>
        {localIsAccepted && !isCompleted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-border overflow-hidden"
          >
            <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <PartyPopper className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Did the pickup happen?</p>
                  <p className="text-xs text-muted-foreground">
                    Mark complete to notify both parties via email
                  </p>
                </div>
                <Button
                  onClick={handleCompleteExchange}
                  disabled={isCompleting}
                  className="flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25 border-0 gap-2"
                >
                  {isCompleting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="h-4 w-4" />
                      </motion.div>
                      Completing...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Mark Complete
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exchange Completed Banner */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-border overflow-hidden"
          >
            <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 flex items-center gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Exchange complete!
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Completion emails sent to both you and{" "}
                  {otherParticipant?.firstName || "the other party"}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth relative bg-muted/30">
        {isLoadingMessages ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                <Skeleton className={cn("h-14 rounded-2xl", i % 2 === 0 ? "w-48" : "w-56")} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FiSend className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">Start the conversation</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Send a message to begin chatting about this food item
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                <div className="flex items-center justify-center my-4 sticky top-0 z-10">
                  <span className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-background/90 backdrop-blur-sm rounded-full shadow-sm border border-border">
                    {formatDateHeader(date)}
                  </span>
                </div>
                <AnimatePresence>
                  {dateMessages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      otherParticipant={otherParticipant}
                      getText={getText}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ))}

            {/* Failed messages with retry */}
            <AnimatePresence>
              {failedMessages.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2 py-2"
                >
                  {Array.from(failedMessages.entries()).map(([id, { text, retries }]) => (
                    <div key={id} className="flex items-center justify-end gap-2">
                      <div className="flex items-center gap-2 max-w-[75%] sm:max-w-[65%]">
                        <div className="rounded-2xl px-4 py-2.5 bg-destructive/10 border border-destructive/30 rounded-br-md">
                          <p className="text-sm text-destructive break-words">{text}</p>
                          <div className="flex items-center gap-1.5 mt-1.5 justify-end">
                            <AlertCircle className="h-3 w-3 text-destructive" />
                            <span className="text-[10px] text-destructive font-medium">
                              Failed to send {retries > 1 ? `(${retries}/3)` : ""}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRetryMessage(id)}
                          disabled={isPending}
                        >
                          <RotateCcw className={cn("h-4 w-4", isPending && "animate-spin")} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
              {typingUsers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="flex items-center gap-2 py-2"
                >
                  <Avatar className="h-7 w-7 ring-2 ring-border">
                    <AvatarImage
                      src={typingUsers[0]?.avatarUrl || otherParticipant?.avatarUrl || ""}
                    />
                    <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                      {typingUsers[0]?.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-card rounded-2xl px-4 py-2.5 shadow-sm border border-border">
                    <div className="flex gap-1.5 items-center">
                      <span
                        className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground italic">
                    {typingUsers[0]?.name || "Someone"} is typing...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-border bg-card/95 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={() => {}}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FiImage className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach image</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <FiSmile className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add emoji</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={getText("typeMessage")}
              className="w-full bg-muted border-0 rounded-xl py-2.5 px-4 focus-visible:ring-2 focus-visible:ring-primary/30 placeholder:text-muted-foreground transition-all"
              disabled={isPending}
            />
            {/* Quick emoji picker */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full mb-2 left-0 bg-card rounded-xl shadow-xl border border-border p-2 flex gap-1 z-20"
                >
                  {EMOJI_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setInputValue((prev) => prev + emoji);
                        setShowEmojiPicker(false);
                        inputRef.current?.focus();
                      }}
                      className="hover:scale-125 transition-transform text-xl p-1.5 rounded-lg hover:bg-muted"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.div
            animate={{ scale: inputValue.trim() ? 1 : 0.9, opacity: inputValue.trim() ? 1 : 0.5 }}
          >
            <Button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isPending}
              size="icon"
              className={cn(
                "flex-shrink-0 rounded-xl transition-all duration-200",
                inputValue.trim()
                  ? "bg-primary hover:bg-primary/90 shadow-md shadow-primary/25"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <FiSend
                className={cn(
                  "h-4 w-4 transition-transform",
                  inputValue.trim() && "translate-x-0.5"
                )}
              />
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// MessageBubble Component
type MessageBubbleProps = {
  message: Message;
  otherParticipant:
    | { id: string; firstName: string; secondName: string; avatarUrl: string | null }
    | undefined;
  getText: (key: keyof typeof FALLBACK) => string;
};

function MessageBubble({ message, otherParticipant, getText: _getText }: MessageBubbleProps) {
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
              : "bg-card text-card-foreground rounded-bl-md shadow-sm border border-border"
          )}
        >
          {message.image && (
            <div className="relative w-52 h-52 mb-2 rounded-xl overflow-hidden shadow-inner">
              <Image src={message.image} alt="Message image" fill className="object-cover" />
            </div>
          )}
          <p className="break-words text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
          <div
            className={cn(
              "flex items-center gap-1.5 mt-1.5",
              message.isOwn ? "justify-end" : "justify-start"
            )}
          >
            <span
              className={cn(
                "text-[10px] font-medium",
                message.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {message.isOwn && (
              <span className="ml-0.5 flex items-center">
                {message.readBy && message.readBy.length > 0 ? (
                  <HiCheckBadge className="h-3.5 w-3.5 text-blue-300" />
                ) : (
                  <FiCheck className="h-3 w-3 text-primary-foreground/60" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
