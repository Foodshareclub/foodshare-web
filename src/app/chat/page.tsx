import { redirect } from "next/navigation";
import { ChatPageClient } from "./ChatPageClient";
import { createClient } from "@/lib/supabase/server";
import { getAllUserChats, getChatMessages } from "@/lib/data/chat";

// Force dynamic rendering - user-specific content
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  food?: string;
  room?: string;
  user?: string;
}>;

/**
 * Chat Page - Server Component
 * Fetches initial data on server, passes to client for real-time updates
 */
export default async function ChatPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();

  // Get current user with profile
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  // Get user profile for name and avatar
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, second_name, avatar_url")
    .eq("id", user.id)
    .single();

  const userName = profile ? `${profile.first_name || ""} ${profile.second_name || ""}`.trim() : "";
  const userAvatar = profile?.avatar_url || "";

  // Fetch all user chats (food sharing only for now)
  const chatRooms = await getAllUserChats(user.id);

  // Determine active room
  let activeRoomId = params.room || null;
  let initialMessages: Array<{
    id: string;
    text: string;
    senderId: string;
    timestamp: string;
    image?: string;
    isOwn: boolean;
    senderName?: string;
    senderAvatar?: string;
  }> = [];

  // If food param provided, find the matching room
  if (params.food && !activeRoomId) {
    const foodRoom = chatRooms.find(
      (r) => r.type === "food" && r.postId === parseInt(params.food!, 10)
    );
    if (foodRoom) {
      activeRoomId = foodRoom.id;
    }
  }

  // Fetch messages for active room
  if (activeRoomId) {
    const activeChat = chatRooms.find((r) => r.id === activeRoomId);

    if (activeChat?.type === "food") {
      const messages = await getChatMessages(activeRoomId);
      initialMessages = messages.map((m) => ({
        id: m.id,
        text: m.text,
        senderId: m.profile_id,
        timestamp: m.timestamp,
        image: m.image,
        isOwn: m.profile_id === user.id,
        senderName: m.profiles?.first_name,
        senderAvatar: m.profiles?.avatar_url,
      }));
    }
  }

  // Find active chat room data
  const activeChatRoom = activeRoomId ? chatRooms.find((r) => r.id === activeRoomId) || null : null;

  return (
    <ChatPageClient
      userId={user.id}
      userName={userName}
      userAvatar={userAvatar}
      chatRooms={chatRooms}
      activeChatRoom={activeChatRoom}
      initialMessages={initialMessages}
    />
  );
}
