'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/queries/useProfileQueries';
import { useRooms, useMessages } from '@/hooks/queries/useChatQueries';
import { useChatStore } from '@/store/zustand/useChatStore';
import { chatAPI } from '@/api/chatAPI';
import Navbar from '@/components/header/navbar/Navbar';
import ContactsBlock from '@/components/chat/ContactsBlock';
import { MessagesWindow } from '@/components/chat/MessagesWindow';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Chat page - Full chat interface
 * Supports: /chat, /chat?food=123, /chat?user=uuid, /chat?room=uuid
 */
export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const foodId = searchParams.get('food');
  const targetUserId = searchParams.get('user');
  const roomIdParam = searchParams.get('room');

  const [activeRoomId, setActiveRoomId] = useState<string | null>(roomIdParam);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Get user profile
  const { data: profile } = useProfile(user?.id);

  // Get all rooms for current user
  const { data: rooms, isLoading: roomsLoading } = useRooms(user?.id);

  // Get messages for active room (syncs to Zustand store)
  useMessages(activeRoomId || undefined);
  const storeMessages = useChatStore((state) => state.messages);

  // Handle room creation for food or user chat
  useEffect(() => {
    if (authLoading || !user || isCreatingRoom) return;

    const initializeChat = async () => {
      // If we have a room param, use it directly
      if (roomIdParam) {
        setActiveRoomId(roomIdParam);
        return;
      }

      // If we have a food ID, check for existing room or create one
      if (foodId) {
        setIsCreatingRoom(true);
        try {
          const { data: existingRooms } = await chatAPI.checkRoomAvailability(user.id, foodId);

          if (existingRooms && existingRooms.length > 0) {
            setActiveRoomId(existingRooms[0].id);
          }
          // If no room exists, we need the product's sharer ID to create one
          // For now, just show the chat list - user can initiate from product page
        } catch {
          // Error checking room
        } finally {
          setIsCreatingRoom(false);
        }
        return;
      }

      // If we have a target user ID (direct message)
      if (targetUserId && rooms) {
        // Find existing room with this user
        const existingRoom = rooms.find(
          (room) => room.sharer === targetUserId || room.requester === targetUserId
        );
        if (existingRoom) {
          setActiveRoomId(existingRoom.id);
        }
        // If no room exists, we'd need to create one - requires a product context
      }
    };

    initializeChat();
  }, [user, authLoading, foodId, targetUserId, roomIdParam, rooms, isCreatingRoom]);

  // Set first room as active if none selected
  useEffect(() => {
    if (!activeRoomId && rooms && rooms.length > 0 && !foodId && !targetUserId) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId, foodId, targetUserId]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Loading state
  if (authLoading || !user) {
    return <ChatSkeleton />;
  }

  const newMessage = useChatStore.getState().newMessage;
  const newMessageRoomId = newMessage?.room_id || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Navbar
        userId={user.id}
        isAuth={true}
        productType="food"
        onRouteChange={() => { }}
        onProductTypeChange={() => { }}
        imgUrl={profile?.avatar_url || ''}
        firstName={profile?.first_name || ''}
        secondName={profile?.second_name || ''}
        email={profile?.email || ''}
        signalOfNewMessage={[]}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-4 h-[calc(100vh-120px)]">
          {/* Contacts Sidebar */}
          <div className="hidden xl:block">
            <ContactsBlock
              userID={user.id}
              roomIDFromUrl={activeRoomId || ''}
              newMessageRoomId={newMessageRoomId}
              allRooms={rooms || []}
            />
          </div>

          {/* Messages Area */}
          <div className="flex-1">
            {roomsLoading || isCreatingRoom ? (
              <MessagesSkeleton />
            ) : activeRoomId && storeMessages ? (
              <MessagesWindow
                messages={storeMessages}
                userID={user.id}
                roomId={activeRoomId}
              />
            ) : rooms && rooms.length > 0 ? (
              <EmptyChat message="Select a conversation to start chatting" />
            ) : (
              <EmptyChat message="No conversations yet" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function ChatSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="h-16 bg-white/50 backdrop-blur" />
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-4 h-[calc(100vh-120px)]">
          <div className="hidden xl:block w-72">
            <Skeleton className="h-full rounded-2xl" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="glass-subtle h-full rounded-2xl p-4">
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <Skeleton className="h-12 w-48 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyChat({ message }: { message: string }) {
  return (
    <div className="glass-subtle h-full rounded-2xl flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">💬</div>
        <p className="text-gray-500">{message}</p>
      </div>
    </div>
  );
}
