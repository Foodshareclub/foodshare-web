"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CRMCustomerWithProfile } from "@/types/crm.types";
import { Download, Mail, MessageSquare, MoreHorizontal, RefreshCw, Search, Tag, Users } from "lucide-react";
import { CRMChurnRiskBadge, CRMLifecycleBadge } from "../shared/CRMSharedWidgets";
import { CRM_CLIENT_COPY } from "./copy";

export function CRMClientCustomersTab({
  customers,
  searchQuery,
  setSearchQuery,
  lifecycleFilter,
  setLifecycleFilter,
  onSelectCustomer,
  onRefresh,
  isPending,
}: {
  customers: CRMCustomerWithProfile[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  lifecycleFilter: string;
  setLifecycleFilter: (f: string) => void;
  onSelectCustomer: (c: CRMCustomerWithProfile) => void;
  onRefresh: () => void;
  isPending: boolean;
}) {
  return (
    <div className="p-5 space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={CRM_CLIENT_COPY.searchCustomers}
            aria-label={CRM_CLIENT_COPY.searchCustomers}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9 h-9 bg-background/50"
          />
        </div>
        <Select value={lifecycleFilter} onValueChange={setLifecycleFilter}>
          <SelectTrigger className="w-36 h-9 bg-background/50">
            <SelectValue placeholder={CRM_CLIENT_COPY.lifecyclePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{CRM_CLIENT_COPY.allStages}</SelectItem>
            <SelectItem value="lead">{CRM_CLIENT_COPY.leadsFilter}</SelectItem>
            <SelectItem value="active">{CRM_CLIENT_COPY.activeFilter}</SelectItem>
            <SelectItem value="champion">{CRM_CLIENT_COPY.championsFilter}</SelectItem>
            <SelectItem value="at_risk">{CRM_CLIENT_COPY.atRiskFilter}</SelectItem>
            <SelectItem value="churned">{CRM_CLIENT_COPY.churnedFilter}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-9 gap-2" onClick={onRefresh} disabled={isPending}>
          <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} aria-hidden="true" />
          {CRM_CLIENT_COPY.refresh}
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Download className="h-4 w-4" aria-hidden="true" />
          {CRM_CLIENT_COPY.exportLabel}
        </Button>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/50 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr className="text-xs text-muted-foreground uppercase tracking-wider">
              <th className="text-start py-3 px-4">{CRM_CLIENT_COPY.colCustomer}</th>
              <th className="text-start py-3 px-4">{CRM_CLIENT_COPY.colStage}</th>
              <th className="text-center py-3 px-4">{CRM_CLIENT_COPY.colEngagement}</th>
              <th className="text-center py-3 px-4">{CRM_CLIENT_COPY.colChurnRisk}</th>
              <th className="text-start py-3 px-4">{CRM_CLIENT_COPY.colLastActive}</th>
              <th className="text-end py-3 px-4">{CRM_CLIENT_COPY.colActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => onSelectCustomer(customer)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectCustomer(customer);
                  }
                }}
                tabIndex={0}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={customer.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {customer.full_name?.slice(0, 2).toUpperCase() || CRM_CLIENT_COPY.unknownInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {customer.full_name || CRM_CLIENT_COPY.unknownUser}
                      </p>
                      <p className="text-xs text-muted-foreground">{customer.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <CRMLifecycleBadge stage={customer.lifecycle_stage || "lead"} compactIcons />
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Progress value={customer.engagement_score || 50} className="w-16 h-1.5" />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {`${customer.engagement_score || 50}%`}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <CRMChurnRiskBadge score={customer.churn_risk_score || 0} />
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {customer.last_interaction_at
                    ? new Date(customer.last_interaction_at).toLocaleDateString()
                    : CRM_CLIENT_COPY.neverLabel}
                </td>
                <td className="py-3 px-4 text-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={CRM_CLIENT_COPY.colActions}>
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Mail className="h-4 w-4 me-2" aria-hidden="true" />
                        {CRM_CLIENT_COPY.sendEmail}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <MessageSquare className="h-4 w-4 me-2" aria-hidden="true" />
                        {CRM_CLIENT_COPY.addNote}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Tag className="h-4 w-4 me-2" aria-hidden="true" />
                        {CRM_CLIENT_COPY.manageTags}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" aria-hidden="true" />
            <p className="text-muted-foreground">{CRM_CLIENT_COPY.noCustomersFound}</p>
          </div>
        )}
      </div>
    </div>
  );
}
