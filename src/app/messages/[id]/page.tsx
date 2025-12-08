import { redirect } from 'next/navigation';

type Params = Promise<{ id: string }>;

/**
 * Forum Conversation Page - Redirects to unified chat
 * Forum conversations are now part of the unified chat system
 */
export default async function ForumConversationPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  redirect(`/chat?room=${id}`);
}
