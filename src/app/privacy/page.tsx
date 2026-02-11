import { PageHeader } from '@/components/navigation/PageHeader'
import { generatePageMetadata } from '@/lib/metadata'

export const metadata = generatePageMetadata({
  title: 'Privacy Policy',
  description: 'FoodShare Privacy Policy - Learn how we collect, use, and protect your personal information.',
  keywords: ['privacy policy', 'privacy', 'data protection', 'GDPR'],
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <PageHeader title="Privacy Policy" />

      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="bg-card rounded-2xl shadow-sm p-8 md:p-12">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-muted-foreground mb-6">
              Last updated: December 2024
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
              <p className="text-foreground/80 mb-4">We collect information you provide directly to us, including:</p>
              <ul className="list-disc list-inside text-foreground/80 space-y-2 ml-4">
                <li>Account information (name, email, password)</li>
                <li>Profile information (photo, bio, location)</li>
                <li>Food listings you create</li>
                <li>Messages sent through our chat feature</li>
                <li>Feedback and correspondence</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
              <p className="text-foreground/80 mb-4">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-foreground/80 space-y-2 ml-4">
                <li>Provide, maintain, and improve our services</li>
                <li>Connect food sharers with recipients</li>
                <li>Send notifications about your listings and messages</li>
                <li>Respond to your comments and questions</li>
                <li>Detect and prevent fraud and abuse</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">3. Information Sharing</h2>
              <p className="text-foreground/80 mb-4">
                We do not sell your personal information. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-foreground/80 space-y-2 ml-4">
                <li>With other users as necessary to facilitate food sharing</li>
                <li>With service providers who assist in operating our platform</li>
                <li>When required by law or to protect rights and safety</li>
                <li>With your consent</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">4. Location Data</h2>
              <p className="text-foreground/80 mb-4">
                FoodShare uses location data to show nearby food listings on the map and connect
                you with local sharers. You can control location sharing through your device settings.
                Your exact location is not shared with other users unless you choose to include it
                in your listings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">5. Data Security</h2>
              <p className="text-foreground/80 mb-4">
                We implement appropriate security measures to protect your personal information.
                However, no method of transmission over the Internet is 100% secure, and we cannot
                guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">6. Your Rights</h2>
              <p className="text-foreground/80 mb-4">You have the right to:</p>
              <ul className="list-disc list-inside text-foreground/80 space-y-2 ml-4">
                <li>Access and update your personal information</li>
                <li>Delete your account and associated data</li>
                <li>Opt out of marketing communications</li>
                <li>Request a copy of your data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">7. Cookies</h2>
              <p className="text-foreground/80 mb-4">
                We use cookies and similar technologies to maintain your session, remember your
                preferences, and improve your experience. You can control cookies through your
                browser settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">8. Children&apos;s Privacy</h2>
              <p className="text-foreground/80 mb-4">
                FoodShare is not intended for children under 13. We do not knowingly collect
                personal information from children under 13. If you believe we have collected
                such information, please contact us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">9. Changes to This Policy</h2>
              <p className="text-foreground/80 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any
                changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">10. Contact Us</h2>
              <p className="text-foreground/80">
                If you have questions about this Privacy Policy, please contact us through the
                feedback form in your account settings.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
