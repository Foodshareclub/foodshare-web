"use client";

/**
 * NewsletterSubscribe - Public newsletter subscription widget
 * Can be embedded in footer, homepage, or standalone page
 */

import { useState, useTransition } from "react";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addSubscriber } from "@/app/actions/newsletter";

interface NewsletterSubscribeProps {
  variant?: "default" | "compact" | "card";
  className?: string;
}

export function NewsletterSubscribe({ variant = "default", className }: NewsletterSubscribeProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    startTransition(async () => {
      const result = await addSubscriber(email, undefined, "website");
      if (result.success) {
        setStatus("success");
        setMessage("Thanks for subscribing!");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(result.error || "Something went wrong");
      }
      setTimeout(() => setStatus("idle"), 5000);
    });
  };

  if (variant === "compact") {
    return (
      <form onSubmit={handleSubmit} className={cn("flex gap-2", className)}>
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-9"
          disabled={isPending || status === "success"}
        />
        <Button type="submit" size="sm" disabled={isPending || status === "success"}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            "Subscribe"
          )}
        </Button>
      </form>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 to-primary/10 p-6",
          className
        )}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Stay Updated</h3>
            <p className="text-sm text-muted-foreground">Get weekly food sharing tips</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending || status === "success"}
          />
          <Button type="submit" className="w-full" disabled={isPending || status === "success"}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Subscribing...
              </>
            ) : status === "success" ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Subscribed!
              </>
            ) : (
              "Subscribe to Newsletter"
            )}
          </Button>
          {status !== "idle" && (
            <p
              className={cn(
                "text-sm text-center",
                status === "success" ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {message}
            </p>
          )}
        </form>
        <p className="text-xs text-muted-foreground text-center mt-3">
          No spam, unsubscribe anytime
        </p>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("space-y-4", className)}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-1">Join Our Community</h3>
        <p className="text-sm text-muted-foreground">
          Get updates on food sharing opportunities near you
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
          disabled={isPending || status === "success"}
        />
        <Button type="submit" disabled={isPending || status === "success"}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === "success" ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Done!
            </>
          ) : (
            "Subscribe"
          )}
        </Button>
      </form>
      {status !== "idle" && (
        <p
          className={cn(
            "text-sm text-center",
            status === "success" ? "text-emerald-600" : "text-rose-600"
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
