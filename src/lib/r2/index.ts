/**
 * Cloudflare R2 Storage Module
 *
 * Re-exports all R2 client functions for convenient imports:
 * import { uploadToR2, isR2Configured } from '@/lib/r2';
 */

export {
  isR2Configured,
  isR2ConfiguredAsync,
  getR2PublicUrl,
  uploadToR2,
  deleteFromR2,
  existsInR2,
  getPresignedUpload,
  type R2UploadResult,
  type R2OperationResult,
} from "./client";

export { getR2Secrets, clearR2SecretsCache, type R2Secrets } from "./vault";
