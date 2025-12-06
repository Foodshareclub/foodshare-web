'use client';

import React from 'react';
import { OneProduct } from '@/components/oneProduct/OneProduct';
import { ResponsiveContainer } from '@/components/shared/ResponsiveContainer';
import { useMediaQuery } from '@/hooks';
import type { OneProductType } from '@/components/oneProduct/OneProduct';

/**
 * OneProductDrawerContainer
 * Shows product details inline on desktop, in drawer on mobile
 * Uses unified ResponsiveContainer
 */
export const OneProductDrawerContainer: React.FC<OneProductType> = ({
  chat,
  product,
  buttonValue,
  sharerId,
  requesterId,
  roomId,
}) => {
  const isDesktop = useMediaQuery('(min-width: 1200px)');
  const size = isDesktop ? '24vw' : 'auto';

  return (
    <ResponsiveContainer
      drawerPlacement="end"
      drawerSize="md"
      triggerPosition="right"
    >
      <OneProduct
        roomId={roomId}
        sharerId={sharerId}
        requesterId={requesterId}
        size={size}
        chat={chat}
        buttonValue={buttonValue}
        product={product}
      />
    </ResponsiveContainer>
  );
};
