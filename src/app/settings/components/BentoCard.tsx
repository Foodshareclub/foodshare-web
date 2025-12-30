"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Glass } from "@/components/ui/glass";
import { cn } from "@/lib/utils";

interface BentoCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  gradient: string;
  size?: "default" | "large";
}

export function BentoCard({
  icon: Icon,
  title,
  description,
  href,
  gradient,
  size = "default",
}: BentoCardProps) {
  return (
    <Link href={href} className="block">
      <Glass
        variant="subtle"
        hover
        className={cn(
          "group relative overflow-hidden cursor-pointer",
          "hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
          size === "large" ? "p-6 lg:p-8" : "p-5"
        )}
      >
        {/* Animated gradient background on hover */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500",
            gradient
          )}
        />

        {/* Floating particles effect */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative">
          <div
            className={cn(
              "rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
              "transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-xl",
              size === "large" ? "w-14 h-14 mb-4" : "w-12 h-12 mb-3",
              gradient
            )}
          >
            <Icon className={cn("text-white", size === "large" ? "w-6 h-6" : "w-5 h-5")} />
          </div>

          <h3
            className={cn(
              "font-semibold text-foreground mb-1 group-hover:text-primary transition-colors",
              size === "large" ? "text-lg" : "text-base"
            )}
          >
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>

          <div className="mt-3 flex items-center gap-1 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span>Open</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </Glass>
    </Link>
  );
}
