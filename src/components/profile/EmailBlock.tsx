"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type React from "react";
import { useState } from "react";

interface EmailBlockProps {
  email: string;
  setEmail: (newEmail: string) => void;
  onSaveHandler: () => void;
  /** Whether the email edit button should be disabled (another field is being edited) */
  disableEmailEdit: boolean;
  /** Current state of name edit disable flag */
  disableNameEdit: boolean;
  /** Current state of phone edit disable flag */
  disablePhoneEdit: boolean;
  /** Current state of address edit disable flag */
  disableAddressEdit: boolean;
  /** Toggle name edit disable state */
  setDisableNameEdit: (value: boolean) => void;
  /** Toggle phone edit disable state */
  setDisablePhoneEdit: (value: boolean) => void;
  /** Toggle address edit disable state */
  setDisableAddressEdit: (value: boolean) => void;
}

export const EmailBlock: React.FC<EmailBlockProps> = ({
  email,
  setEmail,
  onSaveHandler,
  disableEmailEdit,
  disableNameEdit,
  disablePhoneEdit,
  disableAddressEdit,
  setDisableNameEdit,
  setDisablePhoneEdit,
  setDisableAddressEdit,
}) => {
  const [edit, setEdit] = useState(false);

  const toggleEditMode = () => {
    // Toggle edit mode and disable/enable other blocks
    setDisableNameEdit(!disableNameEdit);
    setDisablePhoneEdit(!disablePhoneEdit);
    setDisableAddressEdit(!disableAddressEdit);
    setEdit(!edit);
  };

  const handleSave = () => {
    onSaveHandler();
    toggleEditMode();
  };

  return (
    <div className="flex justify-between items-start gap-4 rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl p-6 shadow-xs hover:shadow-md transition-all mb-4">
      <div className="w-full max-w-screen-lg">
        <h2 className="text-base font-semibold text-foreground">Email address</h2>
        {edit ? (
          <>
            <div className="flex justify-between mt-3">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                className="h-11 rounded-xl border border-border/80 bg-background/80 focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm px-4 transition-all"
              />
            </div>
            <Button
              onClick={handleSave}
              className="mt-4 h-10 px-5 rounded-xl bg-brand hover:bg-brand-hover active:scale-95 text-white font-semibold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              Save
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">{email}</p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full text-xs font-semibold px-4 border border-border/80 hover:bg-muted/60 transition-all cursor-pointer shrink-0"
        disabled={disableEmailEdit}
        onClick={toggleEditMode}
      >
        {edit ? "Cancel" : "Edit"}
      </Button>
    </div>
  );
};
