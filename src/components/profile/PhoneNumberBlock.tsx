'use client';

import React, { useState } from "react";
import { PhoneIcon } from "@/utils/icons";
import { Glass, GlassButton } from "@/components/Glass";
import { Input } from "@/components/ui/input";

type PhoneNumberBlockType = {
  phone: string;
  setPhone: (newNumber: string) => void;
  onSaveHandler: () => void;
  a: boolean;
  b: boolean;
  d: boolean;
  c: boolean;
  setA: (value: boolean) => void;
  setB: (value: boolean) => void;
  setD: (value: boolean) => void;
};

export const PhoneNumberBlock: React.FC<PhoneNumberBlockType> = ({
  a,
  b,
  d,
  c,
  setD,
  setB,
  setA,
  onSaveHandler,
  setPhone,
  phone,
}) => {
  const [edit, setEdit] = useState(false);

  return (
    <Glass variant="standard" className="p-4 mb-4">
      <div className="flex">
        <div className="w-full max-w-screen-lg">
          <h2 className="text-2xl font-medium pb-2 text-left text-foreground">
            Phone number
          </h2>
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
              <GlassButton
                variant="accentGreen"
                onClick={() => {
                  onSaveHandler();
                  setA(!a);
                  setD(!d);
                  setB(!b);
                  setEdit(!edit);
                }}
                className="my-3"
              >
                Save
              </GlassButton>
            </>
          ) : (
            <p className="text-foreground">
              Add a number so confirmed users can get your products.
            </p>
          )}
        </div>
        <GlassButton
          variant="standard"
          className={`self-start ${c ? "opacity-50 pointer-events-none" : "opacity-100"}`}
          onClick={() => {
            setA(!a);
            setD(!d);
            setB(!b);
            setEdit(!edit);
          }}
        >
          {edit ? "Cancel" : "Edit"}
        </GlassButton>
      </div>
    </Glass>
  );
};
