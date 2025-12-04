import * as React from "react";
import { memo } from "react";
import { Glass } from "@/components/Glass";

type MinifiedUserInfoType = {
  userId?: string;
  src?: string;
  firstName?: string;
  secondName?: string;
  onGetCurrentUserMessages?: () => void;
  roomId?: string;
  roomIDFromUrl?: string;
  newMessageRoomId?: string;
  description?: string;
  lastUserSeen?: string;
};

export const MinifiedUserInfo: React.FC<MinifiedUserInfoType> = memo(
  ({
    src,
    firstName,
    secondName,
    description,
    onGetCurrentUserMessages,
    roomId,
    roomIDFromUrl,
    userId,
    lastUserSeen,
  }) => {
    const onClick = async () => {
      if (onGetCurrentUserMessages) {
        onGetCurrentUserMessages();
      }
    };

    const isActive = roomIDFromUrl === roomId;

    return (
      <Glass
        variant={isActive ? "standard" : "subtle"}
        className={`cursor-pointer rounded-xl py-2 px-2 flex items-center gap-4 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] glass-accelerated ${
          isActive ? "" : "hover:opacity-90"
        }`}
        onClick={onClick}
      >
        <div className="relative">
          <img
            src={src || "/default-avatar.png"}
            alt={`${firstName} ${secondName}`}
            className="w-12 h-12 rounded-full object-cover"
            loading="lazy"
            decoding="async"
          />
          {lastUserSeen !== userId && (
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-300 border-2 border-white rounded-full" />
          )}
        </div>

        <div
          className={`transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-60"}`}
        >
          <h4 className="text-sm font-semibold">{description}</h4>
          <p className="text-sm text-gray-600">
            {firstName} {secondName}
          </p>
        </div>
      </Glass>
    );
  }
);

MinifiedUserInfo.displayName = "MinifiedUserInfo";
