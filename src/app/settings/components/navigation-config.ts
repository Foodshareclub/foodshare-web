import { User, Shield, Bell, Globe, Palette, HelpCircle, Leaf } from "lucide-react";

export interface NavItem {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  badge?: string;
  disabled?: boolean;
  gradient: string;
}

export const accountItems: NavItem[] = [
  {
    icon: User,
    label: "Personal info",
    description: "Name, phone, address",
    href: "/settings/personal-info",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Shield,
    label: "Login & security",
    description: "Password, 2FA",
    href: "/settings/login-and-security",
    gradient: "from-emerald-500 to-teal-500",
  },
];

export const preferenceItems: NavItem[] = [
  {
    icon: Bell,
    label: "Notifications",
    description: "Email, push alerts",
    href: "/settings/notifications",
    badge: "Soon",
    disabled: true,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: Globe,
    label: "Language & region",
    description: "Language, search radius",
    href: "/settings/language",
    gradient: "from-purple-500 to-violet-500",
  },
  {
    icon: Palette,
    label: "Appearance",
    description: "Theme, display",
    href: "/settings/appearance",
    badge: "Soon",
    disabled: true,
    gradient: "from-pink-500 to-rose-500",
  },
];

export const supportItems: NavItem[] = [
  {
    icon: HelpCircle,
    label: "Help Center",
    description: "FAQs & guides",
    href: "/help",
    gradient: "from-slate-500 to-gray-600",
  },
  {
    icon: Leaf,
    label: "About FoodShare",
    description: "Our mission",
    href: "/",
    gradient: "from-emerald-500 to-green-600",
  },
];
