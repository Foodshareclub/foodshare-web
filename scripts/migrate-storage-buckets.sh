#!/bin/bash

# Script to migrate files from avatars-posts bucket to posts bucket
# Usage: ./scripts/migrate-storage-buckets.sh

set -e

echo "🚀 Starting migration from avatars-posts to posts bucket..."

# Get list of all files in avatars-posts bucket
echo "📋 Fetching file list from avatars-posts bucket..."
FILES=$(supabase storage --experimental ls -r ss:///avatars-posts | grep -v "/$" | grep -v ".emptyFolderPlaceholder" | awk '{print $1}' | sed 's|/avatars-posts/||')

# Count total files
TOTAL=$(echo "$FILES" | wc -l | tr -d ' ')
echo "📦 Found $TOTAL files to migrate"

# Counter
COUNT=0

# Copy each file
while IFS= read -r file; do
    if [ -n "$file" ]; then
        COUNT=$((COUNT + 1))
        echo "[$COUNT/$TOTAL] Copying: $file"
        
        # Copy file from avatars-posts to posts
        supabase storage --experimental cp "ss:///avatars-posts/$file" "ss:///posts/$file" 2>&1 || echo "  ⚠️  Failed to copy $file (may already exist)"
    fi
done <<< "$FILES"

echo ""
echo "✅ Migration complete!"
echo "📊 Processed $COUNT files"
echo ""
echo "Next steps:"
echo "1. Verify files in posts bucket: supabase storage --experimental ls -r ss:///posts"
echo "2. Test the application to ensure images load correctly"
echo "3. Once verified, you can delete the avatars-posts bucket"
