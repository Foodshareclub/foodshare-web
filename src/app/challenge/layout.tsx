import type { Metadata } from 'next';

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
  return <>{children}</>;
}
