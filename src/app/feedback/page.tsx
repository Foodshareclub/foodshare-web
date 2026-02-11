import { FeedbackForm } from "./FeedbackForm";
import { getCurrentUserInfo } from "@/app/actions/feedback";
import { PageHeader } from "@/components/navigation/PageHeader";
import { generateNoIndexMetadata } from "@/lib/metadata";

export const metadata = generateNoIndexMetadata("Send Feedback", "Share your thoughts, report bugs, or suggest new features.");

export default async function FeedbackPage() {
  const result = await getCurrentUserInfo();
  const userInfo = result.success ? result.data : null;

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <PageHeader title="Send Feedback" />

      <div className="container mx-auto max-w-[560px] py-8 px-4">
        {/* Header */}
        <div className="flex flex-col gap-1 mb-4 text-center">
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">
            Send us feedback
          </h1>
          <p className="text-sm text-muted-foreground max-w-[500px] mx-auto">
            Tell us what you think or report any issues
          </p>
        </div>

        {/* Feedback Form */}
        <FeedbackForm defaultName={userInfo?.name || ""} defaultEmail={userInfo?.email || ""} />

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          We typically respond within 24-48 hours
        </p>
      </div>
    </div>
  );
}
