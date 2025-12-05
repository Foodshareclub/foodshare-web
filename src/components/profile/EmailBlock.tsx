'use client';

import React, { useState } from "react";
import { Glass, GlassButton } from "@/components/Glass";
import { Input } from "@/components/ui/input";

type EmailBlockType = {
  email: string;
  setEmail: (newEmail: string) => void;
  onSaveHandler: () => void;
  a: boolean;
  c: boolean;
  d: boolean;
  b: boolean;
  setA: (value: boolean) => void;
  setC: (value: boolean) => void;
  setD: (value: boolean) => void;
};

export const EmailBlock: React.FC<EmailBlockType> = ({
  email,
  onSaveHandler,
  a,
  c,
  d,
  b,
  setD,
  setC,
  setA,
  setEmail,
}) => {
  const [edit, setEdit] = useState(false);

  return (
    <Glass variant="standard" className="p-4 mb-4">
      <div className="flex">
        <div className="w-full max-w-screen-lg">
          <h2 className="text-2xl font-medium pb-2 text-left text-foreground">
            Email address
          </h2>
          {edit ? (
            <>
              <div className="flex justify-between">
                <Input variant="glass" value={email} onChange={(e) => {}} />
              </div>
              <GlassButton variant="accentGreen" onClick={onSaveHandler} className="my-3">
                Save
              </GlassButton>
            </>
          ) : (
            <p className="text-foreground">{email}</p>
          )}
        </div>
        {/*<GlassButton*/}
        {/*    variant="secondary"*/}
        {/*    className="self-start"*/}
        {/*    disabled={b}*/}
        {/*    onClick={() => {*/}
        {/*        setA(!a)*/}
        {/*        setD(!d)*/}
        {/*        setC(!c)*/}
        {/*        setEdit(!edit)*/}
        {/*    }}*/}
        {/*>*/}
        {/*    {edit ? 'Cancel' : 'Edit'}*/}
        {/*</GlassButton>*/}
      </div>
    </Glass>
  );
};
