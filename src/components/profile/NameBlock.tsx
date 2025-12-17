"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface NameBlockProps {
  firstName: string;
  setFirstName: (firstName: string) => void;
  secondName: string;
  setSecondName: (secondName: string) => void;
  onSaveHandler: () => void;
  /** Whether the name edit button should be disabled (another field is being edited) */
  disableNameEdit: boolean;
  /** Current state of email edit disable flag */
  disableEmailEdit: boolean;
  /** Current state of phone edit disable flag */
  disablePhoneEdit: boolean;
  /** Current state of address edit disable flag */
  disableAddressEdit: boolean;
  /** Toggle email edit disable state */
  setDisableEmailEdit: (value: boolean) => void;
  /** Toggle phone edit disable state */
  setDisablePhoneEdit: (value: boolean) => void;
  /** Toggle address edit disable state */
  setDisableAddressEdit: (value: boolean) => void;
}

export const NameBlock: React.FC<NameBlockProps> = ({
  firstName,
  setFirstName,
  secondName,
  setSecondName,
  onSaveHandler,
  disableNameEdit,
  disableEmailEdit,
  disablePhoneEdit,
  disableAddressEdit,
  setDisableEmailEdit,
  setDisablePhoneEdit,
  setDisableAddressEdit,
}) => {
  const [edit, setEdit] = useState(false);

  const toggleEditMode = () => {
    // Toggle edit mode and disable/enable other blocks
    setDisableEmailEdit(!disableEmailEdit);
    setDisablePhoneEdit(!disablePhoneEdit);
    setDisableAddressEdit(!disableAddressEdit);
    setEdit(!edit);
  };

  const handleSave = () => {
    onSaveHandler();
    toggleEditMode();
  };

  return (
    <div className="glass-subtle flex border-b border-white/20 rounded-xl p-4 mb-3 animate-fade-in">
      <div className="w-full max-w-screen-lg">
        <h2 className="text-2xl font-medium pb-2 text-foreground">Name</h2>
        {edit ? (
          <>
            <div className="flex justify-between gap-4">
              <Input
                variant="glass"
                value={firstName}
                onChange={(e) => setFirstName(e.currentTarget.value)}
              />
              <Input
                variant="glass"
                value={secondName}
                onChange={(e) => setSecondName(e.currentTarget.value)}
              />
            </div>
            <Button variant="ghost" onClick={handleSave} className="my-3">
              Save
            </Button>
          </>
        ) : (
          <p className="text-foreground">
            {firstName} {secondName}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        className="self-start cursor-pointer"
        disabled={disableNameEdit}
        onClick={toggleEditMode}
      >
        {edit ? "Cancel" : "Edit"}
      </Button>
    </div>
  );
};
