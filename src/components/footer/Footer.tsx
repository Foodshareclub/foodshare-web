import type { ReactNode } from "react";
import Image from "next/image";
import twitter from "@/assets/twiter23.png";
import instagram from "@/assets/insta23.png";
import facebook from "@/assets/facebook23.png";
import linked from "@/assets/linked23.png";
import telegram from "@/assets/telega23.png";
import donat from "@/assets/heartRed23.png";
import feedback from "@/assets/feedbackIcon.svg";

import { PATH } from "@/utils";
import LanguageSelector from "@/components/languageSelector/LanguageSelector";
import { Globe } from "lucide-react";

type SocialButtonProps = {
  children: ReactNode;
  label: string;
  href: string;
  w?: number;
  h?: number;
  target?: string;
};

// React Compiler handles memoization automatically
function SocialButton({ children, label, href, w, h, target }: SocialButtonProps) {
  return (
    <a href={href} target={target || "_blank"} rel="noopener noreferrer">
      <button
        className="rounded-full w-9 h-9 cursor-pointer inline-flex items-center justify-center"
        aria-label={label}
        style={{
          width: w ? `${w * 0.25}rem` : undefined,
          height: h ? `${h * 0.25}rem` : undefined,
        }}
      >
        <span className="sr-only">{label}</span>
        {children}
      </button>
    </a>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="fixed bottom-0 z-[1] w-full border-t border-border/30 text-foreground py-1 px-7 xl:px-20 gpu glass">
      <div className="flex flex-col md:flex-row justify-center md:justify-between items-center gap-2">
        <div className="flex items-center gap-4">
          <p className="text-base md:text-[16px] text-[10px]">
            © {currentYear} Foodshare Club, Limited. All rights reserved
          </p>
          <div className="hidden md:flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <LanguageSelector />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex justify-center">
            <SocialButton label={"Twitter"} href={"https://twitter.com/foodshareclub"}>
              <Image className="w-6 h-6" src={twitter} alt="Twitter" width={24} height={24} />
            </SocialButton>
            <SocialButton label={"facebook"} href={"https://www.facebook.com/foodshareclub"}>
              <Image className="w-6 h-6" src={facebook} alt="Facebook" width={24} height={24} />
            </SocialButton>
            <SocialButton label={"Instagram"} href={"https://www.instagram.com/foodshareclub/"}>
              <Image className="w-6 h-6" src={instagram} alt="Instagram" width={24} height={24} />
            </SocialButton>
            <SocialButton label={"linked"} href={"https://www.linkedin.com/company/37215158"}>
              <Image className="w-6 h-6" src={linked} alt="LinkedIn" width={24} height={24} />
            </SocialButton>
            <SocialButton label={"telegram"} href={"https://t.me/foodshare_club"}>
              <Image className="w-6 h-6" src={telegram} alt="Telegram" width={24} height={24} />
            </SocialButton>
          </div>

          <div className="flex justify-center pl-0 sm:pl-10">
            <SocialButton target={"_parent"} label={"feedback"} href={PATH.feedbackPage}>
              <Image className="w-6 h-6" src={feedback} alt="Feedback" width={24} height={24} />
            </SocialButton>
            <h2 className="pr-2 self-center text-sm">
              <a href={PATH.feedbackPage} className="no-underline">
                Feedback
              </a>
            </h2>

            <SocialButton target={"_parent"} label={"donat"} href={PATH.donationPage}>
              <Image className="w-6 h-6" src={donat} alt="Donation" width={24} height={24} />
            </SocialButton>
            <h2 className="self-center text-sm text-red-500">
              <a href={PATH.donationPage} className="no-underline">
                Donation
              </a>
            </h2>
          </div>
        </div>
      </div>
    </footer>
  );
}
