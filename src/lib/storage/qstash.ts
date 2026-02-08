/**
 * Upstash QStash Client
 * Used for background jobs, scheduled tasks, and workflows
 */
import { Client, Receiver } from "@upstash/qstash";

// Singleton instances
let qstashClient: Client | null = null;
let qstashReceiver: Receiver | null = null;

/**
 * Get QStash client instance (singleton)
 */
export function getQStashClient(): Client {
  if (!qstashClient) {
    qstashClient = new Client({
      token: process.env.QSTASH_TOKEN!,
    });
  }
  return qstashClient;
}

/**
 * Get QStash receiver for verifying webhooks (singleton)
 */
export function getQStashReceiver(): Receiver {
  if (!qstashReceiver) {
    qstashReceiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
    });
  }
  return qstashReceiver;
}

export interface PublishOptions {
  delay?: number; // Delay in seconds
  notBefore?: number; // Unix timestamp
  retries?: number;
  callback?: string; // Callback URL after completion
  failureCallback?: string; // Callback URL on failure
  deduplicationId?: string;
  contentBasedDeduplication?: boolean;
}

export interface PublishResult {
  messageId: string;
  success: boolean;
}

export interface ScheduleInfo {
  scheduleId: string;
  cron: string;
  destination: string;
  createdAt: number;
  isPaused?: boolean;
}

/**
 * Publish a message to a URL endpoint
 */
export async function publishMessage<T extends Record<string, unknown>>(
  url: string,
  body: T,
  options?: PublishOptions
): Promise<PublishResult> {
  try {
    const client = getQStashClient();

    const result = await client.publishJSON({
      url,
      body,
      delay: options?.delay,
      notBefore: options?.notBefore,
      retries: options?.retries ?? 3,
      callback: options?.callback,
      failureCallback: options?.failureCallback,
      deduplicationId: options?.deduplicationId,
      contentBasedDeduplication: options?.contentBasedDeduplication,
    });

    return { messageId: result.messageId, success: true };
  } catch (error) {
    console.error(`[QStash] Failed to publish message to ${url}:`, error);
    return { messageId: "", success: false };
  }
}

/**
 * Publish message with delay
 */
export async function publishDelayed<T extends Record<string, unknown>>(
  url: string,
  body: T,
  delaySeconds: number,
  options?: Omit<PublishOptions, "delay">
): Promise<PublishResult> {
  return publishMessage(url, body, { ...options, delay: delaySeconds });
}

/**
 * Schedule a recurring job using cron expression
 */
export async function createSchedule<T extends Record<string, unknown>>(
  scheduleId: string,
  url: string,
  cron: string,
  body?: T
): Promise<{ scheduleId: string; success: boolean }> {
  try {
    const client = getQStashClient();

    const result = await client.schedules.create({
      scheduleId,
      destination: url,
      cron,
      body: body ? JSON.stringify(body) : undefined,
    });

    return { scheduleId: result.scheduleId, success: true };
  } catch (error) {
    console.error(`[QStash] Failed to create schedule "${scheduleId}":`, error);
    return { scheduleId: "", success: false };
  }
}

/**
 * Get a schedule by ID
 */
export async function getSchedule(scheduleId: string): Promise<ScheduleInfo | null> {
  try {
    const client = getQStashClient();
    const schedule = await client.schedules.get(scheduleId);
    return {
      scheduleId: schedule.scheduleId,
      cron: schedule.cron,
      destination: schedule.destination,
      createdAt: schedule.createdAt,
      isPaused: schedule.isPaused,
    };
  } catch (error) {
    console.error(`[QStash] Failed to get schedule "${scheduleId}":`, error);
    return null;
  }
}

/**
 * Pause a schedule
 */
export async function pauseSchedule(scheduleId: string): Promise<boolean> {
  try {
    const client = getQStashClient();
    await client.schedules.pause({ schedule: scheduleId });
    return true;
  } catch (error) {
    console.error(`[QStash] Failed to pause schedule "${scheduleId}":`, error);
    return false;
  }
}

/**
 * Resume a paused schedule
 */
export async function resumeSchedule(scheduleId: string): Promise<boolean> {
  try {
    const client = getQStashClient();
    await client.schedules.resume({ schedule: scheduleId });
    return true;
  } catch (error) {
    console.error(`[QStash] Failed to resume schedule "${scheduleId}":`, error);
    return false;
  }
}

