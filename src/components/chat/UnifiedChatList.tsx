"use client";

/**
 * UnifiedChatList Component
 * Displays all food sharing chat rooms in a beautiful list
 * Features: search, category tabs, online indicators, unread badges, owner names
 * Supports dark/light themes with glassmorphism effects
 */

import React, { useState, useMemo, useCallback, memo } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MessageCircle,
  Package,
  X,
  User,
  LayoutGrid,
  ShoppingBag,
  RefreshCw,
  Heart,
  Home,
  Users,
  Leaf,
  Warehouse,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

// Icon aliases for consistency
const FiSearch = Search;
const FiMessageCircle = MessageCircle;
const FiPackage = Package;
const FiX = X;
const FiUser = User;
const FiGrid = LayoutGrid;
const FiShoppingBag = ShoppingBag;
const FiRefreshCw = RefreshCw;
const FiHeart = Heart;
const FiHome = Home;
const FiUsers = Users;
const LuLeaf = Leaf;
const LuWarehouse = Warehouse;
import type { UnifiedChatRoom } from "@/lib/data/chat";

const FALLBACK = {
  messages: "Messages",
  searchConversations: "Search conversations...",
  noConversations: "No conversations found",
  yesterday: "Yesterday",
  noMessages: "No messages yet",
  newChat: "New Chat",
  startNewConversation: "Start a new conversation",
  chattingWith: "Chatting with",
  about: "About",
  allListings: "All",
};

// Category configuration with icons and labels
const CATEGORIES = [
  { id: "all", label: "All", icon: FiGrid },
  { id: "food", label: "Food", icon: FiPackage },
  { id: "thing", label: "Things", icon: FiShoppingBag },
  { id: "borrow", label: "Borrow", icon: FiRefreshCw },
  { id: "wanted", label: "Wanted", icon: FiHeart },
  { id: "fridge", label: "Fridges", icon: FiHome },
  { id: "foodbank", label: "Food Banks", icon: LuWarehouse },
  { id: "volunteer", label: "Volunteer", icon: FiUsers },
  { id: "vegan", label: "Vegan", icon: LuLeaf },
] as const;

type UnifiedChatListProps = {
  chatRooms: UnifiedChatRoom[];
  activeChatId?: string;
  onSelectChat?: (chat: UnifiedChatRoom) => void;
  onlineUserIds?: string[];
  currentUserId?: string;
};

