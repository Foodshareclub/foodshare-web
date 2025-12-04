'use client';

import React, { useState } from "react";
import { OneProduct } from "@/components/oneProduct/OneProduct";
import UniversalDrawer from "@/components/universalDrawer/UniversalDrawer";
import type { OneProductType } from "@/components/oneProduct/OneProduct";
import { useMediaQuery } from "@/hooks";
import { ArrowLeftIcon } from "@/utils/icons";
import { GlassButton } from "@/components/Glass";

export const OneProductDrawerContainer: React.FC<OneProductType> = ({
  chat,
  product,
  buttonValue,
  sharerId,
  requesterId,
  roomId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isSmaller = useMediaQuery("(min-width:1200px)");

  return (
    <>
      {!isSmaller ? (
        <>
          <div className="w-screen text-right fixed">
            <GlassButton
              variant="accentOrange"
              onClick={() => setIsOpen(true)}
              className="right-[17px] w-[45px] h-[45px] rounded-full z-10"
            >
              <ArrowLeftIcon />
            </GlassButton>
          </div>
          <UniversalDrawer
            onClose={() => setIsOpen(false)}
            isOpen={isOpen}
            size={"md"}
            placement={"end"}
          >
            <OneProduct
              roomId={roomId}
              sharerId={sharerId}
              requesterId={requesterId}
              size={"auto"}
              chat={chat}
              buttonValue={buttonValue}
              product={product}
            />
          </UniversalDrawer>
        </>
      ) : (
        <OneProduct
          roomId={roomId}
          sharerId={sharerId}
          requesterId={requesterId}
          size={"24vw"}
          chat={chat}
          buttonValue={buttonValue}
          product={product}
        />
      )}
    </>
  );
};
