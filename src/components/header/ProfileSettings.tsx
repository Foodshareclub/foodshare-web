"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, MessageSquare, Settings, LogOut, HelpCircle, Info, List } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DEFAULT_AVATAR_URL } from "@/constants/storage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  const router = useRouter();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const navigateToMyPosts = () => {
    router.push("/my-posts");
  };

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
                  <AvatarImage src={imgUrl?.trim() || DEFAULT_AVATAR_URL} />
                  <AvatarFallback>🍓</AvatarFallback>
                </Avatar>
              </div>
            ) : (
              <div className="cursor-pointer rounded-full">
                <Avatar>
                  <AvatarImage src={imgUrl?.trim() || DEFAULT_AVATAR_URL} />
                  <AvatarFallback>🍓</AvatarFallback>
                </Avatar>
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent variant="glass" className="rounded-xl w-56">
            {isAuth ? (
              <>
                <DropdownMenuItem onClick={navigateToMyPosts} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  My Posts
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigateToMyLists()}
                  className="gap-2 cursor-pointer"
                >
                  <List className="h-4 w-4" />
                  My Listings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigateToMyMessages()}
                  className="gap-2 cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" />
                  {signalOfNewMessage.length ? (
                    <span className="flex items-center gap-2">
                      Messages
                      <span className="bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {signalOfNewMessage.length}
                      </span>
                    </span>
                  ) : (
                    "Messages"
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigateToAccSettings()}
                  className="gap-2 cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigateToLogout()}
                  className="gap-2 cursor-pointer text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={() => setIsLoginOpen(true)} className="cursor-pointer">
                  Login
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsRegisterOpen(true)}
                  className="cursor-pointer"
                >
                  Registration
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigateToHelp()} className="gap-2 cursor-pointer">
              <HelpCircle className="h-4 w-4" />
              Help
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigateToAboutUs()} className="gap-2 cursor-pointer">
              <Info className="h-4 w-4" />
              About FoodShare
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
