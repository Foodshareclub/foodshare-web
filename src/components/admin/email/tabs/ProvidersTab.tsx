"use client";

/**
 * ProvidersTab - Email provider management and configuration
 */

import { Settings, Globe } from "lucide-react";

import { DEFAULT_PROVIDER_HEALTH } from "../constants";
import { ProviderDetailCard, ProviderConfigCard, RoutingRule } from "../cards";
import type { ProvidersTabProps } from "../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function ProvidersTab({ providerHealth }: ProvidersTabProps) {
  const providers =
    providerHealth.length > 0 ? providerHealth : DEFAULT_PROVIDER_HEALTH.slice(0, 3); // brevo, resend, aws_ses

  return (
    <div className="space-y-5">
      {/* Provider Cards */}
      <div className="grid md:grid-cols-3 gap-5">
        {providers.map((provider) => (
          <ProviderDetailCard key={provider.provider} provider={provider} />
        ))}
      </div>

      {/* Configuration */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Provider Configuration
          </CardTitle>
          <CardDescription>Manage email provider settings and priorities</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ProviderConfigCard
              name="Brevo"
              status="configured"
              dailyLimit={300}
              priority={1}
              description="Primary provider for app notifications and newsletters"
            />
            <ProviderConfigCard
              name="Resend"
              status="configured"
              dailyLimit={100}
              priority={2}
              description="Optimized for authentication and transactional emails"
            />
            <ProviderConfigCard
              name="MailerSend"
              status="configured"
              dailyLimit={400}
              priority={3}
              description="High-volume email provider with 12,000 emails/month free tier"
            />
            <ProviderConfigCard
              name="AWS SES"
              status="configured"
              dailyLimit={100}
              priority={4}
              description="Failover provider when primary quotas are exhausted"
            />
          </div>
        </CardContent>
      </Card>

      {/* Routing Rules */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Smart Routing Rules
          </CardTitle>
          <CardDescription>Automatic email routing based on type and availability</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <RoutingRule condition="Email type = auth" action="Route to Resend" priority="High" />
          <RoutingRule
            condition="Email type = newsletter"
            action="Route to Brevo"
            priority="Normal"
          />
          <RoutingRule
            condition="Primary quota exhausted"
            action="Failover to AWS SES"
            priority="Fallback"
          />
          <RoutingRule
            condition="All quotas exhausted"
            action="Queue for next day"
            priority="Last resort"
          />
        </CardContent>
      </Card>
    </div>
  );
}
