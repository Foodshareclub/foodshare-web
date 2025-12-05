import React, { memo } from "react";
import type { RoomParticipantsType } from "@/api/chatAPI";
import { Glass } from "@/components/Glass";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type MessageItemProps = {
  message: RoomParticipantsType;
  isOwnMessage: boolean;
  onAvatarClick: () => void;
  avatarUrl?: string;
  userName?: string;
};

/**
 * Individual chat message component - memoized to prevent unnecessary re-renders
 * Only re-renders when message, isOwnMessage, or avatar data changes
 */
const MessageItem: React.FC<MessageItemProps> = memo(
  ({ message, isOwnMessage, onAvatarClick, avatarUrl, userName }) => {
    const time = new Date(message.timestamp as string).toLocaleTimeString();

    if (isOwnMessage) {
      return (
        <div className="flex justify-end" key={message.id}>
          <span className="text-[10px] text-muted-foreground self-center">{time}</span>
          <Glass
            variant="accentGreen"
            borderRadius="25px"
            enableHover={false}
            className="glass-fade-in m-2 max-w-[255px]"
          >
            <p className="px-4 py-2">{message.text}</p>
          </Glass>
        </div>
      );
    }

    return (
      <div className="flex justify-start" key={message.id}>
        <Glass
          variant="standard"
          borderRadius="25px"
          enableHover={false}
          className="glass-fade-in my-2 max-w-[255px] flex items-center"
        >
          <div className="relative group">
            <Avatar
              className="ml-1 cursor-pointer self-center w-6 h-6"
              onClick={onAvatarClick}
              title={userName}
            >
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback>👤</AvatarFallback>
            </Avatar>
            {/* Custom tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none shadow-md">
              {userName}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover" />
            </div>
          </div>
          <p className="py-2 px-4">{message.text}</p>
        </Glass>
        <span className="text-[10px] text-muted-foreground self-center">{time}</span>
      </div>
    );
  },
  // Custom comparison function to prevent re-renders when props haven't changed
  (prevProps, nextProps) => {
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.text === nextProps.message.text &&
      prevProps.message.timestamp === nextProps.message.timestamp &&
      prevProps.isOwnMessage === nextProps.isOwnMessage &&
      prevProps.avatarUrl === nextProps.avatarUrl &&
      prevProps.userName === nextProps.userName
    );
  }
);

MessageItem.displayName = "MessageItem";

export default MessageItem;
