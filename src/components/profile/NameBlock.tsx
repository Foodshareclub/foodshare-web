'use client';

import React, { useState } from "react";
import { Glass } from "@/components/Glass";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type NameBlockType = {
  firstName: string;
  setFirstName: (firstName: string) => void;
  secondName: string;
  setSecondName: (secondName: string) => void;
  onSaveHandler: () => void;
  b: boolean;
  c: boolean;
  d: boolean;
  a: boolean;
  setB: (value: boolean) => void;
  setC: (value: boolean) => void;
  setD: (value: boolean) => void;
};

export const NameBlock: React.FC<NameBlockType> = ({
  setB,
  setC,
  setD,
  a,
  b,
  c,
  d,
  firstName,
  setFirstName,
  secondName,
  setSecondName,
  onSaveHandler,
}) => {
  const [edit, setEdit] = useState(false);

  return (
    <Glass
      variant="subtle"
      className="flex border-b border-solid border-white/20 rounded-xl p-4 mb-3 glass-fade-in"
    >
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
            <Button
              variant="ghost"
              onClick={() => {
                onSaveHandler();
                setEdit(!edit);
                setB(!b);
                setC(!c);
                setD(!d);
              }}
              className="my-3"
            >
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
        disabled={a}
        onClick={() => {
          setB(!b);
          setC(!c);
          setD(!d);
          setEdit(!edit);
        }}
      >
        {edit ? "Cancel" : "Edit"}
      </Button>
    </Glass>
  );
};
