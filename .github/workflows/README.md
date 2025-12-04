# GitHub Actions Workflows

## Localization Deployment Workflow

Automated deployment and testing for the localization edge function.

### Triggers

- **Push to main/develop**: Deploys edge function and syncs translations
- **Pull Request**: Runs tests only
- **Manual**: Can be triggered manually via GitHub Actions UI

### Jobs

#### 1. Test

- Compiles translations
- Runs test suite
- Validates edge function

#### 2. Deploy

- Deploys edge function to Supabase
- Verifies deployment with health check
- Only runs on push to main/develop

#### 3. Sync Translations

- Syncs compiled translations to database
- Only runs on push to main

#### 4. Notify

- Sends deployment notification
- Reports status of all jobs

### Required Secrets

Add these secrets to your GitHub repository:

1. **VITE_SUPABASE_URL**
   - Your Supabase project URL
   - Example: `https://xxxxx.supabase.co`

2. **VITE_SUPABASE_ANON_KEY**
   - Your Supabase anonymous key
   - Found in: Supabase Dashboard → Settings → API

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Your Supabase service role key
   - Found in: Supabase Dashboard → Settings → API
   - ⚠️ Keep this secret! Never commit to code

4. **SUPABASE_PROJECT_REF**
   - Your Supabase project reference ID
   - Example: `xxxxx` (from your project URL)

5. **SUPABASE_ACCESS_TOKEN**
   - Personal access token for Supabase CLI
   - Generate at: https://app.supabase.com/account/tokens

### Setup Instructions

1. **Generate Supabase Access Token**:

   ```bash
   # Visit https://app.supabase.com/account/tokens
   # Create new token with "All" permissions
   ```

2. **Add Secrets to GitHub**:

   ```
   Repository → Settings → Secrets and variables → Actions → New repository secret
   ```

3. **Test Workflow**:

   ```bash
   # Push to develop branch
   git checkout develop
   git push origin develop

   # Check workflow status
   # Repository → Actions → Deploy Localization Edge Function
   ```

### Workflow Status

Check workflow status at:

```
https://github.com/[your-org]/[your-repo]/actions
```

### Manual Deployment

To manually trigger deployment:

1. Go to: Repository → Actions → Deploy Localization Edge Function
2. Click "Run workflow"
3. Select branch (main or develop)
4. Click "Run workflow"

### Troubleshooting

#### Workflow fails at "Test" step

- Check if translations are compiled: `npm run compile`
- Verify test suite passes locally: `npm run test-localization`

#### Workflow fails at "Deploy" step

- Verify SUPABASE_ACCESS_TOKEN is valid
- Check SUPABASE_PROJECT_REF is correct
- Ensure Supabase CLI has permissions

#### Workflow fails at "Sync Translations" step

- Verify SUPABASE_SERVICE_ROLE_KEY is correct
- Check database schema exists
- Ensure translations are compiled

### Best Practices

1. **Always test locally first**:

   ```bash
   npm run compile
   npm run test-localization
   npm run sync-translations
   ```

2. **Use develop branch for testing**:

   ```bash
   git checkout develop
   git push origin develop
   # Verify deployment works
   ```

3. **Deploy to main only when ready**:

   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

4. **Monitor workflow logs**:
   - Check Actions tab after each push
   - Review logs for any warnings
   - Verify deployment success

### Notifications

To add Slack/Discord notifications:

1. Add webhook URL to secrets
2. Update `notify` job in workflow
3. Use appropriate action from GitHub Marketplace

Example for Slack:

```yaml
- name: Slack Notification
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Security

- ✅ All secrets are encrypted by GitHub
- ✅ Service role key never exposed in logs
- ✅ Workflow runs in isolated environment
- ✅ Only authorized users can trigger manual runs

### Monitoring

After deployment, monitor:

1. **Edge Function Logs**:

   ```bash
   supabase functions logs localization --tail
   ```

2. **Analytics**:

   ```sql
   SELECT COUNT(*) FROM translation_analytics
   WHERE timestamp > NOW() - INTERVAL '1 hour';
   ```

3. **Errors**:
   ```sql
   SELECT * FROM translation_errors
   WHERE timestamp > NOW() - INTERVAL '1 hour';
   ```
