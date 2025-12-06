import Link from 'next/link'
import { PageHeader } from '@/components/navigation/PageHeader'
import { generatePageMetadata } from '@/lib/metadata'

export const metadata = generatePageMetadata({
  title: 'Terms of Service',
  description: 'FoodShare Terms of Service - Read our terms and conditions for using the platform.',
  keywords: ['terms of service', 'terms', 'conditions', 'legal'],
  path: '/terms',
});

export const dynamic = 'force-static'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <PageHeader title="Terms of Service" />

      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="bg-card rounded-2xl shadow-sm p-8 md:p-12">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-muted-foreground mb-6">
              Last updated: December 2024
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p className="text-foreground/80 mb-4">
                By accessing and using FoodShare, you accept and agree to be bound by the terms and
                provisions of this agreement. If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">2. Description of Service</h2>
              <p className="text-foreground/80 mb-4">
                FoodShare is a community platform that connects people to share surplus food, reducing
                food waste and helping those in need. Users can list available food items, discover
                local offerings on an interactive map, and coordinate exchanges via real-time chat.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">3. User Responsibilities</h2>
              <p className="text-foreground/80 mb-4">As a user of FoodShare, you agree to:</p>
              <ul className="list-disc list-inside text-foreground/80 space-y-2 ml-4">
                <li>Provide accurate information about food items you share</li>
                <li>Ensure all shared food is safe for consumption</li>
                <li>Respect other community members</li>
                <li>Use the platform only for its intended purpose</li>
                <li>Not engage in any fraudulent or harmful activities</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">4. Food Safety</h2>
              <p className="text-foreground/80 mb-4">
                FoodShare is a platform for connecting food sharers and recipients. We do not guarantee
                the safety or quality of any food items shared through our platform. Users are responsible
                for ensuring food safety and making informed decisions about accepting shared food.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">5. Privacy</h2>
              <p className="text-foreground/80 mb-4">
                Your privacy is important to us. Please review our{' '}
                <Link href="/privacy" className="text-[#FF2D55] hover:underline">
                  Privacy Policy
                </Link>{' '}
                to understand how we collect, use, and protect your information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">6. Limitation of Liability</h2>
              <p className="text-foreground/80 mb-4">
                FoodShare is provided &quot;as is&quot; without warranties of any kind. We are not liable
                for any damages arising from the use of our platform, including but not limited to
                issues related to food quality, safety, or user interactions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">7. Changes to Terms</h2>
              <p className="text-foreground/80 mb-4">
                We reserve the right to modify these terms at any time. Continued use of FoodShare
                after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">8. Contact</h2>
              <p className="text-foreground/80">
                If you have questions about these Terms of Service, please contact us through the
                feedback form in your account settings.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
