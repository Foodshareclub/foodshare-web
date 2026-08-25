#!/bin/bash
set -x
cd /Users/organic/dev/work/foodshare/foodshare-backend/supabase/functions

# 1. apple-jws.ts
sed -i '' 's/const _rootCert = x5c\[x5c.length - 1\];/\/\/ const _rootCert = x5c[x5c.length - 1];/g' _shared/subscriptions/apple-jws.ts

# 2. users.ts
sed -i '' 's/name = "ValidationError";/override name = "ValidationError";/g' api-v1-admin/lib/users.ts
sed -i '' 's/name = "NotFoundError";/override name = "NotFoundError";/g' api-v1-admin/lib/users.ts

# 3. app-attest.ts
sed -i '' 's/rawSignature,/rawSignature as any,/g' api-v1-attestation/lib/app-attest.ts
sed -i '' 's/const x5c = cbor.attStmt?.x5c as Uint8Array\[\] | undefined;/const x5c = cbor.attStmt?.x5c as any;/g' api-v1-attestation/lib/app-attest.ts

# 4. engagement/index.ts
sed -i '' 's/type BatchOperation = z.infer<typeof batchOperationSchema>;//g' api-v1-engagement/index.ts

# 5. threads.ts
sed -i '' 's/const data = await service.getPost(postId, userId);/const data = await service.getPost(postId, userId || undefined);/g' api-v1-forum/lib/threads.ts

# 6. recompression.ts
sed -i '' 's/const _cutoffDate = options.cutoffDate ?? "2026-02-06T00:00:00Z";/\/\/ const _cutoffDate = options.cutoffDate ?? "2026-02-06T00:00:00Z";/g' api-v1-images/services/recompression.ts
sed -i '' 's/const _originalSize = fileData.size;/\/\/ const _originalSize = fileData.size;/g' api-v1-images/services/recompression.ts

# 7. get-translations.ts
sed -i '' 's/const contentId = String(item.id);/const contentId = String((item as any).id);/g' api-v1-localization/handlers/get-translations.ts
sed -i '' 's/const sourceText = item\[dbColumn\];/const sourceText = (item as any)[dbColumn];/g' api-v1-localization/handlers/get-translations.ts

# 8. process-queue.ts
sed -i '' 's/const _isCompleteFailure = result.quality === 0 || result.text === item.source_text;/\/\/ const _isCompleteFailure = result.quality === 0 || result.text === item.source_text;/g' api-v1-localization/handlers/process-queue.ts

# 9. translate-content.ts
sed -i '' 's/err as Error/err as any/g' api-v1-localization/handlers/translate-content.ts
sed -i '' 's/return llmTranslationService.batchTranslate(texts, "en", targetLocale, contentType);/return llmTranslationService.batchTranslate(texts, "en", targetLocale, contentType) as any;/g' api-v1-localization/handlers/translate-content.ts
sed -i '' 's/type TranslateResponse = {/\/\/ type TranslateResponse = {/g' api-v1-localization/handlers/translate-content.ts

# 10. translations.ts
sed -i '' 's/const _acceptEncoding = request.headers.get("Accept-Encoding") || "";/\/\/ const _acceptEncoding = request.headers.get("Accept-Encoding") || "";/g' api-v1-localization/handlers/translations.ts

# 11. ui-strings.ts
sed -i '' 's/error as Error/error as any/g' api-v1-localization/handlers/ui-strings.ts
sed -i '' 's/const _startTime = Date.now();/\/\/ const _startTime = Date.now();/g' api-v1-localization/handlers/ui-strings.ts

# 12. llm-translation.ts
sed -i '' 's/private readonly FALLBACK_TIMEOUT = 8000;/\/\/ private readonly FALLBACK_TIMEOUT = 8000;/g' api-v1-localization/services/llm-translation.ts
sed -i '' 's/let _usedService = "llm";/\/\/ let _usedService = "llm";/g' api-v1-localization/services/llm-translation.ts

# 13. subscription apple.ts
sed -i '' 's/"ONE_TIME_CHARGE": () => "unknown",/\/\/ "ONE_TIME_CHARGE": () => "unknown",/g' api-v1-subscription/handlers/apple.ts

# 14. subscription stripe.ts
sed -i '' 's/objectType: dataObject.object,/objectType: (dataObject as any).object,/g' api-v1-subscription/handlers/stripe.ts

