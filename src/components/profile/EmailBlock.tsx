'use client';

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
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
    <div className="glass rounded-xl p-4 mb-4">
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
              <Button variant="glass-accent" onClick={onSaveHandler} className="my-3">
                Save
              </Button>
            </>
          ) : (
            <p className="text-foreground">{email}</p>
          )}
        </div>
        {/*<Button*/}
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
        {/*</Button>*/}
      </div>
    </div>
  );
};
