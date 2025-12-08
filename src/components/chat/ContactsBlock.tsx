'use client';

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { markFoodChatAsRead } from "@/app/actions/chat";
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
  /** User profile data (passed from server) */
  userProfile?: {
    avatar_url?: string | null;
    first_name?: string | null;
    second_name?: string | null;
  } | null;
};

/**
 * ContactsBlock Component
 * Displays the user's chat contacts sidebar
 * Receives profile data as props from Server Component
 */
export default function ContactsBlock({
  allRooms,
  roomIDFromUrl,
  newMessageRoomId,
  userID,
  userProfile,
}: ContactsBlockType) {
    const t = useTranslations();

    // Profile data from props (server-fetched)
    const imgUrl = userProfile?.avatar_url ?? "";
    const userFirstName = userProfile?.first_name ?? "";
    const userSecondName = userProfile?.second_name ?? "";

    const router = useRouter();

    const onGetCurrentUserMessages = async (
      post_id: number,
      _sharerId: string,
      _requesterId: string,
      roomId: string
    ) => {
      if (roomId === roomIDFromUrl) {
        return;
      }
      
      router.push(`/chat?food=${post_id}&room=${roomId}`);
      
      // Mark room as read using Server Action
      await markFoodChatAsRead(roomId);
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
