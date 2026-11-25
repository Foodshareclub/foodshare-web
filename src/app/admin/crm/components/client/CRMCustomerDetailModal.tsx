"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CRMCustomerWithProfile } from "@/types/crm.types";
import { Mail, MessageSquare } from "lucide-react";
import { CRMChurnRiskBadge, CRMLifecycleBadge } from "../shared/CRMSharedWidgets";
import { CRM_CLIENT_COPY } from "./copy";

export function CRMCustomerDetailModal({
  customer,
  open,
  onClose,
}: {
  customer: CRMCustomerWithProfile | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={customer.avatar_url || undefined} />
              <AvatarFallback>
                {customer.full_name?.slice(0, 2).toUpperCase() || CRM_CLIENT_COPY.unknownInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{customer.full_name || CRM_CLIENT_COPY.unknownUser}</p>
              <p className="text-sm text-muted-foreground font-normal">{customer.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-foreground tabular-nums">{`${customer.engagement_score || 50}%`}</p>
              <p className="text-xs text-muted-foreground">{CRM_CLIENT_COPY.engagementStat}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-foreground tabular-nums">{customer.items_shared || 0}</p>
              <p className="text-xs text-muted-foreground">{CRM_CLIENT_COPY.itemsShared}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-foreground tabular-nums">{customer.items_received || 0}</p>
              <p className="text-xs text-muted-foreground">{CRM_CLIENT_COPY.itemsReceived}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">{CRM_CLIENT_COPY.lifecycleStage}</span>
              <CRMLifecycleBadge stage={customer.lifecycle_stage || "lead"} compactIcons />
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">{CRM_CLIENT_COPY.customerType}</span>
              <span className="text-sm font-medium capitalize">
                {customer.customer_type || CRM_CLIENT_COPY.defaultType}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">{CRM_CLIENT_COPY.churnRisk}</span>
              <CRMChurnRiskBadge score={customer.churn_risk_score || 0} />
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">{CRM_CLIENT_COPY.forumReputation}</span>
              <span className="text-sm font-medium tabular-nums">{customer.forum_reputation || 0}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-muted-foreground">{CRM_CLIENT_COPY.memberSince}</span>
              <span className="text-sm font-medium">
                {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : CRM_CLIENT_COPY.unknownUser}
              </span>
            </div>
          </div>

          {customer.tags && customer.tags.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">{CRM_CLIENT_COPY.tagsLabel}</p>
              <div className="flex flex-wrap gap-2">
                {customer.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button className="flex-1 gap-2">
              <Mail className="h-4 w-4" aria-hidden="true" />
              {CRM_CLIENT_COPY.sendEmail}
            </Button>
            <Button variant="outline" className="flex-1 gap-2">
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              {CRM_CLIENT_COPY.addNote}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
