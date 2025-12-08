'use client';

/**
 * ChatPageClient - Unified Chat Interface
 * Full-height layout with independently scrolling sidebar and message area
 * Features: glassmorphism, smooth animations, responsive design
 * 
 * Layout: Uses h-[calc(100vh-theme(spacing.16)-theme(spacing.16))] to account for
 * navbar (~64px) and footer (~64px), keeping chat within main content area
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { UnifiedChatList } from '@/components/chat/UnifiedChatList';
import { UnifiedChatContainer } from '@/components/chat/UnifiedChatContainer';
import { useMediaQuery } from '@/hooks';
import { useOnlineStatus } from '@/hooks/useUnifiedChat';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FiMessageCircle, FiZap } from 'react-icons/fi';
import type { UnifiedChatRoom } from '@/lib/data/chat';

const FALLBACK = {
  selectConversation: 'Select a conversation',
  selectConversationDesc: 'Choose a chat from the sidebar to start messaging',
  noConversationsYet: 'No conversations yet',
  startNewChat: 'Start sharing food to begin chatting with others',
  welcomeToChat: 'Welcome to Chat',
  foodChats: 'Food Sharing Chats',
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
  userName = '',
  userAvatar = '',
  chatRooms,
  activeChatRoom,
  initialMessages,
}: ChatPageClientProps) {
  const t = useTranslations('Chat');
  const router = useRouter();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  
  const [selectedChat, setSelectedChat] = useState<UnifiedChatRoom | null>(activeChatRoom);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [showList, setShowList] = useState(!activeChatRoom);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  useOnlineStatus(userId);

  const getText = (key: keyof typeof FALLBACK) => {
    try { return t(key); } catch { return FALLBACK[key]; }
  };

  // Sync with URL params
  useEffect(() => {
    if (activeChatRoom) {
      setSelectedChat(activeChatRoom);
      setMessages(initialMessages);
      if (!isDesktop) setShowList(false);
    }
  }, [activeChatRoom, initialMessages, isDesktop]);

  // Load messages when chat is selected
  const loadMessages = async (chat: UnifiedChatRoom) => {
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/chat/messages?roomId=${chat.id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSelectChat = async (chat: UnifiedChatRoom) => {
    setSelectedChat(chat);
    if (!isDesktop) setShowList(false);
    
    // Update URL
    const params = new URLSearchParams();
    if (chat.postId) {
      params.set('food', chat.postId.toString());
    }
    params.set('room', chat.id);
    router.push(`/chat?${params.toString()}`, { scroll: false });
    
    // Load messages if not already loaded
    if (chat.id !== activeChatRoom?.id) {
      await loadMessages(chat);
    }
  };

  const handleBackToList = () => {
    setShowList(true);
    router.push('/chat', { scroll: false });
  };

  // Collect online user IDs
  const onlineUserIds: string[] = [];

  // Stats for empty state
  const foodChatsCount = chatRooms.length;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Main content - fills remaining space */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        <div className={cn(
          'flex w-full h-full',
          isDesktop ? 'p-4 gap-4' : 'p-0'
        )}>
          
          {/* Sidebar - Chat List */}
          <AnimatePresence mode="wait" initial={false}>
            {(isDesktop || showList) && (
              <motion.aside
                key="sidebar"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={cn(
                  'flex flex-col overflow-hidden',
                  isDesktop 
                    ? 'w-[340px] flex-shrink-0' 
                    : 'w-full absolute inset-0 z-20 bg-background/95 backdrop-blur-xl'
                )}
              >
                <div className={cn(
                  'flex-1 flex flex-col overflow-hidden',
                  isDesktop && 'rounded-2xl glass-card shadow-xl'
                )}>
                  <UnifiedChatList
                    chatRooms={chatRooms}
                    activeChatId={selectedChat?.id}
                    onSelectChat={handleSelectChat}
                    onlineUserIds={onlineUserIds}
                  />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main Chat Area */}
          <AnimatePresence mode="wait" initial={false}>
            {(isDesktop || !showList) && (
              <motion.main
                key="main"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={cn(
                  'flex-1 flex flex-col overflow-hidden min-w-0',
                  isDesktop && 'rounded-2xl glass-card shadow-xl'
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
                    onBack={!isDesktop ? handleBackToList : undefined}
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
  onBack?: () => void;
};

function EmptyState({ hasChats, foodChatsCount, getText }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="text-center max-w-md"
      >
        {/* Animated icon */}
        <div className="relative mx-auto w-24 h-24 mb-8">
          <motion.div
            className="absolute inset-0 bg-primary/20 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-2 bg-primary/30 rounded-full"
            animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.3, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
          />
          <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 rounded-full backdrop-blur-sm">
            <FiMessageCircle className="h-10 w-10 text-primary" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          {hasChats ? getText('selectConversation') : getText('noConversationsYet')}
        </h2>
        
        {/* Description */}
        <p className="text-muted-foreground mb-8">
          {hasChats ? getText('selectConversationDesc') : getText('startNewChat')}
        </p>

        {/* Stats */}
        {hasChats && (
          <div className="flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400"
            >
              <FiZap className="h-4 w-4" />
              <span className="text-sm font-medium">{foodChatsCount} {getText('foodChats')}</span>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function ChatPageSkeleton() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden">
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Sidebar skeleton */}
        <div className="hidden lg:flex w-[340px] flex-shrink-0 flex-col rounded-2xl glass-card p-4">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-10 w-full mb-6" />
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Main area skeleton */}
        <div className="flex-1 flex flex-col rounded-2xl glass-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-white/10">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          
          {/* Messages */}
          <div className="flex-1 p-4 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                <Skeleton className={cn('h-14 rounded-2xl', i % 2 === 0 ? 'w-48' : 'w-56')} />
              </div>
            ))}
          </div>
          
          {/* Input */}
          <div className="p-4 border-t border-white/10">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
