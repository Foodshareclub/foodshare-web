import { generateNoIndexMetadata } from '@/lib/metadata';

export const metadata = generateNoIndexMetadata(
    'Messages',
    'Chat with food sharers in your community'
);

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
