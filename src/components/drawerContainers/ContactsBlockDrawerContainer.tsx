'use client';

import React from 'react';
import { ContactsBlock } from '@/components';
import { ResponsiveContainer } from '@/components/shared/ResponsiveContainer';
import type { ContactsBlockType } from '@/components/chat/ContactsBlock';

/**
 * ContactsBlockDrawerContainer
 * Shows contacts inline on desktop, in drawer on mobile
 * Uses unified ResponsiveContainer
 */
export const ContactsBlockDrawerContainer: React.FC<ContactsBlockType> = ({
  allRooms,
  roomIDFromUrl,
  newMessageRoomId,
  userID,
}) => {
  return (
    <ResponsiveContainer
      drawerPlacement="start"
      drawerSize="md"
      triggerPosition="left"
    >
      <ContactsBlock
        userID={userID}
        allRooms={allRooms}
        newMessageRoomId={newMessageRoomId}
        roomIDFromUrl={roomIDFromUrl as string}
      />
    </ResponsiveContainer>
  );
};
