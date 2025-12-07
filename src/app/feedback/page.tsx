import { Metadata } from "next";
import { getCurrentUserInfo } from "@/app/actions/feedback";
import { FeedbackForm } from "./FeedbackForm";

export const metadata: Metadata = {
  title: "Send Feedback | FoodShare",
  description:
    "Share your thoughts, report bugs, or suggest new features. We'd love to hear from you!",
  openGraph: {
    title: "Send Feedback | FoodShare",
    description: "Tell us what you think or report any issues",
  },
};

export default async function FeedbackPage() {
  const userInfo = await getCurrentUserInfo();

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="container mx-auto max-w-[560px] pt-[200px] md:pt-[220px] px-4">
        {/* Header */}
        <div className="flex flex-col gap-1 mb-4 text-center">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
            Send us feedback
          </h1>
          <p className="text-sm text-gray-600 max-w-[500px] mx-auto">
            Tell us what you think or report any issues
          </p>
        </div>

        {/* Feedback Form */}
        <FeedbackForm
          defaultName={userInfo?.name || ""}
          defaultEmail={userInfo?.email || ""}
        />

        {/* Footer note */}
        <p className="text-center text-xs text-gray-500 mt-4">
          We typically respond within 24-48 hours
        </p>
      </div>
    </div>
  );
}
