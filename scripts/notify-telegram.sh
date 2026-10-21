#!/usr/bin/env bash
# Send a Telegram message to the admin chat.
#
#   scripts/notify-telegram.sh "subject" "body"
#
# Used by the monitors. The token and chat id come from the environment
# (TELEGRAM_BOT_TOKEN, ADMIN_CHAT_ID); the same values the notification
# function uses, so a monitor and the product agree on where alerts go.
#
# Failure to send is reported, not fatal: a monitor that cannot alert should
# still exit non-zero about what it found.

set -uo pipefail

SUBJECT="${1:-FoodShare alert}"
BODY="${2:-}"

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
ADMIN_CHAT_ID="${ADMIN_CHAT_ID:-}"

if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$ADMIN_CHAT_ID" ]; then
  echo "notify-telegram: TELEGRAM_BOT_TOKEN or ADMIN_CHAT_ID is not set" >&2
  exit 1
fi

# The chat id travels in the environment, not in the argument list, so it
# never appears in the process table.
payload=$(CHAT_ID="$ADMIN_CHAT_ID" SUBJECT="$SUBJECT" BODY="$BODY" python3 -c '
import json, os
print(json.dumps({
    "chat_id": os.environ["CHAT_ID"],
    "text": "*" + os.environ["SUBJECT"] + "*\n" + os.environ["BODY"],
    "parse_mode": "Markdown",
    "disable_web_page_preview": True,
}))')

curl -sS --max-time 20 -X POST \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "$payload" >/dev/null 2>&1 || {
    echo "notify-telegram: the Telegram API call failed" >&2
    exit 1
  }
exit 0
