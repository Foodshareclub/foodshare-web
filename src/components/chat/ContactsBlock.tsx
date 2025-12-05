'use client';

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { useAuth } from "@/hooks/useAuth";
import { useCurrentProfile } from "@/hooks/queries/useProfileQueries";
import { useUpdateRoom } from "@/hooks/queries/useChatQueries";
import AvatarWithRipple from "@/components/listingPersonCard/AvatarWithRipple";
import { SearchIcon } from "@/utils/icons";
import { MinifiedUserInfo } from "@/components";
import { Input } from "@/components/ui/input";

import type { CustomRoomType } from "@/api/chatAPI";

export type ContactsBlockType = {
  userID: string;
  roomIDFromUrl: string;
  newMessageRoomId: string;
  allRooms: Array<CustomRoomType>;
};

/**
 * ContactsBlock Component
 * Displays the user's chat contacts sidebar
 * Uses React Query + Zustand instead of Redux
 */
export default function ContactsBlock({ allRooms, roomIDFromUrl, newMessageRoomId, userID }: ContactsBlockType) {
    const t = useTranslations();

    // Auth and profile from React Query hooks (replaces Redux selectors)
    const { user } = useAuth();
    const { profile, avatarUrl } = useCurrentProfile(user?.id);

    // Room update mutation from React Query
    const updateRoom = useUpdateRoom();

    // Profile data
    const imgUrl = avatarUrl ?? profile?.avatar_url ?? "";
    const userFirstName = profile?.first_name ?? "";
    const userSecondName = profile?.second_name ?? "";

    const router = useRouter();

    const onGetCurrentUserMessages = async (
      post_id: number,
      sharerId: string,
      requesterId: string,
      roomId: string
    ) => {
      if (roomId === roomIDFromUrl) {
        return;
      } else {
        router.push(`/chat?food=${post_id}&room=${roomId}`);
      }
      // Update room using React Query mutation
      await updateRoom.mutateAsync({ last_message_seen_by: userID, id: roomId });
    };

    return (
      <div className="glass-subtle rounded-2xl w-auto xl:w-[18vw] py-3 pr-3 flex flex-col animate-slide-up">
        <div className="flex flex-col self-center">
          <AvatarWithRipple img={imgUrl || ""} />
          <div className="py-2">
            <h2 className="text-center text-xl font-semibold">
              {userFirstName} {userSecondName}
            </h2>
          </div>
          <div className="w-[90%] self-center mb-5 relative">
            <Input
              variant="glass"
              placeholder={t('search')}
              className="pr-10"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon />
            </div>
          </div>
        </div>
        <div className="flex flex-col self-center w-full">
          <div className="rounded-[10%] px-2 max-h-[350px] overflow-auto">
            {allRooms.map((data) => {
              return (
                <MinifiedUserInfo
                  lastUserSeen={data.last_message_seen_by}
                  userId={userID}
                  newMessageRoomId={newMessageRoomId}
                  roomIDFromUrl={roomIDFromUrl}
                  key={data.id}
                  onGetCurrentUserMessages={() =>
                    onGetCurrentUserMessages(data.posts.id, data.sharer, data.requester, data.id)
                  }
                  src={data.posts.images?.[0] || ""}
                  description={data.posts.post_name}
                  firstName={data.profiles.first_name}
                  secondName={data.profiles.second_name}
                  roomId={data.id}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
}
