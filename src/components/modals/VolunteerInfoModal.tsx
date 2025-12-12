"use client";

import React, { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      <Button
        variant="glass"
        className="items-center mt-6 text-[22px] w-full md:w-1/2 glass-accent-orange"
        onClick={onOpen}
      >
        &quot;Get Started&quot;
      </Button>
      <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
        <DialogContent variant="glass">
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
            <Button variant="glass" className="w-full glass-accent-orange" onClick={onClose}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default VolunteerInfoModal;
