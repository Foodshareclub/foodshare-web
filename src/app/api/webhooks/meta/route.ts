import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Fetch the Meta webhook verify token from Supabase Vault
 */
async function getVerifyToken(): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('get_vault_secret', {
      secret_name: 'meta_webhook_verify_token',
    });

    if (error || !data) {
      console.error('Failed to fetch meta_webhook_verify_token from Vault:', error?.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error accessing Vault:', err);
    return null;
  }
}

/**
 * GET - Webhook verification endpoint
 * Meta sends a GET request to verify your webhook URL
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = await getVerifyToken();

  if (!verifyToken) {
    return new NextResponse('Server configuration error', { status: 500 });
  }

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Meta webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('Meta webhook verification failed', { mode, tokenMatch: token === verifyToken });
  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * POST - Receive webhook events from Meta
 * Handles incoming messages, status updates, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log for debugging (remove in production or use proper logging)
    console.log('Meta webhook received:', JSON.stringify(body, null, 2));

    // Handle different webhook types
    if (body.object === 'user') {
      // User-related webhooks (e.g., profile updates)
      await handleUserWebhook(body);
    } else if (body.object === 'instagram') {
      // Instagram webhooks
      await handleInstagramWebhook(body);
    } else if (body.object === 'whatsapp_business_account') {
      // WhatsApp Business webhooks
      await handleWhatsAppWebhook(body);
    }

    // Always return 200 quickly to acknowledge receipt
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Meta webhook error:', error);
    // Still return 200 to prevent Meta from retrying
    return new NextResponse('OK', { status: 200 });
  }
}

async function handleUserWebhook(body: Record<string, unknown>) {
  // Process user-related events
  console.log('Processing user webhook:', body);
  // TODO: Implement user event handling
}

async function handleInstagramWebhook(body: Record<string, unknown>) {
  // Process Instagram events (messages, comments, etc.)
  console.log('Processing Instagram webhook:', body);
  // TODO: Implement Instagram event handling
}

async function handleWhatsAppWebhook(body: Record<string, unknown>) {
  // Process WhatsApp Business events
  console.log('Processing WhatsApp webhook:', body);
  // TODO: Implement WhatsApp event handling
}