/**
 * Delete a scheduled job
 */
export async function deleteSchedule(scheduleId: string): Promise<boolean> {
  try {
    const client = getQStashClient();
    await client.schedules.delete(scheduleId);
    return true;
  } catch (error) {
    console.error(`[QStash] Failed to delete schedule "${scheduleId}":`, error);
    return false;
  }
}

/**
 * List all schedules
 */
export async function listSchedules(): Promise<ScheduleInfo[]> {
  try {
    const client = getQStashClient();
    const schedules = await client.schedules.list();

    return schedules.map((s) => ({
      scheduleId: s.scheduleId,
      cron: s.cron,
      destination: s.destination,
      createdAt: s.createdAt,
      isPaused: s.isPaused,
    }));
  } catch (error) {
    console.error(`[QStash] Failed to list schedules:`, error);
    return [];
  }
}

/**
 * Verify incoming QStash webhook signature
 */
export async function verifySignature(signature: string, body: string): Promise<boolean> {
  try {
    const receiver = getQStashReceiver();
    await receiver.verify({ signature, body });
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify request from QStash (for Next.js API routes)
 */
export async function verifyRequest(request: Request): Promise<boolean> {
  const signature = request.headers.get("upstash-signature");
  if (!signature) return false;

  const body = await request.text();
  return verifySignature(signature, body);
}

// Common job types for the application
export const JOB_TYPES = {
  SEND_EMAIL: "send-email",
  PROCESS_IMAGE: "process-image",
  CLEANUP_EXPIRED: "cleanup-expired",
  SYNC_SEARCH_INDEX: "sync-search-index",
  GENERATE_EMBEDDINGS: "generate-embeddings",
  SEND_NOTIFICATION: "send-notification",
  SYNC_ANALYTICS: "api-v1-analytics",
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

// Common cron expressions
export const CRON_SCHEDULES = {
  EVERY_MINUTE: "* * * * *",
  EVERY_5_MINUTES: "*/5 * * * *",
  EVERY_HOUR: "0 * * * *",
  EVERY_DAY_MIDNIGHT: "0 0 * * *",
  EVERY_DAY_6AM: "0 6 * * *",
  EVERY_WEEK_MONDAY: "0 0 * * 1",
  EVERY_MONTH_FIRST: "0 0 1 * *",
} as const;

/**
 * Get the full URL for a job endpoint
 */
export function getJobEndpoint(jobType: JobType | string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${baseUrl}/api/jobs/${jobType}`;
}

/**
 * Queue an email to be sent
 */
export async function queueEmail(
  to: string,
  subject: string,
  template: string,
  data: Record<string, unknown>,
  options?: { delay?: number }
): Promise<PublishResult> {
  return publishMessage(
    getJobEndpoint(JOB_TYPES.SEND_EMAIL),
    { to, subject, template, data },
    { delay: options?.delay, deduplicationId: `email-${to}-${template}-${Date.now()}` }
  );
}

/**
 * Queue image processing
 */
export async function queueImageProcessing(
  imageUrl: string,
  productId: string
): Promise<PublishResult> {
  return publishMessage(
    getJobEndpoint(JOB_TYPES.PROCESS_IMAGE),
    { imageUrl, productId },
    { deduplicationId: `image-${productId}` }
  );
}

/**
 * Queue notification
 */
export async function queueNotification(
  userId: string,
  type: string,
  data: Record<string, unknown>
): Promise<PublishResult> {
  return publishMessage(getJobEndpoint(JOB_TYPES.SEND_NOTIFICATION), {
    userId,
    type,
    data,
    timestamp: Date.now(),
  });
}

/**
 * Queue search index sync for a product
 */
export async function queueSearchIndexSync(
  productId: string,
  action: "upsert" | "delete"
): Promise<PublishResult> {
  return publishMessage(
    getJobEndpoint(JOB_TYPES.SYNC_SEARCH_INDEX),
    { productId, action },
    { deduplicationId: `search-sync-${productId}-${action}` }
  );
}

/**
 * Queue embedding generation
 */
export async function queueEmbeddingGeneration(
  contentId: string,
  contentType: "product" | "user" | "message",
  content: string
): Promise<PublishResult> {
  return publishMessage(
    getJobEndpoint(JOB_TYPES.GENERATE_EMBEDDINGS),
    { contentId, contentType, content },
    { deduplicationId: `embedding-${contentType}-${contentId}` }
  );
}
