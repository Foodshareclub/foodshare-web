import type { Metadata } from 'next';
import { NavbarWrapper } from '@/components/header/navbar/NavbarWrapper';

export const metadata: Metadata = {
  title: {
    default: 'Community Challenges',
    template: '%s | Challenges | FoodShare',
  },
  description:
    'Join challenges to reduce waste, live healthier, and make the world a better place. Every action counts!',
  keywords: [
    'community challenges',
    'sustainability challenges',
    'zero waste',
    'food sharing',
    'eco challenges',
    'community goals',
  ],
};

export default function ChallengeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <NavbarWrapper defaultProductType="challenge" />
      {children}
    </div>
  );
}
