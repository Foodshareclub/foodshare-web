/**
 * Chat Messages API Route
 * Fetches messages for food sharing rooms
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getChatMessages } from '@/lib/data/chat';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const roomId = searchParams.get('roomId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!roomId) {
      return NextResponse.json(
        { error: 'roomId is required' },
        { status: 400 }
      );
    }

    // Food sharing chat messages
    const rawMessages = await getChatMessages(roomId, limit, offset);
    
    // Transform to unified format
    const messages = rawMessages.map((msg) => ({
      id: msg.id,
      text: msg.text,
      senderId: msg.profile_id,
      timestamp: msg.timestamp,
      image: msg.image || undefined,
      isOwn: msg.profile_id === user.id,
      senderName: msg.profiles 
        ? `${msg.profiles.first_name} ${msg.profiles.second_name}`.trim()
        : undefined,
      senderAvatar: msg.profiles?.avatar_url || undefined,
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
