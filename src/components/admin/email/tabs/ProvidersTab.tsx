"use client";

import { Settings, Globe } from "lucide-react";
import { GlassCard } from "../shared/GlassCard";
import { ProviderDetailCard, ProviderConfigCard } from "../shared/ProviderComponents";
import { RoutingRule } from "../shared/RoutingRule";
import type { ProviderHealth } from "../types";

export function ProvidersTab({ providerHealth }: { providerHealth: ProviderHealth[] }) {
  return (
    <div className="space-y-6">
      {/* Provider Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {providerHealth.map((provider) => (
          <ProviderDetailCard key={provider.provider} provider={provider} />
        ))}
      </div>

      {/* Configuration */}
      <GlassCard>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          Provider Configuration
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
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
            name="AWS SES"
            status="configured"
            dailyLimit={100}
            priority={3}
            description="Failover provider when primary quotas are exhausted"
          />
        </div>
      </GlassCard>

      {/* Routing Rules */}
      <GlassCard>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Smart Routing Rules
        </h3>
        <div className="space-y-3">
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
        </div>
      </GlassCard>
    </div>
  );
}
