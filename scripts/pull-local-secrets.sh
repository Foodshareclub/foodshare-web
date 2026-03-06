#!/usr/bin/env bash
set -e

# ==============================================================================
# pull-local-secrets.sh
# 
# Helper script to pull operational secrets from the FoodShare backend stack 
# into your local `.env.local` file for development.
# ==============================================================================

# 1. Ensure you have the base Supabase variables in your `.env.local`
ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found. Please copy .env.example to $ENV_FILE and fill in the NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  exit 1
fi

# Extract the SERVICE_ROLE_KEY (used to auth to the database if needed, though here we'll use SSH or direct files if running locally alongside the backend)
SERVICE_ROLE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' "$ENV_FILE" | cut -d '=' -f 2-)

echo "==> Pulling operational secrets from FoodShare backend..."

# We assume the backend repository is checked out at ../foodshare-backend
BACKEND_DIR="../foodshare-backend"

if [ ! -d "$BACKEND_DIR" ]; then
  echo "Error: Backend directory not found at $BACKEND_DIR."
  echo "Please run this script from the root of the foodshare-web repository, and ensure foodshare-backend is checked out alongside it."
  exit 1
fi

echo "--- 1. Pulling edge function secrets (.env.functions) ---"
if [ -f "$BACKEND_DIR/.env.functions" ]; then
  # Extract valid env vars, excluding comments and empty lines, and append to our local env if they don't already exist
  grep -E '^[A-Za-z0-9_]+=' "$BACKEND_DIR/.env.functions" | while read -r line; do
    key=$(echo "$line" | cut -d '=' -f 1)
    # Check if key already exists in .env.local
    if ! grep -q "^$key=" "$ENV_FILE"; then
      echo "$line" >> "$ENV_FILE"
    else
      # Update existing key
      # Using sed to replace the entire line for existing keys
      # macOS sed requires '' after -i
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^$key=.*|$line|g" "$ENV_FILE"
      else
        sed -i "s|^$key=.*|$line|g" "$ENV_FILE"
      fi
    fi
  done
  echo "✅ Edge function secrets injected."
else
  echo "⚠️ Warning: $BACKEND_DIR/.env.functions not found. Skipping edge function secrets."
fi

echo "--- 2. Pulling Vault secrets (from Supabase Database) ---"
# Check if the local database container is running
if docker ps | grep -q 'supabase-db'; then
  echo "Extracting decrypted secrets from local vault..."
  # Run purely locally assuming the user has the backend running via docker-compose
  # If remote, they'd need to SSH or connect via psql, but this is a local dev script
  SECRETS=$(docker exec supabase-db psql -U postgres -d postgres -A -t -c "SELECT name || '=' || secret FROM vault.decrypted_secrets;")
  
  if [ -n "$SECRETS" ]; then
    echo "$SECRETS" | while read -r line; do
      if [ -z "$line" ]; then continue; fi
      key=$(echo "$line" | cut -d '=' -f 1)
      if ! grep -q "^$key=" "$ENV_FILE"; then
        echo "$line" >> "$ENV_FILE"
      else
        if [[ "$OSTYPE" == "darwin"* ]]; then
          sed -i '' "s|^$key=.*|$line|g" "$ENV_FILE"
        else
          sed -i "s|^$key=.*|$line|g" "$ENV_FILE"
        fi
      fi
    done
    echo "✅ Vault secrets injected."
  else
    echo "ℹ️ No secrets found in the vault."
  fi
else
  echo "⚠️ Warning: supabase-db container is not running. Skipping vault secrets."
  echo "Make sure you run 'docker compose up -d' in the foodshare-backend directory if you want vault secrets."
fi

echo "==> Done! Your $ENV_FILE is now synchronized with the backend operational secrets."
