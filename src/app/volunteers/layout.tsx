import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Volunteers | FoodShare - Join Our Community",
  description:
    "Meet our amazing volunteers and join the FoodShare community. Help reduce food waste and strengthen neighborhoods by volunteering your time and skills.",
  keywords: [
    "food sharing volunteers",
    "community volunteers",
    "food rescue volunteers",
    "volunteer opportunities",
    "reduce food waste",
    "community service",
    "FoodShare volunteers",
  ],
  openGraph: {
    title: "Volunteers | FoodShare",
    description:
      "Join our community of volunteers making a difference. Help reduce food waste and strengthen neighborhoods.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Volunteers | FoodShare",
    description: "Join our community of volunteers making a difference.",
  },
};

export default function VolunteersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
