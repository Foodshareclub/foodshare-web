/**
 * Header Server Component
 * Fetches auth, chat, and notification data on the server and passes to client Header
 */

import { getAuthSession } from "@/lib/data/auth";
import { getUserChatRooms, type ChatRoom } from "@/lib/data/chat";
import { getProfile } from "@/lib/data/profiles";
import { getUnreadNotificationCount } from "@/lib/data/notifications";
import Header from "./Header";
import type { CustomRoomType } from "@/api/chatAPI";

type HeaderServerProps = {
  getRoute: (route: string) => void;
  setProductType: (type: string) => void;
  productType: string;
};

export default async function HeaderServer({
  getRoute,
  setProductType,
  productType,
}: HeaderServerProps) {
  // Fetch auth session on server
  const authSession = await getAuthSession();
  const userId = authSession.user?.id;

  // Fetch profile, chat rooms, and notification count in parallel if authenticated
  let profile = null;
  let chatRooms: Awaited<ReturnType<typeof getUserChatRooms>> = [];
  let unreadNotificationCount = 0;

  if (userId) {
    [profile, chatRooms, unreadNotificationCount] = await Promise.all([
      getProfile(userId),
      getUserChatRooms(userId),
      getUnreadNotificationCount(userId),
    ]);
  }

  // Calculate unread messages and transform to CustomRoomType format
  const unreadRooms = chatRooms
    .filter((room) => room.last_message_sent_by !== userId && room.last_message)
    .map((room) => ({
      id: room.id,
      sharer: room.sharer,
      requester: room.requester,
      post_id: room.post_id,
      last_message: room.last_message,
      last_message_sent_by: room.last_message_sent_by,
      last_message_seen_by: room.last_message_seen_by,
      last_message_time: room.last_message_time,
      posts: room.posts
        ? {
            id: room.posts.id,
            post_name: room.posts.post_name,
            images: room.posts.images,
          }
        : { id: 0, post_name: "", images: [] },
      profiles: room.requester_profile
        ? {
            id: room.requester_profile.id,
            first_name: room.requester_profile.first_name,
            second_name: room.requester_profile.second_name,
            avatar_url: room.requester_profile.avatar_url,
          }
        : { id: "", first_name: "", second_name: "", avatar_url: "" },
    })) as CustomRoomType[];

  // Get avatar URL from profile or auth session
  const avatarUrl = profile?.avatar_url || authSession.user?.profile?.avatar_url || "";

  return (
    <Header
      userId={userId}
      isAuth={authSession.isAuthenticated}
      isAdmin={authSession.isAdmin}
      productType={productType}
      onRouteChange={getRoute}
      onProductTypeChange={setProductType}
      imgUrl={avatarUrl}
      firstName={profile?.first_name ?? authSession.user?.profile?.first_name ?? undefined}
      secondName={profile?.second_name ?? authSession.user?.profile?.second_name ?? undefined}
      email={authSession.user?.email ?? profile?.email ?? undefined}
      signalOfNewMessage={unreadRooms}
      initialUnreadCount={unreadNotificationCount}
    />
  );
}
