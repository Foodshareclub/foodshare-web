import type { Metadata } from 'next';
import { siteConfig } from '@/lib/metadata';
import { NavbarWrapper } from '@/components/header/navbar/NavbarWrapper';
import { getUser } from '@/app/actions/auth';

export const metadata: Metadata = {
  title: {
    default: 'Community Forum',
    template: '%s | Forum | FoodShare',
  },
  description:
    'Join the FoodShare community forum to share ideas, ask questions, and connect with other food sharers. Discuss food sharing tips, sustainability, and community initiatives.',
  keywords: [
    'food sharing forum',
    'community discussion',
    'sustainability forum',
    'food waste reduction',
    'community support',
    'food sharing tips',
    'zero waste community',
  ],
  alternates: {
    canonical: `${siteConfig.url}/forum`,
    types: {
      'application/rss+xml': `${siteConfig.url}/forum/feed.xml`,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${siteConfig.url}/forum`,
    siteName: siteConfig.name,
    title: `Community Forum | ${siteConfig.name}`,
    description:
      'Join the FoodShare community forum to share ideas, ask questions, and connect with other food sharers.',
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: 'FoodShare Community Forum',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: siteConfig.twitterHandle,
    title: `Community Forum | ${siteConfig.name}`,
    description:
      'Join the FoodShare community forum to share ideas, ask questions, and connect with other food sharers.',
    images: [siteConfig.ogImage],
  },
};

export default async function ForumLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  
  return (
    <div className="min-h-screen bg-background">
      <NavbarWrapper defaultProductType="forum" initialUser={user} />
      {children}
    </div>
  );
}
