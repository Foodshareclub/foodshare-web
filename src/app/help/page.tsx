import Link from 'next/link'
import { PageHeader } from '@/components/navigation/PageHeader'
import { generatePageMetadata } from '@/lib/metadata'
import { generateFAQJsonLd, safeJsonLdStringify } from '@/lib/jsonld'

export const metadata = generatePageMetadata({
  title: 'Help Center',
  description: 'Get help with FoodShare - FAQs, guides, and support for sharing food in your community.',
  keywords: ['help', 'support', 'FAQ', 'guide', 'how to'],
  path: '/help',
});

// FAQ data for structured data
const faqs = [
  { question: 'How do I create an account?', answer: 'Click the "Sign Up" button and register with your email or social account. Complete your profile to start sharing food with your community.' },
  { question: 'How do I share food?', answer: 'Click the "+" button to create a new listing. Add photos, description, pickup location, and availability. Your listing will appear on the map for nearby users.' },
  { question: 'How do I find food near me?', answer: 'Use the interactive map to browse available food in your area. You can filter by food type, distance, and availability. Tap on a listing to see details and contact the sharer.' },
  { question: 'What food can I share?', answer: 'Share surplus food that is still safe to eat - unopened packaged goods, fresh produce, home-cooked meals, and baked goods. Always be honest about ingredients and preparation date.' },
  { question: 'How do I message someone?', answer: 'Open a listing and tap "Message" to start a chat with the sharer. Use chat to coordinate pickup time and location.' },
  { question: 'Is FoodShare free?', answer: 'Yes, FoodShare is completely free to use. We believe in building community through sharing.' },
];

export default function HelpPage() {
  const faqJsonLd = generateFAQJsonLd(faqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(faqJsonLd) }}
      />
      <div className="min-h-screen bg-muted/30 dark:bg-background">
        <PageHeader title="Help Center" />

        <div className="container mx-auto max-w-4xl py-8 px-4">
          <div className="bg-card rounded-2xl shadow-sm p-8 md:p-12">
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <section className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Getting Started</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">How do I create an account?</h3>
                    <p className="text-foreground/80 text-sm">
                      Click the &quot;Sign Up&quot; button and register with your email or social account.
                      Complete your profile to start sharing food with your community.
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">How do I share food?</h3>
                    <p className="text-foreground/80 text-sm">
                      Click the &quot;+&quot; button to create a new listing. Add photos, description,
                      pickup location, and availability. Your listing will appear on the map for nearby users.
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">How do I find food near me?</h3>
                    <p className="text-foreground/80 text-sm">
                      Use the interactive map to browse available food in your area. You can filter by
                      food type, distance, and availability. Tap on a listing to see details and contact the sharer.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Food Safety</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">What food can I share?</h3>
                    <p className="text-foreground/80 text-sm">
                      Share surplus food that is still safe to eat - unopened packaged goods, fresh produce,
                      home-cooked meals, and baked goods. Always be honest about ingredients and preparation date.
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">Food safety tips</h3>
                    <ul className="text-foreground/80 text-sm list-disc list-inside space-y-1">
                      <li>Check expiration dates before sharing</li>
                      <li>Store food at proper temperatures</li>
                      <li>List all allergens and ingredients</li>
                      <li>Use clean containers for transport</li>
                      <li>When in doubt, don&apos;t share it</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Using the App</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">How do I message someone?</h3>
                    <p className="text-foreground/80 text-sm">
                      Open a listing and tap &quot;Message&quot; to start a chat with the sharer.
                      Use chat to coordinate pickup time and location.
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">How do I edit or delete my listing?</h3>
                    <p className="text-foreground/80 text-sm">
                      Go to your profile and find the listing under &quot;My Listings&quot;.
                      Tap the menu icon to edit details or mark as collected/delete.
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">What are community fridges?</h3>
                    <p className="text-foreground/80 text-sm">
                      Community fridges are public refrigerators where anyone can leave or take food.
                      They appear on the map with a special icon. Check their hours and guidelines before visiting.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Account & Privacy</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">How do I change my settings?</h3>
                    <p className="text-foreground/80 text-sm">
                      Go to Settings from your profile menu. You can update your email, password,
                      notification preferences, and privacy settings.
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">Is my location shared?</h3>
                    <p className="text-foreground/80 text-sm">
                      Your exact location is never shared. Listings show an approximate area.
                      You control what location details to share when coordinating pickup.
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">How do I delete my account?</h3>
                    <p className="text-foreground/80 text-sm">
                      Go to Settings &gt; Account &gt; Delete Account. This will permanently remove
                      your profile, listings, and messages.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">Need More Help?</h2>
                <p className="text-foreground/80 mb-4">
                  Can&apos;t find what you&apos;re looking for? Send us feedback through your{' '}
                  <Link href="/settings" className="text-[#FF2D55] hover:underline">
                    account settings
                  </Link>
                  . We typically respond within 24-48 hours.
                </p>
                <p className="text-foreground/80">
                  You can also review our{' '}
                  <Link href="/terms" className="text-[#FF2D55] hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-[#FF2D55] hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
