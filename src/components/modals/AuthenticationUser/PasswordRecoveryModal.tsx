"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { ViewIcon, ViewOffIcon } from "@/utils/icons";
import React, { useEffect, useState, useTransition } from "react";

/**
 * PasswordRecoveryModal Component (AuthenticationUser variant)
 * Modal for setting a new password after password recovery
 * Uses direct Supabase call instead of Redux
 */
export const PasswordRecoveryModal = () => {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [show, setShow] = useState(false);
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const showPass = () => setShow(true);
  const hidePass = () => setShow(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsOpen(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const createPasswordHandler = () => {
    startTransition(async () => {
      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setIsOpen(false);
        setPassword("");
      } catch (error) {
        console.error("Error updating password:", error);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        variant="glass"
        className="rounded-3xl border border-border/80 bg-background/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-8 max-w-md"
        onInteractOutside={(e: Event) => e.preventDefault()}
        onEscapeKeyDown={(e: KeyboardEvent) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground text-center">
            {t("Auth.createNewPassword")}
          </DialogTitle>
        </DialogHeader>
        <div className="py-6">
          <div className="relative">
            <Input
              variant="glass"
              onChange={(e) => setPassword(e.currentTarget.value)}
              value={password}
              placeholder="Password"
              type={show ? "text" : "password"}
              className="h-12 rounded-xl border border-border/80 pe-16 bg-background/80 hover:border-foreground/50 focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm px-4 transition-all"
            />
            <div className="absolute end-0 top-0 h-full flex items-center pe-3">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 hover:bg-muted/60 rounded-lg text-muted-foreground hover:text-foreground"
                onMouseDown={showPass}
                onMouseUp={hidePass}
                disabled={!password}
              >
                {show ? <ViewOffIcon /> : <ViewIcon />}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={createPasswordHandler}
            disabled={!password || isPending}
            className="w-full h-11 rounded-xl bg-brand hover:bg-brand-hover active:scale-95 text-white font-semibold text-sm shadow-xs hover:shadow-sm transition-all"
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
