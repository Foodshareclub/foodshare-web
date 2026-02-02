import Link from "next/link";

interface VolunteerHeroProps {
  /** Show submission confirmation message */
  showSubmissionMessage?: boolean;
}

/**
 * VolunteerHero - Hero section for the volunteers page
 * Features gradient background with emerald/teal theme
 */
export function VolunteerHero({ showSubmissionMessage = false }: VolunteerHeroProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-background dark:from-emerald-900/30 dark:via-teal-900/20" />

      {/* Content */}
      <div className="relative page-px py-16 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          {/* Submission confirmation */}
          {showSubmissionMessage && (
            <div className="mb-8 inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 px-4 py-2 rounded-full text-sm font-medium">
              <span className="text-lg">✓</span>
              Application submitted! We&apos;ll review it and get back to you soon.
            </div>
          )}

          {/* Main heading */}
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Meet Our Amazing{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">
              Volunteers
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join a community of passionate people working together to reduce food waste and
            strengthen our neighborhoods. Every volunteer makes a difference.
          </p>

          {/* CTA Button */}
          <Link
            href="/new?type=volunteer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            <span className="text-xl">🙌</span>
            Become a Volunteer
          </Link>

          {/* Stats (optional - can be added later) */}
          <div className="mt-12 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-foreground">100+</div>
              <div className="text-sm text-muted-foreground">Active Volunteers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-foreground">50+</div>
              <div className="text-sm text-muted-foreground">Communities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-foreground">10k+</div>
              <div className="text-sm text-muted-foreground">Meals Shared</div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-3xl" />
    </section>
  );
}

/**
 * BecomeVolunteerCTA - Bottom CTA section
 */
export function BecomeVolunteerCTA() {
  return (
    <section className="page-px py-16 md:py-20">
      <div className="max-w-2xl mx-auto text-center">
        <div className="glass rounded-2xl p-8 md:p-12">
          <div className="text-5xl mb-4">🌱</div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Want to Make a Difference?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join our volunteer team and help reduce food waste in your community. Whether you can
            drive, cook, organize, or just have a few hours to spare - we&apos;d love to have you!
          </p>
          <Link
            href="/new?type=volunteer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl"
          >
            Apply Now
            <span className="text-lg">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default VolunteerHero;
