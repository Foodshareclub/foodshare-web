// Routes
export { PATH } from "@/utils/ROUTES";

// Category Mapping
export { urlToDbType, dbToUrlType, URL_TO_DB_MAP, DB_TO_URL_MAP } from "@/utils/categoryMapping";

// Utils
export { createPhotoUrl } from "@/utils/createPhotoUrl";
export { getRandomProducts } from "@/utils/getRandomProduct";
export { navigatePhotosObject } from "@/utils/navigatePhotosObject";
export { navigationActionsSVG } from "@/utils/navigationActions";
export { settingsInfoArray } from "@/utils/settingsInfoArray";

// Storage Error Handler
export {
  detectStorageError,
  testStorageAvailability,
  clearSupabaseStorage,
  logStorageError,
  type StorageErrorType,
  type StorageErrorInfo,
} from "@/utils/storageErrorHandler";

// Mock Data
export { teamMockArray } from "./mockArray";
