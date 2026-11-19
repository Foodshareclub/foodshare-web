"use client";

import { Badge } from "@/components/ui/badge";
import { isReferenceImageUrl } from "@/lib/image";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function ReferencePhotoDisclosure({ image, className }: { image?: string; className?: string }) {
  const t = useTranslations();
  if (!isReferenceImageUrl(image)) return null;
  return (
    <Badge variant="secondary" className={cn("max-w-full whitespace-normal", className)}>
      {t("reference_photo_disclaimer")}
    </Badge>
  );
}
