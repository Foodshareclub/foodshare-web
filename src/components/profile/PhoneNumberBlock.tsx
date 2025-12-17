"use client";

import React, { useState } from "react";
import { PhoneIcon } from "@/utils/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PhoneNumberBlockProps {
  phone: string;
  setPhone: (newNumber: string) => void;
  onSaveHandler: () => void;
  /** Whether the phone edit button should be disabled (another field is being edited) */
  disablePhoneEdit: boolean;
  /** Current state of name edit disable flag */
  disableNameEdit: boolean;
  /** Current state of email edit disable flag */
  disableEmailEdit: boolean;
  /** Current state of address edit disable flag */
  disableAddressEdit: boolean;
  /** Toggle name edit disable state */
  setDisableNameEdit: (value: boolean) => void;
  /** Toggle email edit disable state */
  setDisableEmailEdit: (value: boolean) => void;
  /** Toggle address edit disable state */
  setDisableAddressEdit: (value: boolean) => void;
}

export const PhoneNumberBlock: React.FC<PhoneNumberBlockProps> = ({
  phone,
  setPhone,
  onSaveHandler,
  disablePhoneEdit,
  disableNameEdit,
  disableEmailEdit,
  disableAddressEdit,
  setDisableNameEdit,
  setDisableEmailEdit,
  setDisableAddressEdit,
}) => {
  const [edit, setEdit] = useState(false);

  const toggleEditMode = () => {
    // Toggle edit mode and disable/enable other blocks
    setDisableNameEdit(!disableNameEdit);
    setDisableEmailEdit(!disableEmailEdit);
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
          <h2 className="text-2xl font-medium pb-2 text-left text-foreground">Phone number</h2>
          {edit ? (
            <>
              <div className="flex justify-between">
                <div className="relative w-full">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <PhoneIcon className="text-muted-foreground" />
                  </div>
                  <Input
                    variant="glass"
                    type="tel"
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.currentTarget.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="glass-accent" onClick={handleSave} className="my-3">
                Save
              </Button>
            </>
          ) : (
            <p className="text-foreground">
              Add a number so confirmed users can get your products.
            </p>
          )}
        </div>
        <Button
          variant="glass"
          className={`self-start ${disablePhoneEdit ? "opacity-50 pointer-events-none" : "opacity-100"}`}
          onClick={toggleEditMode}
        >
          {edit ? "Cancel" : "Edit"}
        </Button>
      </div>
    </div>
  );
};
