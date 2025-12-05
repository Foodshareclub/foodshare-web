'use client';

import React, { useState } from "react";
import { ContactsBlock, UniversalDrawer } from "@/components";
import { useMediaQuery } from "@/hooks";
import { ArrowRightIcon } from "@/utils/icons";
import type { ContactsBlockType } from "@/components/chat/ContactsBlock";
import { Button } from "@/components/ui/button";

export const ContactsBlockDrawerContainer: React.FC<ContactsBlockType> = ({
  allRooms,
  roomIDFromUrl,
  newMessageRoomId,
  userID,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isSmaller = useMediaQuery("(min-width:1200px)");

  return (
    <>
      {!isSmaller ? (
        <>
          <Button
            onClick={() => setIsOpen(true)}
            className="fixed left-[-10px] w-[45px] h-[45px] rounded-full z-10 bg-orange-500 hover:bg-orange-600"
          >
            <ArrowRightIcon />
          </Button>
          <UniversalDrawer
            onClose={() => setIsOpen(false)}
            isOpen={isOpen}
            size={"md"}
            placement={"start"}
          >
            <ContactsBlock
              userID={userID}
              allRooms={allRooms}
              newMessageRoomId={newMessageRoomId}
              roomIDFromUrl={roomIDFromUrl as string}
            />
          </UniversalDrawer>
        </>
      ) : (
        <ContactsBlock
          userID={userID}
          allRooms={allRooms}
          newMessageRoomId={newMessageRoomId}
          roomIDFromUrl={roomIDFromUrl as string}
        />
      )}
    </>
  );
};
