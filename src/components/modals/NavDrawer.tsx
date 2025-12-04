'use client';

import * as React from "react";
import { memo, useState } from "react";
import { DragHandleIcon } from "@/utils/icons";

import type { ProfileSettingsProps } from "@/components/header/navbar/types";
import { AuthenticationUserModal, MinifiedUserInfo, UniversalDrawer } from "@/components";
import { Glass } from "@/components/Glass";
import { Button } from "@/components/ui/button";
import { ThemeToggleInline } from "@/components/ui/theme-toggle";

const NawDrawer: React.FC<ProfileSettingsProps> = memo(
  ({
    firstName,
    secondName,
    email,
    size,
    isAuth,
    imgUrl,
    navigateToHelp,
    navigateToLogout,
    navigateToMyLists,
    navigateToAboutUs,
    navigateToAccSettings,
    navigateToMyMessages,
    signalOfNewMessage,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const onOpen = () => setIsOpen(true);
    const onClose = () => setIsOpen(false);
    const handleClick = () => onOpen();

    return (
      <div className="self-center">
        {signalOfNewMessage.length ? (
          <Button onClick={handleClick} variant="ghost" className="relative" aria-label="See menu">
            <DragHandleIcon />
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-300 border-2 border-white rounded-full" />
          </Button>
        ) : (
          <Button onClick={handleClick} variant="ghost" aria-label="See menu">
            <DragHandleIcon />
          </Button>
        )}
        <UniversalDrawer
          size={size}
          onClose={onClose}
          isOpen={isOpen}
          headerValue={`Hi ${firstName ? firstName : "friend"}`}
          placement={"end"}
        >
          <>
            <MinifiedUserInfo
              src={imgUrl}
              firstName={firstName}
              secondName={secondName}
              description={email}
            />
            <div className="mt-10">
              {isAuth ? (
                <div className="flex flex-col gap-3">
                  <Glass
                    variant="subtle"
                    borderRadius="12px"
                    padding="16px"
                    className="cursor-pointer glass-accelerated"
                    onClick={() => {
                      onClose();
                      navigateToMyLists();
                    }}
                  >
                    <p className="text-3xl">
                      "My listing's"
                    </p>
                  </Glass>
                  <Glass
                    variant="subtle"
                    borderRadius="12px"
                    padding="16px"
                    className="cursor-pointer glass-accelerated"
                    onClick={() => {
                      onClose();
                      navigateToAccSettings();
                    }}
                  >
                    <p className="text-3xl">
                      "Account settings"
                    </p>
                  </Glass>

                  <Glass
                    variant={signalOfNewMessage.length ? "accentGreen" : "subtle"}
                    borderRadius="12px"
                    padding="16px"
                    className="cursor-pointer glass-accelerated"
                    onClick={() => {
                      onClose();
                      navigateToMyMessages();
                    }}
                  >
                    <p className="text-3xl">
                      {signalOfNewMessage.length ? (
                        "You have {signalOfNewMessage.length} unanswered messages"
                      ) : (
                        "My messages"
                      )}
                    </p>
                  </Glass>

                  <Glass
                    variant="subtle"
                    borderRadius="12px"
                    padding="16px"
                    className="cursor-pointer glass-accelerated"
                    onClick={() => {
                      onClose();
                      navigateToLogout();
                    }}
                  >
                    <p className="text-3xl">
                      "Log Out"
                    </p>
                  </Glass>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <AuthenticationUserModal buttonValue="Login" fullScreen={false} />
                  <AuthenticationUserModal
                    buttonValue="Registration"
                    fullScreen={false}
                  />
                </div>
              )}
              <Glass
                variant="subtle"
                borderRadius="12px"
                padding="16px"
                className="cursor-pointer glass-accelerated mt-3"
                onClick={() => {
                  onClose();
                  navigateToAboutUs();
                }}
              >
                <p className="text-3xl">
                  "About Us"
                </p>
              </Glass>
              <Glass
                variant="subtle"
                borderRadius="12px"
                padding="16px"
                className="cursor-pointer glass-accelerated mt-3"
                onClick={() => navigateToHelp()}
              >
                <p className="text-3xl">
                  "Help"
                </p>
              </Glass>

              {/* Theme Switcher */}
              <div className="mt-6 pt-4 border-t border-border/30">
                <p className="text-sm text-muted-foreground mb-3 font-medium">
                  "Appearance"
                </p>
                <ThemeToggleInline />
              </div>
            </div>
          </>
        </UniversalDrawer>
      </div>
    );
  }
);

NawDrawer.displayName = "NawDrawer";

export default NawDrawer;
