"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./button";

interface SubmitButtonProps extends Omit<ButtonProps, "type" | "disabled"> {
  /** Text to show while the form is submitting */
  pendingText?: string;
}

/**
 * Submit button that automatically shows loading state via useFormStatus.
 * Must be used inside a <form> with a server action.
 */
export function SubmitButton({
  children,
  pendingText,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      loading={pending}
      loadingText={pendingText}
      {...props}
    >
      {children}
    </Button>
  );
}
