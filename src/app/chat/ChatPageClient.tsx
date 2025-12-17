"use client";

/**
 * ChatPageClient - Unified Chat Interface
 * Full-height layout with independently scrolling sidebar and message area
 * Features: glassmorphism, smooth animations, responsive design, dark/light themes
 * The page itself doesn't scroll - only the left (chat list) and right (messages) segments scroll independently
 */

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Users } from "lucide-react";
import { UnifiedChatList } from "@/components/chat/UnifiedChatList";
import { UnifiedChatContainer } from "@/components/chat/UnifiedChatContainer";
import { useMediaQuery } from "@/hooks";
import { useOnlineStatus } from "@/hooks/useUnifiedChat";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { UnifiedChatRoom } from "@/lib/data/chat";

const FALLBACK = {
  selectConversation: "Select a conversation",
  selectConversationDesc: "Choose a chat from the sidebar to start messaging",
  noConversationsYet: "No conversations yet",
  startNewChat: "Start sharing food to begin chatting with others",
  welcomeToChat: "Welcome to Chat",
  foodChats: "Food Sharing Chats",
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
};

type ChatPageClientProps = {
  userId: string;
  userName?: string;
  userAvatar?: string;
  chatRooms: UnifiedChatRoom[];
  activeChatRoom: UnifiedChatRoom | null;
  initialMessages: Message[];
};

export function ChatPageClient({
  userId,
  userName = "",
  userAvatar = "",
  chatRooms,
  activeChatRoom,
  initialMessages,
}: ChatPageClientProps) {
  const t = useTranslations("Chat");
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [selectedChat, setSelectedChat] = useState<UnifiedChatRoom | null>(activeChatRoom);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [showList, setShowList] = useState(!activeChatRoom);
  const [isLoadingMessages, startMessageTransition] = useTransition();

  // Track previous values to avoid cascading renders
  const prevActiveChatRoomId = useRef(activeChatRoom?.id);

  useOnlineStatus(userId);

  const getText = (key: keyof typeof FALLBACK) => {
    try {
      return t(key);
    } catch {
      return FALLBACK[key];
    }
  };

  // Sync with URL params - only when activeChatRoom actually changes
  useEffect(() => {
    if (activeChatRoom && activeChatRoom.id !== prevActiveChatRoomId.current) {
      prevActiveChatRoomId.current = activeChatRoom.id;
      // Use queueMicrotask to avoid synchronous setState in effect
      queueMicrotask(() => {
        setSelectedChat(activeChatRoom);
        setMessages(initialMessages);
        if (!isDesktop) setShowList(false);
      });
    }
  }, [activeChatRoom, initialMessages, isDesktop]);

  // Load messages when chat is selected (using useTransition for non-blocking UI)
  const loadMessages = async (chat: UnifiedChatRoom) => {
    startMessageTransition(async () => {
      try {
        const response = await fetch(`/api/chat/messages?roomId=${chat.id}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    });
  };

  const handleSelectChat = async (chat: UnifiedChatRoom) => {
    setSelectedChat(chat);
    if (!isDesktop) setShowList(false);

    // Update URL
    const params = new URLSearchParams();
    if (chat.postId) {
      params.set("food", chat.postId.toString());
    }
    params.set("room", chat.id);
    router.push(`/chat?${params.toString()}`, { scroll: false });

    // Load messages if not already loaded
    if (chat.id !== activeChatRoom?.id) {
      await loadMessages(chat);
    }
  };

  const handleBackToList = () => {
    setShowList(true);
    setSelectedChat(null);
    router.push("/chat", { scroll: false });
  };

  // Collect online user IDs
  const onlineUserIds: string[] = [];

  // Stats for empty state
  const foodChatsCount = chatRooms.length;

  return (
    <div className="h-full min-h-0 flex flex-col bg-background overflow-hidden relative">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-20">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main content - fills available space, no page scroll */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative z-10">
        <div className={cn("flex w-full h-full", isDesktop ? "p-4 gap-4" : "p-0")}>
          {/* Left Sidebar - Chat List (independently scrollable) */}
          <AnimatePresence mode="wait" initial={false}>
            {(isDesktop || showList) && (
              <motion.aside
                key="sidebar"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn(
                  "flex flex-col min-h-0",
                  isDesktop
                    ? "w-[340px] lg:w-[380px] flex-shrink-0"
                    : "w-full absolute inset-0 z-20 bg-background"
                )}
              >
                <div
                  className={cn(
                    "flex-1 min-h-0 flex flex-col overflow-hidden",
                    isDesktop && "rounded-2xl border border-border bg-card shadow-sm"
                  )}
                >
                  <UnifiedChatList
                    chatRooms={chatRooms}
                    activeChatId={selectedChat?.id}
                    onSelectChat={handleSelectChat}
                    onlineUserIds={onlineUserIds}
                    currentUserId={userId}
                  />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Right Main Chat Area (independently scrollable) */}
          <AnimatePresence mode="wait" initial={false}>
            {(isDesktop || !showList) && (
              <motion.main
                key="main"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn(
                  "flex-1 min-h-0 flex flex-col overflow-hidden min-w-0",
                  isDesktop && "rounded-2xl border border-border bg-card shadow-sm"
                )}
              >
                {selectedChat ? (
                  <UnifiedChatContainer
                    userId={userId}
                    userName={userName}
                    userAvatar={userAvatar}
                    chatRoom={selectedChat}
                    initialMessages={messages}
                    onBack={!isDesktop ? handleBackToList : undefined}
                    isLoadingMessages={isLoadingMessages}
                  />
                ) : (
                  <EmptyState
                    hasChats={chatRooms.length > 0}
                    foodChatsCount={foodChatsCount}
                    getText={getText}
                  />
                )}
              </motion.main>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

type EmptyStateProps = {
  hasChats: boolean;
  foodChatsCount: number;
  getText: (key: keyof typeof FALLBACK) => string;
};

function EmptyState({ hasChats, foodChatsCount, getText }: EmptyStateProps) {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center p-6 bg-muted/20 dark:bg-muted/10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="text-center max-w-sm"
      >
        {/* Icon */}
        <div className="relative mx-auto w-24 h-24 mb-6">
          <div className="absolute inset-0 bg-primary/10 rounded-3xl animate-pulse" />
          <div className="relative flex items-center justify-center w-full h-full bg-primary/5 rounded-3xl border border-primary/20">
            <MessageCircle className="h-10 w-10 text-primary" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-foreground mb-3">
          {hasChats ? getText("selectConversation") : getText("noConversationsYet")}
        </h2>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {hasChats ? getText("selectConversationDesc") : getText("startNewChat")}
        </p>

        {/* Stats badge */}
        {hasChats && foodChatsCount > 0 && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Users className="h-4 w-4" />
            <span>
              {foodChatsCount} {getText("foodChats")}
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function ChatPageSkeleton() {
  return (
    <div className="h-full min-h-0 flex flex-col bg-background overflow-hidden">
      <div className="flex-1 min-h-0 flex overflow-hidden p-4 gap-4">
        {/* Sidebar skeleton */}
        <div className="hidden lg:flex w-[340px] flex-shrink-0 flex-col rounded-2xl border border-border bg-card p-4">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-10 w-full mb-5 rounded-xl" />
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main area skeleton */}
        <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 p-4 space-y-3 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                <Skeleton className={cn("h-14 rounded-2xl", i % 2 === 0 ? "w-48" : "w-56")} />
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
