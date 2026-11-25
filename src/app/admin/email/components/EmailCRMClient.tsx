"use client";

import { EmailCRMDashboard } from "./EmailCRMDashboard";
import type { EmailCRMClientProps } from "./types";

/**
 * Modular EmailCRMClient delegating directly to the split tab/card EmailCRMDashboard architecture.
 */
export function EmailCRMClient({ initialData }: EmailCRMClientProps) {
  return <EmailCRMDashboard initialData={initialData} />;
}