export function UnifiedChatList({
  chatRooms,
  activeChatId,
  onSelectChat,
  onlineUserIds = [],
  currentUserId,
}: UnifiedChatListProps) {
  const t = useTranslations("Chat");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const getText = useCallback(
    (key: keyof typeof FALLBACK) => {
      try {
        return t(key);
      } catch {
        return FALLBACK[key];
      }
    },
    [t]
  );

  // Get available categories from chat rooms (only show tabs for categories that have chats)
  const availableCategories = useMemo(() => {
    const categorySet = new Set(chatRooms.map((chat) => chat.postType || "food"));
    return CATEGORIES.filter((cat) => cat.id === "all" || categorySet.has(cat.id));
  }, [chatRooms]);

  // Count chats per category for badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: chatRooms.length };
    chatRooms.forEach((chat) => {
      const type = chat.postType || "food";
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [chatRooms]);

  // Filter and sort chats
  const filteredChats = useMemo(() => {
    return chatRooms
      .filter((chat) => {
        // Category filter
        const matchesCategory = selectedCategory === "all" || chat.postType === selectedCategory;

        // Search filter
        const matchesSearch =
          !searchQuery ||
          chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chat.participants.some(
            (p) =>
              p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.secondName.toLowerCase().includes(searchQuery.toLowerCase())
          );

        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (a.hasUnread && !b.hasUnread) return -1;
        if (!a.hasUnread && b.hasUnread) return 1;
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
  }, [chatRooms, searchQuery, selectedCategory]);

  const formatTime = useCallback(
    (timestamp: string | null) => {
      if (!timestamp) return "";
      const date = new Date(timestamp);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } else if (diffDays === 1) {
        return getText("yesterday");
      } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: "short" });
      } else {
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
      }
    },
    [getText]
  );

  const totalUnread = useMemo(() => chatRooms.filter((c) => c.hasUnread).length, [chatRooms]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      {/* Header - Fixed */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FiMessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{getText("messages")}</h2>
              <p className="text-xs text-muted-foreground">
                {chatRooms.length} conversation{chatRooms.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalUnread > 0 && (
              <Badge variant="destructive" className="h-6 min-w-6 px-2 font-semibold animate-pulse">
                {totalUnread}
              </Badge>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={getText("searchConversations")}
            className="pl-9 pr-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 rounded-xl h-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-transparent"
              onClick={() => setSearchQuery("")}
            >
              <FiX className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Category Tabs - Horizontally scrollable */}
      {availableCategories.length > 1 && (
        <div className="flex-shrink-0 border-b border-border/50 overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          <div className="flex gap-1 px-3 py-2 min-w-max">
            {availableCategories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              const count = categoryCounts[category.id] || 0;

              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap",
                    "hover:bg-muted/70 active:scale-95",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{category.label}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        "ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full font-semibold",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 px-2 py-2 scroll-smooth">
        <AnimatePresence mode="sync" initial={false}>
          {filteredChats.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-muted-foreground"
            >
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <FiMessageCircle className="h-8 w-8 opacity-50" />
              </div>
              <p className="text-sm font-medium">{getText("noConversations")}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Start sharing food to begin chatting
              </p>
            </motion.div>
          ) : (
            <div className="space-y-1">
              {filteredChats.map((chat, index) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: index * 0.02, duration: 0.2 }}
                >
                  <ChatListItem
                    chat={chat}
                    isActive={chat.id === activeChatId}
                    isOnline={chat.participants.some((p) => onlineUserIds.includes(p.id))}
                    onClick={() => onSelectChat?.(chat)}
                    formatTime={formatTime}
                    getText={getText}
                    currentUserId={currentUserId}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Chat List Item Component - Memoized for performance
type ChatListItemProps = {
  chat: UnifiedChatRoom;
  isActive: boolean;
  isOnline: boolean;
  onClick: () => void;
  formatTime: (timestamp: string | null) => string;
  getText: (key: keyof typeof FALLBACK) => string;
  currentUserId?: string;
};

const ChatListItem = memo(
  function ChatListItem({
    chat,
    isActive,
    isOnline,
    onClick,
    formatTime,
    getText,
    currentUserId: _currentUserId,
  }: ChatListItemProps) {
    const otherParticipant = chat.participants[0];
    const participantName = otherParticipant
      ? `${otherParticipant.firstName} ${otherParticipant.secondName}`.trim()
      : "Unknown";

    // Determine user's role in this chat
    const isSharer = chat.isSharer;
    const roleLabel = isSharer ? "Your listing" : "Requested";

    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full flex items-start gap-3 p-3 rounded-xl transition-all duration-200",
          "hover:bg-muted/70 active:scale-[0.98]",
          isActive && "bg-primary/10 hover:bg-primary/15 ring-1 ring-primary/20",
          chat.hasUnread && !isActive && "bg-muted/40"
        )}
      >
        {/* Avatar / Image */}
        <div className="relative flex-shrink-0">
          {chat.postImage ? (
            <div className="relative h-12 w-12 rounded-xl overflow-hidden ring-2 ring-green-500/20 shadow-sm">
              <Image src={chat.postImage} alt={chat.postName || ""} fill className="object-cover" />
            </div>
          ) : (
            <Avatar className="h-12 w-12 ring-2 ring-border">
              <AvatarImage src={otherParticipant?.avatarUrl || ""} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
                {otherParticipant?.firstName?.[0]}
                {otherParticipant?.secondName?.[0]}
              </AvatarFallback>
            </Avatar>
          )}

          {/* Online indicator */}
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background shadow-sm" />
          )}

          {/* Food chat badge */}
          {!isOnline && (
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center shadow-sm border-2 border-background bg-green-500">
              <FiPackage className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 text-left">
          {/* Post name / Title with role badge */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={cn(
                  "truncate text-sm",
                  chat.hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground/90"
                )}
              >
                {chat.title}
              </span>
              <span
                className={cn(
                  "px-1.5 py-0.5 text-[9px] font-medium rounded flex-shrink-0",
                  isSharer
                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400"
                    : "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400"
                )}
              >
                {roleLabel}
              </span>
            </div>
            <span
              className={cn(
                "text-[10px] flex-shrink-0 font-medium",
                chat.hasUnread ? "text-primary" : "text-muted-foreground"
              )}
            >
              {formatTime(chat.lastMessageTime)}
            </span>
          </div>

          {/* Participant name - Who you're chatting with */}
          <div className="flex items-center gap-1.5 mb-1">
            <FiUser className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{participantName}</span>
            {isOnline && <span className="text-[10px] text-green-500 font-medium">• online</span>}
            {/* Category badge */}
            {chat.postType && chat.postType !== "food" && (
              <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-muted text-muted-foreground capitalize">
                {chat.postType}
              </span>
            )}
          </div>

          {/* Last message preview */}
          <div className="flex items-center justify-between gap-2">
            <p
              className={cn(
                "text-xs truncate",
                chat.hasUnread ? "text-foreground/80 font-medium" : "text-muted-foreground"
              )}
            >
              {chat.lastMessage || getText("noMessages")}
            </p>
            {chat.hasUnread && (
              <span className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 animate-pulse" />
            )}
          </div>
        </div>
      </button>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for memo - only re-render when relevant props change
    return (
      prevProps.chat.id === nextProps.chat.id &&
      prevProps.chat.lastMessage === nextProps.chat.lastMessage &&
      prevProps.chat.lastMessageTime === nextProps.chat.lastMessageTime &&
      prevProps.chat.hasUnread === nextProps.chat.hasUnread &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.isOnline === nextProps.isOnline
    );
  }
);
