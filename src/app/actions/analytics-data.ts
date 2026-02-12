"use server";

/**
 * Analytics Data Server Actions
 *
 * Server action wrappers for analytics data layer functions.
 * Client components should import from here instead of @/lib/data/analytics directly.
 */

import {
  getAnalyticsSummary as _getAnalyticsSummary,
  getMonthlyGrowth as _getMonthlyGrowth,
  getDailyActiveUsers as _getDailyActiveUsers,
  getConversionFunnel as _getConversionFunnel,
  getUserRetentionCohorts as _getUserRetentionCohorts,
  getInventoryAging as _getInventoryAging,
  getListingTypeDistribution as _getListingTypeDistribution,
  getTopSharers as _getTopSharers,
  getSyncStatus as _getSyncStatus,
  getGeographicHotspots as _getGeographicHotspots,
} from "@/lib/data/analytics";

import type { ServerActionResult } from "@/lib/errors";
import type {
  AnalyticsSummary,
  MonthlyGrowth,
  DailyActiveUsers,
  FunnelStep,
  RetentionCohort,
  InventoryAge,
  ListingTypeDistribution,
  TopSharer,
  SyncStatus,
  GeoHotspot,
} from "@/lib/data/analytics";

export async function fetchAnalyticsSummary(): Promise<ServerActionResult<AnalyticsSummary>> {
  return _getAnalyticsSummary();
}

export async function fetchMonthlyGrowth(): Promise<ServerActionResult<MonthlyGrowth[]>> {
  return _getMonthlyGrowth();
}

export async function fetchDailyActiveUsers(): Promise<ServerActionResult<DailyActiveUsers[]>> {
  return _getDailyActiveUsers();
}

export async function fetchConversionFunnel(): Promise<ServerActionResult<FunnelStep[]>> {
  return _getConversionFunnel();
}

export async function fetchUserRetentionCohorts(): Promise<ServerActionResult<RetentionCohort[]>> {
  return _getUserRetentionCohorts();
}

export async function fetchInventoryAging(): Promise<ServerActionResult<InventoryAge[]>> {
  return _getInventoryAging();
}

export async function fetchListingTypeDistribution(): Promise<
  ServerActionResult<ListingTypeDistribution[]>
> {
  return _getListingTypeDistribution();
}

export async function fetchTopSharers(
  limit: number = 10
): Promise<ServerActionResult<TopSharer[]>> {
  return _getTopSharers(limit);
}

export async function fetchSyncStatus(): Promise<ServerActionResult<SyncStatus[]>> {
  return _getSyncStatus();
}

export async function fetchGeographicHotspots(): Promise<ServerActionResult<GeoHotspot[]>> {
  return _getGeographicHotspots();
}
