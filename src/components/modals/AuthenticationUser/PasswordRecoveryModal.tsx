'use client';

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ViewIcon, ViewOffIcon } from "@/utils/icons";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * PasswordRecoveryModal Component (AuthenticationUser variant)
 * Modal for setting a new password after password recovery
 * Uses direct Supabase call instead of Redux
 */
export const PasswordRecoveryModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [show, setShow] = useState(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showPass = () => setShow(true);
  const hidePass = () => setShow(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsOpen(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const createPasswordHandler = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setIsOpen(false);
      setPassword("");
    } catch (error) {
      console.error("Error updating password:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="glass glass-transition rounded-2xl glass-scale-in gpu"
        onInteractOutside={(e: Event) => e.preventDefault()}
        onEscapeKeyDown={(e: KeyboardEvent) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Create new password</DialogTitle>
        </DialogHeader>
        <div className="py-6">
          <div className="relative">
            <Input
              variant="glass"
              onChange={(e) => setPassword(e.currentTarget.value)}
              value={password}
              placeholder="Password"
              type={show ? "text" : "password"}
              className="pr-16"
            />
            <div className="absolute right-0 top-0 h-full flex items-center pr-3">
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
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
            disabled={!password || isSubmitting}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
