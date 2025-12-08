import { generateNoIndexMetadata } from '@/lib/metadata';

export const metadata = generateNoIndexMetadata(
    'Messages',
    'Chat with food sharers in your community'
);

/**
 * Chat Layout
 * Chat page handles its own scrolling internally with fixed height
 * Footer is hidden via the [data-chat-page] attribute on the wrapper
 */
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-chat-page className="flex flex-col">
      {children}
    </div>
  );
}
