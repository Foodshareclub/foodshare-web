"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone } from "lucide-react";
import type React from "react";
import { useState } from "react";

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
    <div className="flex justify-between items-start gap-4 rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl p-6 shadow-xs hover:shadow-md transition-all mb-4">
      <div className="w-full max-w-screen-lg">
        <h2 className="text-base font-semibold text-foreground">Phone number</h2>
        {edit ? (
          <>
            <div className="flex justify-between mt-3">
              <div className="relative w-full max-w-md">
                <div className="absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Phone className="size-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <Input
                  type="tel"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.currentTarget.value)}
                  className="ps-10 h-11 rounded-xl border border-border/80 bg-background/80 focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm transition-all"
                />
              </div>
            </div>
            <Button
              onClick={handleSave}
              className="mt-4 h-10 px-5 rounded-xl bg-brand hover:bg-brand-hover active:scale-95 text-white font-semibold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              Save
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">
            {phone ? phone : "Add a number so confirmed users can get your products."}
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className={`rounded-full text-xs font-semibold px-4 border border-border/80 hover:bg-muted/60 transition-all cursor-pointer shrink-0 ${
          disablePhoneEdit ? "opacity-50 pointer-events-none" : "opacity-100"
        }`}
        onClick={toggleEditMode}
      >
        {edit ? "Cancel" : "Edit"}
      </Button>
    </div>
  );
};
