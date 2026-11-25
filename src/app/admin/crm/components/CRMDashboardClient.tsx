"use client";

/**
 * CRMDashboardClient - Customer Relationship Management Dashboard
 * Coordinator delegating to split CRM tab and modal components.
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CRMCustomerTag, CRMCustomerWithProfile, CRMDashboardStats } from "@/types/crm.types";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CRMClientCustomersTab } from "./client/CRMClientCustomersTab";
import { CRMClientOverviewTab } from "./client/CRMClientOverviewTab";
import { CRMClientEngagementTab, CRMClientSegmentsTab } from "./client/CRMClientSegmentsEngagementTabs";
import { CRMCustomerDetailModal } from "./client/CRMCustomerDetailModal";

interface CRMDashboardClientProps {
  initialCustomers: CRMCustomerWithProfile[];
  stats: CRMDashboardStats;
  tags: CRMCustomerTag[];
}

type TabType = "overview" | "customers" | "segments" | "engagement";

export function CRMDashboardClient({ initialCustomers, stats, tags }: CRMDashboardClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CRMCustomerWithProfile | null>(null);

  const filteredCustomers = initialCustomers.filter((customer) => {
    const matchesSearch =
      customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLifecycle = lifecycleFilter === "all" || customer.lifecycle_stage === lifecycleFilter;
    return matchesSearch && matchesLifecycle;
  });

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="flex flex-1 min-h-0 rounded-2xl border border-border/40 bg-gradient-to-br from-card to-card/80 overflow-hidden shadow-xl">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-shrink-0 border-b border-border/40 px-4">
          <nav className="flex gap-1 overflow-x-auto">
            {(["overview", "customers", "segments", "engagement"] as TabType[]).map((tab) => (
              <button
                type="button"
                key={tab}
                aria-pressed={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t(tab)}
              </button>
            ))}
          </nav>
        </div>

        <ScrollArea className="flex-1">
          {activeTab === "overview" && (
            <CRMClientOverviewTab
              stats={stats}
              customers={filteredCustomers}
              tags={tags}
              onViewAllCustomers={() => setActiveTab("customers")}
            />
          )}
          {activeTab === "customers" && (
            <CRMClientCustomersTab
              customers={filteredCustomers}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              lifecycleFilter={lifecycleFilter}
              setLifecycleFilter={setLifecycleFilter}
              onSelectCustomer={setSelectedCustomer}
              onRefresh={handleRefresh}
              isPending={isPending}
            />
          )}
          {activeTab === "segments" && <CRMClientSegmentsTab stats={stats} tags={tags} />}
          {activeTab === "engagement" && <CRMClientEngagementTab stats={stats} customers={filteredCustomers} />}
        </ScrollArea>
      </div>

      <CRMCustomerDetailModal
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
}
