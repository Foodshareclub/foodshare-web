'use client';

import { useState } from "react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProfileSettingsProps } from "@/components/header/navbar/types";
import { AuthenticationUserModal } from "@/components";

export default function ProfileSettings({
  signalOfNewMessage,
  navigateToMyLists,
  navigateToHelp,
  navigateToLogout,
  navigateToAccSettings,
  navigateToAboutUs,
  navigateToMyMessages,
  imgUrl,
  isAuth,
}: ProfileSettingsProps) {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    return (
      <>
        <div className="self-center p-0 text-foreground">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {signalOfNewMessage.length ? (
                <div
                  className={cn(
                    "cursor-pointer rounded-full h-[42px] w-[42px] relative",
                    "after:content-[''] after:w-4 after:h-4 after:bg-green-300",
                    "after:border-2 after:border-background after:rounded-full",
                    "after:absolute after:bottom-0 after:right-0"
                  )}
                >
                  <Avatar className="h-[42px] w-[42px]">
                    {imgUrl && <AvatarImage src={imgUrl} />}
                    {!imgUrl && <AvatarFallback />}
                  </Avatar>
                </div>
              ) : (
                <div className="cursor-pointer rounded-full">
                  <Avatar>
                    {imgUrl && <AvatarImage src={imgUrl} />}
                    {!imgUrl && <AvatarFallback />}
                  </Avatar>
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent variant="glass" className="rounded-xl">
              {isAuth ? (
                <>
                  <DropdownMenuItem onClick={() => navigateToMyLists()}>
                    "My listing's"
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigateToMyMessages()}>
                    {signalOfNewMessage.length ? (
                      "You have {signalOfNewMessage.length} unanswered messages"
                    ) : (
                      "My messages"
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigateToAccSettings()}>
                    "Account settings"
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigateToLogout()}>
                    "Log Out"
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => setIsLoginOpen(true)}
                  >
                    "Login"
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsRegisterOpen(true)}
                  >
                    "Registration"
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuItem onClick={() => navigateToHelp()}>
                "Help"
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateToAboutUs()}>
                "About Foodshare"
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Auth Modals - Rendered outside menu */}
        <AuthenticationUserModal
          buttonValue="Login"
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
        />
        <AuthenticationUserModal
          buttonValue="Registration"
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
        />
      </>
    );
}
