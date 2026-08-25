#!/bin/bash
set -x
cd /Users/organic/dev/work/foodshare/foodshare-backend/supabase/functions

# 1. compression
sed -i '' 's/body: imageData,/body: imageData as any,/g' _shared/compression/index.ts
sed -i '' 's/new Blob(\[imageData\])/new Blob([imageData as any])/g' _shared/compression/index.ts

# 2. r2-storage
sed -i '' 's/body: buffer,/body: buffer as any,/g' _shared/r2-storage.ts

# 3. llm-translation
sed -i '' 's/_usedService = service;/\/\/ _usedService = service;/g' api-v1-localization/services/llm-translation.ts

# 4. stripe
sed -i '' '/type StripeSubscriptionEventType =/,/;/d' api-v1-subscription/handlers/stripe.ts

