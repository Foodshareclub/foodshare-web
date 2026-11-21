import { Button } from "@/components/ui/button";
import { Coffee, ExternalLink } from "lucide-react";

interface DonateButtonProps {
  kofiUrl: string;
  variant: "hero" | "cta";
  /**
   * The link's visible text, already resolved.
   *
   * Required rather than defaulted, which is the Phase 19 lesson: a
   * `label = "Donate Now"` default is English in 20 of 21 locales, and it is
   * invisible — the type is `string`, the page builds, and the string is wrong
   * for every reader who did not ask for English. Making it required means the
   * compiler refuses a caller that has no translation instead.
   */
  label: string;
}

/**
 * DonateButton - Server Component
 * Renders the Ko-fi donation CTA using the canonical brand button.
 *
 * The retired look was a hand-rolled `from-[#FF2D55] to-[#FF6B9D]` gradient
 * with a springy scale and a multi-layer glow. The design source is explicit:
 * coral CTAs use `Button variant="brand"` (solid `bg-brand`), no gradients.
 * `asChild` projects the variant onto the external anchor so the link keeps
 * its own target/rel while the styling stays on the one source.
 */
export function DonateButton({ kofiUrl, variant, label }: DonateButtonProps) {
  // The hero CTA is the page's single largest action; the closing CTA is a
  // reminder and steps down one size.
  const size = variant === "hero" ? "xl" : "lg";

  return (
    <Button variant="brand" size={size} asChild>
      <a href={kofiUrl} target="_blank" rel="noopener noreferrer">
        <Coffee />
        {label}
        <ExternalLink />
      </a>
    </Button>
  );
}
