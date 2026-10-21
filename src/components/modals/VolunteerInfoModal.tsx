"use client";

import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function VolunteerInfoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  const initialRef = React.useRef(null);
  const _finalRef = React.useRef(null);

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
              <label htmlFor="volunteer-full-name" className="text-sm font-medium">
                Full Name
              </label>
              <Input id="volunteer-full-name" ref={initialRef} placeholder="Full Name" />
            </div>

            <div className="mt-4">
              <label htmlFor="volunteer-email" className="text-sm font-medium">
                Email Address
              </label>
              <Input id="volunteer-email" placeholder="Email Address" />
            </div>

            <div className="mt-4">
              <label htmlFor="volunteer-phone" className="text-sm font-medium">
                Phone Number
              </label>
              <Input id="volunteer-phone" placeholder="Phone Number" />
            </div>

            <div className="flex gap-4">
              <div className="mt-4 flex-1">
                <label htmlFor="volunteer-make" className="text-sm font-medium">
                  Vehicle Make
                </label>
                <Input id="volunteer-make" placeholder="Honda" />
              </div>

              <div className="mt-4 flex-1">
                <label htmlFor="volunteer-model" className="text-sm font-medium">
                  Vehicle Model
                </label>
                <Input id="volunteer-model" placeholder="Civic" />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="volunteer-vehicle-notes" className="text-sm font-medium">
                Vehicle Model
              </label>
              <textarea
                id="volunteer-vehicle-notes"
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
