'use client';

/**
 * ChatPageClient - Unified Chat Interface
 * Full-height layout with independently scrolling sidebar and message area
 * Features: glassmorphism, smooth animations, responsive design, dark/light themes
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
import { FiMessageCircle, FiZap, FiUsers } from 'react-icons/fi';
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
    <div className="h-full min-h-0 flex flex-col bg-background overflow-hidden relative">
      {/* Subtle background pattern for visual interest */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50 dark:opacity-30">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main content container - fills available space */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative z-10">
        <div className={cn(
          'flex w-full h-full',
          isDesktop ? 'p-3 gap-3' : 'p-0'
        )}>
          
          {/* Sidebar - Chat List */}
          <AnimatePresence mode="wait" initial={false}>
            {(isDesktop || showList) && (
              <motion.aside
                key="sidebar"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className={cn(
                  'flex flex-col min-h-0',
                  isDesktop 
                    ? 'w-[320px] lg:w-[360px] flex-shrink-0' 
                    : 'w-full absolute inset-0 z-20 bg-background'
                )}
              >
                <div className={cn(
                  'flex-1 min-h-0 flex flex-col overflow-hidden',
                  isDesktop && 'rounded-xl border border-border bg-card shadow-sm'
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
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className={cn(
                  'flex-1 min-h-0 flex flex-col overflow-hidden min-w-0',
                  isDesktop && 'rounded-xl border border-border bg-card shadow-sm'
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
    <div className="flex-1 min-h-0 flex items-center justify-center p-6 bg-muted/30">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="text-center max-w-sm"
      >
        {/* Icon */}
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
          <div className="relative flex items-center justify-center w-full h-full bg-primary/5 rounded-full border border-primary/20">
            <FiMessageCircle className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {hasChats ? getText('selectConversation') : getText('noConversationsYet')}
        </h2>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground mb-6">
          {hasChats ? getText('selectConversationDesc') : getText('startNewChat')}
        </p>

        {/* Stats badge */}
        {hasChats && foodChatsCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <FiUsers className="h-3.5 w-3.5" />
            <span>{foodChatsCount} {getText('foodChats')}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function ChatPageSkeleton() {
  return (
    <div className="h-full min-h-0 flex flex-col bg-background overflow-hidden">
      <div className="flex-1 min-h-0 flex overflow-hidden p-3 gap-3">
        {/* Sidebar skeleton */}
        <div className="hidden lg:flex w-[320px] flex-shrink-0 flex-col rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-7 w-28 mb-4" />
          <Skeleton className="h-10 w-full mb-5" />
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-11 w-11 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Main area skeleton */}
        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          
          {/* Messages */}
          <div className="flex-1 min-h-0 p-4 space-y-3 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                <Skeleton className={cn('h-12 rounded-2xl', i % 2 === 0 ? 'w-44' : 'w-52')} />
              </div>
            ))}
          </div>
          
          {/* Input */}
          <div className="p-4 border-t border-border">
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
