"use client";

import * as React from "react";
import { useState } from "react";
import { DragHandleIcon } from "@/utils/icons";

import type { ProfileSettingsProps } from "@/components/header/navbar/types";
import { AuthenticationUserModal, MinifiedUserInfo, UniversalDrawer } from "@/components";
import { Button } from "@/components/ui/button";
import { ThemeToggleInline } from "@/components/theme/ThemeToggle";

export default function NawDrawer({
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
}: ProfileSettingsProps) {
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
                <div
                  className="glass-subtle rounded-xl p-4 cursor-pointer gpu"
                  onClick={() => {
                    onClose();
                    navigateToMyLists();
                  }}
                >
                  <p className="text-3xl">&quot;My listing&apos;s&quot;</p>
                </div>
                <div
                  className="glass-subtle rounded-xl p-4 cursor-pointer gpu"
                  onClick={() => {
                    onClose();
                    navigateToAccSettings();
                  }}
                >
                  <p className="text-3xl">&quot;Account settings&quot;</p>
                </div>

                <div
                  className={`${signalOfNewMessage.length ? "glass-accent-primary" : "glass-subtle"} rounded-xl p-4 cursor-pointer gpu`}
                  onClick={() => {
                    onClose();
                    navigateToMyMessages();
                  }}
                >
                  <p className="text-3xl">
                    {signalOfNewMessage.length
                      ? `"You have ${signalOfNewMessage.length} unanswered messages"`
                      : `"My messages"`}
                  </p>
                </div>

                <div
                  className="glass-subtle rounded-xl p-4 cursor-pointer gpu"
                  onClick={() => {
                    onClose();
                    navigateToLogout();
                  }}
                >
                  <p className="text-3xl">&quot;Log Out&quot;</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <AuthenticationUserModal buttonValue="Login" fullScreen={false} />
                <AuthenticationUserModal buttonValue="Registration" fullScreen={false} />
              </div>
            )}
            <div
              className="glass-subtle rounded-xl p-4 cursor-pointer gpu mt-3"
              onClick={() => {
                onClose();
                navigateToAboutUs();
              }}
            >
              <p className="text-3xl">&quot;About Us&quot;</p>
            </div>
            <div
              className="glass-subtle rounded-xl p-4 cursor-pointer gpu mt-3"
              onClick={() => navigateToHelp()}
            >
              <p className="text-3xl">&quot;Help&quot;</p>
            </div>

            {/* Theme Switcher */}
            <div className="mt-6 pt-4 border-t border-border/30">
              <p className="text-sm text-muted-foreground mb-3 font-medium">
                &quot;Appearance&quot;
              </p>
              <ThemeToggleInline />
            </div>
          </div>
        </>
      </UniversalDrawer>
    </div>
  );
}
