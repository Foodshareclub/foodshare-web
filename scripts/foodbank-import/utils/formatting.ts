/**
 * Description Formatting Utility
 *
 * Formats foodbank metadata into a structured description
 * that can be parsed later.
 */

import { SYSTEM_USER_ID } from '../config';
import type { RawFoodbankData, FoodbankImportRecord, Coordinates } from '../types';

/**
 * Format the structured description field
 */
function formatDescription(data: RawFoodbankData): string {
  const sections: string[] = [];

  // Main description
  const defaultDesc = `Community food bank in ${data.city || data.country}.`;
  sections.push(`[DESCRIPTION]\n${defaultDesc}`);

  // Phone
  if (data.phone) {
    sections.push(`[PHONE]\n${data.phone}`);
  }

  // Email
  if (data.email) {
    sections.push(`[EMAIL]\n${data.email}`);
  }

  // Website
  if (data.website) {
    sections.push(`[WEBSITE]\n${data.website}`);
  }

  // Services
  if (data.services && data.services.length > 0) {
    const servicesText = data.services.map((s) => `- ${s}`).join('\n');
    sections.push(`[SERVICES]\n${servicesText}`);
  }

  // Eligibility
  if (data.eligibility) {
    sections.push(`[ELIGIBILITY]\n${data.eligibility}`);
  }

  // Social media
  const socialLinks: string[] = [];
  if (data.social?.facebook) {
    socialLinks.push(`Facebook: ${data.social.facebook}`);
  }
  if (data.social?.twitter) {
    socialLinks.push(`Twitter: ${data.social.twitter}`);
  }
  if (data.social?.instagram) {
    socialLinks.push(`Instagram: ${data.social.instagram}`);
  }
  if (socialLinks.length > 0) {
    sections.push(`[SOCIAL]\n${socialLinks.join('\n')}`);
  }

  // Data source attribution
  sections.push(`[SOURCE]\nImported from ${data.source} (ID: ${data.sourceId})`);

  return sections.join('\n\n');
}

/**
 * Format stripped address (city, country display)
 */
function formatStrippedAddress(data: RawFoodbankData): string {
  const parts: string[] = [];

  if (data.city) parts.push(data.city);
  if (data.state) parts.push(data.state);
  if (data.country) parts.push(data.country);

  return parts.join(', ') || data.country;
}

/**
 * Convert raw foodbank data to database record
 */
export function toImportRecord(
  data: RawFoodbankData,
  coordinates: Coordinates,
  postType: 'food_bank' | 'fridge' = 'food_bank'
): FoodbankImportRecord {
  // Format PostGIS location string
  const locationStr = `SRID=4326;POINT(${coordinates.longitude} ${coordinates.latitude})`;

  return {
    post_name: data.name.substring(0, 255), // Truncate if too long
    post_type: postType,
    post_description: formatDescription(data),
    post_address: data.address || formatStrippedAddress(data),
    post_stripped_address: formatStrippedAddress(data),
    location: locationStr,
    images: [],
    available_hours: data.hours || '',
    transportation: '',
    is_active: true,
    profile_id: SYSTEM_USER_ID,
    website: data.website || '',
  };
}

/**
 * Parse structured description to extract metadata
 * (Useful for reading back the data)
 */
export function parseDescription(description: string): Record<string, string> {
  const result: Record<string, string> = {};
  const sections = description.split(/\n\n/);

  for (const section of sections) {
    const match = section.match(/^\[([A-Z]+)\]\n([\s\S]+)$/);
    if (match) {
      const [, key, value] = match;
      result[key.toLowerCase()] = value.trim();
    }
  }

  return result;
}
