'use client';

/**
 * UnifiedChatList Component
 * Displays all food sharing chat rooms in a list
 * Features: search, online indicators, unread badges
 * Supports dark/light themes with glassmorphism effects
 */

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FiSearch, FiMessageCircle, FiPackage, FiX, FiPlus } from 'react-icons/fi';
import type { UnifiedChatRoom } from '@/lib/data/chat';

const FALLBACK = {
  messages: 'Messages',
  searchConversations: 'Search conversations...',
  noConversations: 'No conversations found',
  yesterday: 'Yesterday',
  noMessages: 'No messages yet',
  newChat: 'New Chat',
  startNewConversation: 'Start a new conversation',
};

type UnifiedChatListProps = {
  chatRooms: UnifiedChatRoom[];
  activeChatId?: string;
  onSelectChat?: (chat: UnifiedChatRoom) => void;
  onlineUserIds?: string[];
};

export function UnifiedChatList({
  chatRooms,
  activeChatId,
  onSelectChat,
  onlineUserIds = [],
}: UnifiedChatListProps) {
  const t = useTranslations('Chat');
  const [searchQuery, setSearchQuery] = useState('');

  const getText = (key: keyof typeof FALLBACK) => {
    try { return t(key); } catch { return FALLBACK[key]; }
  };

  // Filter and sort chats
  const filteredChats = useMemo(() => {
    return chatRooms
      .filter((chat) => {
        const matchesSearch =
          !searchQuery ||
          chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chat.participants.some(
            (p) =>
              p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.secondName.toLowerCase().includes(searchQuery.toLowerCase())
          );

        return matchesSearch;
      })
      .sort((a, b) => {
        if (a.hasUnread && !b.hasUnread) return -1;
        if (!a.hasUnread && b.hasUnread) return 1;
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
  }, [chatRooms, searchQuery]);

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return getText('yesterday');
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const totalUnread = chatRooms.filter((c) => c.hasUnread).length;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">{getText('messages')}</h2>
          <div className="flex items-center gap-2">
            {totalUnread > 0 && (
              <Badge variant="destructive" className="h-6 min-w-6 px-2 font-semibold">
                {totalUnread}
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <FiPlus className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={getText('searchConversations')}
            className="pl-9 pr-9 bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <FiX className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Chat List - Scrollable */}
      <div className="flex-1 overflow-y-auto px-2">
        <AnimatePresence mode="popLayout">
          {filteredChats.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-muted-foreground"
            >
              <FiMessageCircle className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">{getText('noConversations')}</p>
            </motion.div>
          ) : (
            <div className="py-1 space-y-0.5">
              {filteredChats.map((chat, index) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <ChatListItem
                    chat={chat}
                    isActive={chat.id === activeChatId}
                    isOnline={chat.participants.some((p) => onlineUserIds.includes(p.id))}
                    onClick={() => onSelectChat?.(chat)}
                    formatTime={formatTime}
                    getText={getText}
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

// Chat List Item Component
type ChatListItemProps = {
  chat: UnifiedChatRoom;
  isActive: boolean;
  isOnline: boolean;
  onClick: () => void;
  formatTime: (timestamp: string | null) => string;
  getText: (key: keyof typeof FALLBACK) => string;
};

function ChatListItem({ chat, isActive, isOnline, onClick, formatTime, getText }: ChatListItemProps) {
  const otherParticipant = chat.participants[0];

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
        'hover:bg-muted active:scale-[0.98]',
        isActive && 'bg-primary/10 hover:bg-primary/15',
        chat.hasUnread && 'font-medium'
      )}
    >
      {/* Avatar / Image */}
      <div className="relative flex-shrink-0">
        {chat.postImage ? (
          <div className="relative h-12 w-12 rounded-xl overflow-hidden ring-2 ring-green-500/20">
            <Image
              src={chat.postImage}
              alt={chat.postName || ''}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <Avatar className="h-12 w-12 ring-2 ring-border">
            <AvatarImage src={otherParticipant?.avatarUrl || ''} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              {otherParticipant?.firstName?.[0]}
              {otherParticipant?.secondName?.[0]}
            </AvatarFallback>
          </Avatar>
        )}
        
        {/* Online indicator */}
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
        )}
        
        {/* Food chat badge */}
        <div
          className={cn(
            'absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center shadow-sm border-2 border-background bg-green-500',
            isOnline && '-bottom-2 -right-2'
          )}
        >
          <FiPackage className="h-2.5 w-2.5 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'truncate text-sm',
            chat.hasUnread ? 'font-semibold text-foreground' : 'text-foreground/80'
          )}>
            {chat.title}
          </span>
          <span className={cn(
            'text-xs flex-shrink-0',
            chat.hasUnread ? 'text-primary font-semibold' : 'text-muted-foreground'
          )}>
            {formatTime(chat.lastMessageTime)}
          </span>
        </div>
        
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn(
            'text-sm truncate',
            chat.hasUnread ? 'text-foreground/80' : 'text-muted-foreground'
          )}>
            {chat.lastMessage || getText('noMessages')}
          </p>
          {chat.hasUnread && (
            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
          )}
        </div>
      </div>
    </button>
  );
}
