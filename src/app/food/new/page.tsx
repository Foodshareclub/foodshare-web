import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewProductForm } from './NewProductForm'
import { generateNoIndexMetadata } from '@/lib/metadata'

export const metadata = generateNoIndexMetadata(
  'Create New Listing',
  'Share food or items with your community'
);

/**
 * New Product Page - Server Component
 * Handles authentication check server-side with redirect
 */
export default async function NewProductPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Server-side auth check with redirect (no flash of content)
  if (!user) {
    redirect('/auth/login?redirect=/food/new')
  }

  return <NewProductForm userId={user.id} />
}
