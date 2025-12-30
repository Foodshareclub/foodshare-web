"use client";

import Link from "next/link";
import Image from "next/image";
import { Camera } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Glass } from "@/components/ui/glass";

export function UserProfileHeader() {
  // Mock user data - in real app, this would come from props/context
  const user = {
    name: "Food Sharer",
    email: "user@example.com",
    avatarUrl: null as string | null,
    memberSince: "Dec 2024",
  };

  return (
    <Glass variant="prominent" className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Avatar */}
        <div className="relative group">
          <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-background shadow-xl">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <Link
            href="/settings/personal-info"
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Camera className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>

        {/* User info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">{user.name}</h2>
            <Badge variant="secondary" className="text-xs">
              Member
            </Badge>
          </div>
          <p className="text-muted-foreground mb-2">{user.email}</p>
          <p className="text-xs text-muted-foreground">
            Member since {user.memberSince} · <span className="text-emerald-500">Active</span>
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </Glass>
  );
}
