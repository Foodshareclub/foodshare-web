'use client';

import React, { useState } from "react";

import { GlassDialogContent } from "@/components/Glass";
import { GlassButton } from "@/components/Glass";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function VolunteerInfoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  const initialRef = React.useRef(null);
  const finalRef = React.useRef(null);

  const [value, setValue] = useState("");

  const handleInputChange = (value: React.SetStateAction<string>) => setValue(value);

  return (
    <>
      <GlassButton
        variant="accentOrange"
        className="items-center mt-6 text-[22px] w-full md:w-1/2"
        onClick={onOpen}
      >
        "Get Started"
      </GlassButton>
      <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
        <GlassDialogContent>
          <DialogHeader>
            <DialogTitle>Enter Volunteer Info</DialogTitle>
          </DialogHeader>

          <div className="pb-6">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input ref={initialRef} placeholder="Full Name" />
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium">Email Address</label>
              <Input placeholder="Email Address" />
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium">Phone Number</label>
              <Input placeholder="Phone Number" />
            </div>

            <div className="flex gap-4">
              <div className="mt-4 flex-1">
                <label className="text-sm font-medium">Vehicle Make</label>
                <Input placeholder="Honda" />
              </div>

              <div className="mt-4 flex-1">
                <label className="text-sm font-medium">Vehicle Model</label>
                <Input placeholder="Civic" />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium">Vehicle Model</label>
              <textarea
                value={value}
                onChange={(e) => handleInputChange(e.currentTarget.value)}
                placeholder="Enter..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>

          <DialogFooter>
            <GlassButton variant="accentOrange" className="w-full" onClick={onClose}>
              Submit
            </GlassButton>
          </DialogFooter>
        </GlassDialogContent>
      </Dialog>
    </>
  );
}

export default VolunteerInfoModal;
