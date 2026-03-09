#!/bin/bash
# CI/CD Pipeline Monitor
# Monitors the latest GitHub Actions run

REPO="Foodshareclub/foodshare-web"
RUN_ID="${1:-$(gh run list --repo $REPO --limit 1 --json databaseId --jq '.[0].databaseId')}"

echo "🔍 Monitoring CI/CD Pipeline"
echo "Repository: $REPO"
echo "Run ID: $RUN_ID"
echo "URL: https://github.com/$REPO/actions/runs/$RUN_ID"
echo ""

while true; do
    # Get run status
    RUN_DATA=$(gh run view $RUN_ID --repo $REPO --json status,conclusion,jobs 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to fetch run data"
        exit 1
    fi
    
    STATUS=$(echo "$RUN_DATA" | jq -r '.status')
    CONCLUSION=$(echo "$RUN_DATA" | jq -r '.conclusion')
    
    # Clear screen and show header
    clear
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔍 CI/CD Pipeline Monitor - $(date '+%Y-%m-%d %H:%M:%S')"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Repository: $REPO"
    echo "Run ID: $RUN_ID"
    echo "Status: $STATUS"
    echo "Conclusion: ${CONCLUSION:-N/A}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Job Status:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Display jobs with status
    echo "$RUN_DATA" | jq -r '.jobs[] | 
        if .conclusion == "success" then "✅"
        elif .conclusion == "failure" then "❌"
        elif .conclusion == "cancelled" then "🚫"
        elif .conclusion == "skipped" then "⏭️"
        elif .status == "in_progress" then "⏳"
        elif .status == "queued" then "⏸️"
        else "❓"
        end + " " + .name + " (" + .status + ")"'
    
    echo ""
    
    # Check if run is complete
    if [ "$STATUS" = "completed" ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        if [ "$CONCLUSION" = "success" ]; then
            echo "🎉 Pipeline completed successfully!"
        elif [ "$CONCLUSION" = "failure" ]; then
            echo "❌ Pipeline failed!"
            echo ""
            echo "View logs: https://github.com/$REPO/actions/runs/$RUN_ID"
        elif [ "$CONCLUSION" = "cancelled" ]; then
            echo "🚫 Pipeline was cancelled"
        else
            echo "⚠️  Pipeline completed with status: $CONCLUSION"
        fi
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        break
    fi
    
    echo "Refreshing in 10 seconds... (Ctrl+C to stop)"
    sleep 10
done
