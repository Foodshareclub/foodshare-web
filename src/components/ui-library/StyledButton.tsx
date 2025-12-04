import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StyledButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}

export const StyledButton: React.FC<StyledButtonProps> = ({
  variant = "primary",
  children,
  className,
  ...props
}) => {
  const variantStyles = {
    primary: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
    secondary:
      "bg-background text-foreground border border-border hover:border-foreground hover:shadow-md",
  };

  return (
    <Button
      className={cn(
        "rounded-lg font-medium transition-all duration-200",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
};
