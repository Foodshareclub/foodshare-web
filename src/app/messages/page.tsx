import { redirect } from 'next/navigation';

/**
 * Messages Page - Redirects to unified chat
 * Forum conversations are now part of the unified chat system
 */
export default function MessagesPage() {
  redirect('/chat');
}
