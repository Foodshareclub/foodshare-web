import facebook from "@/assets/facebook23.png";
import feedback from "@/assets/feedbackIcon.svg";
import donat from "@/assets/heartRed23.png";
import instagram from "@/assets/insta23.png";
import linked from "@/assets/linked23.png";
import telegram from "@/assets/telega23.png";
import twitter from "@/assets/twiter23.png";
import { GlassCard } from "@/components/ui/glass-card";
import { OrganicShapes } from "@/components/ui/organic-shapes";
import { PATH } from "@/utils";
import { Heart } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import LanguageSelector from "@/components/languageSelector/LanguageSelector";
import { getTranslations } from "next-intl/server";

type SocialButtonProps = {
  children: ReactNode;
  label: string;
  href: string;
  w?: number;
  h?: number;
  target?: string;
};

function SocialButton({ children, label, href, w, h, target }: SocialButtonProps) {
  return (
    <a
      href={href}
      target={target || "_blank"}
      rel="noopener noreferrer"
      className="group inline-flex size-11 items-center justify-center rounded-full border border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:border-primary/30 hover:bg-primary/5 hover:shadow-[0_4px_16px_rgba(255,45,85,0.15)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      aria-label={label}
      style={{ width: w ? `${w * 0.25}rem` : undefined, height: h ? `${h * 0.25}rem` : undefined }}
    >
      <div className="transition-transform duration-300 group-hover:scale-110">{children}</div>
    </a>
  );
}

export default async function Footer() {
  const t = await getTranslations("Home");
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-auto border-t border-border/50 bg-background/80 backdrop-blur-xl">
      <OrganicShapes variant="subtle" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex items-center gap-2">
              <Heart className="size-5 text-primary fill-primary" />
              <span className="text-lg font-semibold text-foreground">FoodShare</span>
            </div>
            <p className="max-w-md text-sm text-muted-foreground leading-relaxed">{t("footer_tagline")}</p>
          </div>

          <GlassCard hover={false} intensity="subtle" className="w-full max-w-2xl p-6">
            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <SocialButton label="Twitter" href="https://twitter.com/foodshareclub">
                  <Image className="size-5" src={twitter} alt="Twitter" width={20} height={20} />
                </SocialButton>
                <SocialButton label="Facebook" href="https://www.facebook.com/foodshareclub">
                  <Image className="size-5" src={facebook} alt="Facebook" width={20} height={20} />
                </SocialButton>
                <SocialButton label="Instagram" href="https://www.instagram.com/foodshareclub/">
                  <Image className="size-5" src={instagram} alt="Instagram" width={20} height={20} />
                </SocialButton>
                <SocialButton label="LinkedIn" href="https://www.linkedin.com/company/37215158">
                  <Image className="size-5" src={linked} alt="LinkedIn" width={20} height={20} />
                </SocialButton>
                <SocialButton label="Telegram" href="https://t.me/foodshare_club">
                  <Image className="size-5" src={telegram} alt="Telegram" width={20} height={20} />
                </SocialButton>
              </div>

              <div className="h-px w-full bg-border/50" />

              <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                <a
                  href={PATH.feedbackPage}
                  className="flex items-center gap-2 text-muted-foreground transition-colors duration-200 hover:text-foreground"
                >
                  <Image className="size-4" src={feedback} alt="" width={16} height={16} />
                  Feedback
                </a>
                <a
                  href={PATH.donationPage}
                  className="flex items-center gap-2 text-primary transition-colors duration-200 hover:text-primary/80"
                >
                  <Image className="size-4" src={donat} alt="" width={16} height={16} />
                  {t("footer_donate")}
                </a>
              </div>
            </div>
          </GlassCard>

          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-xs text-muted-foreground">
              &copy; {currentYear} Foodshare Club, Limited. All rights reserved
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{t("footer_made_with")}</span>
              <Heart className="size-3 text-primary fill-primary" />
              <span>{t("footer_for_community")}</span>
            </div>
            <LanguageSelector />
          </div>
        </div>
      </div>
    </footer>
  );
}
