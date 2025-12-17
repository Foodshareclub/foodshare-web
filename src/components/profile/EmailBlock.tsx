"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="glass rounded-xl p-4 mb-4">
      <div className="flex">
        <div className="w-full max-w-screen-lg">
          <h2 className="text-2xl font-medium pb-2 text-left text-foreground">Email address</h2>
          {edit ? (
            <>
              <div className="flex justify-between">
                <Input
                  variant="glass"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
              </div>
              <Button variant="glass-accent" onClick={handleSave} className="my-3">
                Save
              </Button>
            </>
          ) : (
            <p className="text-foreground">{email}</p>
          )}
        </div>
        <Button
          variant="glass"
          className="self-start"
          disabled={disableEmailEdit}
          onClick={toggleEditMode}
        >
          {edit ? "Cancel" : "Edit"}
        </Button>
      </div>
    </div>
  );
};
