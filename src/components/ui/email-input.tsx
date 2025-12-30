"use client";

import React, { useState, useCallback, useRef } from "react";
import { X, Mail, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidEmail } from "@/lib/validators/email";

interface EmailInputProps {
  emails: string[];
  onEmailsChange: (emails: string[]) => void;
  maxEmails?: number;
  placeholder?: string;
  disabled?: boolean;
}

export const EmailInput: React.FC<EmailInputProps> = ({
  emails,
  onEmailsChange,
  maxEmails = 20,
  placeholder = "Add people...",
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addEmails = useCallback(
    (newEmails: string[]) => {
      const validEmails: string[] = [];
      let hasInvalid = false;
      let duplicateCount = 0;

      newEmails.forEach((email) => {
        const trimmed = email.trim();
        if (!trimmed) return;

        if (!isValidEmail(trimmed)) {
          hasInvalid = true;
          return;
        }

        if (emails.includes(trimmed)) {
          duplicateCount++;
          return;
        }

        validEmails.push(trimmed);
      });

      if (hasInvalid) {
        setError("Invalid email address");
      } else if (duplicateCount > 0 && validEmails.length === 0) {
        setError("Email already added");
      } else {
        setError(null);
      }

      if (validEmails.length > 0) {
        const remainingSlots = maxEmails - emails.length;
        if (remainingSlots <= 0) {
          setError(`Max ${maxEmails} emails allowed`);
          return;
        }

        const toAdd = validEmails.slice(0, remainingSlots);
        onEmailsChange([...emails, ...toAdd]);
      }
    },
    [emails, onEmailsChange, maxEmails]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      setError(null);

      if (["Enter", ",", " ", "Tab"].includes(e.key)) {
        e.preventDefault();
        if (inputValue.trim()) {
          addEmails([inputValue]);
          setInputValue("");
        }
      } else if (e.key === "Backspace" && !inputValue && emails.length > 0) {
        onEmailsChange(emails.slice(0, -1));
      }
    },
    [inputValue, addEmails, emails, onEmailsChange, disabled]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (disabled) return;

      const pastedData = e.clipboardData.getData("text");
      const pastedEmails = pastedData.split(/[\s,;]+/).filter(Boolean);

      addEmails(pastedEmails);
      setInputValue("");
    },
    [addEmails, disabled]
  );

  const removeEmail = (emailToRemove: string) => {
    if (disabled) return;
    onEmailsChange(emails.filter((e) => e !== emailToRemove));
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex flex-wrap gap-2 p-2 min-h-[44px] rounded-lg transition-all",
          "glass-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          error ? "border-red-500 focus-within:ring-red-500/50" : "",
          disabled && "opacity-60 cursor-not-allowed"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {emails.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium animate-in zoom-in duration-200"
          >
            <Mail className="w-3.5 h-3.5" />
            {email}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeEmail(email);
              }}
              className="hover:text-destructive transition-colors ml-0.5"
              disabled={disabled}
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Remove {email}</span>
            </button>
          </span>
        ))}
        {emails.length < maxEmails && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={() => {
              if (inputValue.trim()) {
                addEmails([inputValue]);
                setInputValue("");
              }
            }}
            placeholder={emails.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground ml-1"
            disabled={disabled}
            autoComplete="email"
          />
        )}
      </div>

      <div className="flex justify-between items-center text-xs px-1">
        <div className="flex items-center text-destructive h-4">
          {error && (
            <span className="flex items-center gap-1 animate-in slide-in-from-left-2 fade-in duration-300">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </span>
          )}
        </div>
        <div className="text-muted-foreground">
          {emails.length}/{maxEmails}
        </div>
      </div>
    </div>
  );
};
