"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Check, Link2, Mail, MessageCircle, Share2 } from "lucide-react";
import { useCallback, useState } from "react";

// Social media brand icons as simple SVG components
const TwitterXIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  className?: string;
  variant?: "icon" | "default";
  defaultOpen?: boolean;
}

export function ShareButton({
  url,
  title,
  description,
  className,
  variant = "icon",
  defaultOpen = false,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const handleNativeShare = useCallback(async () => {
    if (canNativeShare) {
      try {
        await navigator.share({
          title,
          text: description || title,
          url,
        });
      } catch {
        // User cancelled or error - fall through to dropdown
      }
    }
  }, [canNativeShare, title, description, url]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 1500);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 1500);
    }
  }, [url]);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description || title}\n\n${url}`)}`,
  };

  const openShareLink = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], "_blank", "noopener,noreferrer,width=600,height=400");
    setIsOpen(false);
  };

  // Always show dropdown to ensure copy link is accessible on all devices
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={variant === "icon" ? "icon" : "default"}
          className={cn(
            variant === "icon"
              ? "size-9 sm:size-10 rounded-full"
              : "h-10 px-4 rounded-full text-xs sm:text-sm font-semibold gap-2",
            "border-border/80 bg-background/80 hover:bg-muted/60 hover:border-foreground/30 text-foreground",
            "shadow-2xs hover:shadow-xs active:scale-95 transition-all duration-200",
            className,
          )}
          aria-label="Share this listing"
        >
          <Share2 className={cn(variant === "icon" ? "size-4 sm:size-4.5" : "size-4")} />
          {variant === "default" && <span>Share</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 rounded-2xl border-border/80 bg-background/95 backdrop-blur-2xl shadow-xl p-2"
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2.5 py-1.5">
          Share this listing
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />

        {/* Copy Link */}
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleCopyLink();
          }}
          className="cursor-pointer gap-3 rounded-xl p-2 focus:bg-muted/60 transition-colors"
        >
          {copied ? (
            <>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Check className="size-4" />
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Link copied!</span>
            </>
          ) : (
            <>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/80 text-foreground">
                <Link2 className="size-4" />
              </div>
              <span className="text-xs font-medium text-foreground">Copy link</span>
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        {/* WhatsApp */}
        <DropdownMenuItem
          onClick={() => openShareLink("whatsapp")}
          className="cursor-pointer gap-3 rounded-xl p-2 focus:bg-muted/60 transition-colors"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
            <WhatsAppIcon className="size-4" />
          </div>
          <span className="text-xs font-medium text-foreground">WhatsApp</span>
        </DropdownMenuItem>

        {/* Telegram */}
        <DropdownMenuItem
          onClick={() => openShareLink("telegram")}
          className="cursor-pointer gap-3 rounded-xl p-2 focus:bg-muted/60 transition-colors"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0088cc]/10 text-[#0088cc]">
            <TelegramIcon className="size-4" />
          </div>
          <span className="text-xs font-medium text-foreground">Telegram</span>
        </DropdownMenuItem>

        {/* Twitter/X */}
        <DropdownMenuItem
          onClick={() => openShareLink("twitter")}
          className="cursor-pointer gap-3 rounded-xl p-2 focus:bg-muted/60 transition-colors"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/80 text-foreground">
            <TwitterXIcon className="size-4" />
          </div>
          <span className="text-xs font-medium text-foreground">X (Twitter)</span>
        </DropdownMenuItem>

        {/* Facebook */}
        <DropdownMenuItem
          onClick={() => openShareLink("facebook")}
          className="cursor-pointer gap-3 rounded-xl p-2 focus:bg-muted/60 transition-colors"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1877F2]/10 text-[#1877F2]">
            <FacebookIcon className="size-4" />
          </div>
          <span className="text-xs font-medium text-foreground">Facebook</span>
        </DropdownMenuItem>

        {/* Email */}
        <DropdownMenuItem
          onClick={() => openShareLink("email")}
          className="cursor-pointer gap-3 rounded-xl p-2 focus:bg-muted/60 transition-colors"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Mail className="size-4" />
          </div>
          <span className="text-xs font-medium text-foreground">Email</span>
        </DropdownMenuItem>

        {/* Native share option for supported browsers */}
        {canNativeShare && (
          <>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={handleNativeShare}
              className="cursor-pointer gap-3 rounded-xl p-2 focus:bg-muted/60 transition-colors"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageCircle className="size-4" />
              </div>
              <span className="text-xs font-medium text-foreground">More options...</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ShareButton;
