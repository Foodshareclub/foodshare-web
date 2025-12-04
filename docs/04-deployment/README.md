# 🚀 Deployment Documentation

Production deployment guides and configuration for FoodShare.

## 📚 Documentation in This Section

### [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

Complete production deployment guide.

- Pre-deployment checklist
- Build configuration
- Environment variables
- Deployment steps

### [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)

Environment variable configuration.

- Required variables
- Optional variables
- Security considerations
- Platform-specific setup

### [VERCEL_SETUP.md](./VERCEL_SETUP.md)

Vercel-specific deployment.

- Project configuration
- Build settings
- Domain setup
- Favicon configuration

### [MONITORING.md](./MONITORING.md)

Production monitoring and observability.

- Error tracking
- Performance monitoring
- Analytics
- Logging

## ⚡ Quick Deployment

### Prerequisites

- [ ] Supabase project configured
- [ ] Environment variables set
- [ ] Build tested locally
- [ ] Translations compiled

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

## 🔐 Environment Variables

### Required Variables

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...

# App
VITE_APP_URL=https://foodshare.app
```

### Optional Variables

```env
# Analytics
VITE_GA_TRACKING_ID=G-XXXXXXXXXX

# Feature Flags
VITE_ENABLE_TELEGRAM_BOT=true
VITE_ENABLE_CHAT=true

# API Keys
VITE_MAPBOX_TOKEN=pk.xxx...
```

## ✅ Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Code formatted with Prettier

### Build

- [ ] Production build successful
- [ ] Bundle size optimized
- [ ] Source maps generated
- [ ] Assets optimized

### Translations

- [ ] All strings translated
- [ ] Translations compiled
- [ ] Language switcher tested

### Database

- [ ] Migrations applied
- [ ] RLS policies configured
- [ ] Indexes created
- [ ] Backup configured

### Security

- [ ] Environment variables secured
- [ ] API keys rotated
- [ ] CORS configured
- [ ] Rate limiting enabled

### Performance

- [ ] Lighthouse score > 90
- [ ] Images optimized
- [ ] Code split properly
- [ ] Caching configured

### Monitoring

- [ ] Error tracking setup
- [ ] Analytics configured
- [ ] Logging enabled
- [ ] Alerts configured

## 🏗️ Build Configuration

### Vite Config

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: "es2015",
    minify: "terser",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "chakra-ui": ["@chakra-ui/react"],
          leaflet: ["leaflet", "react-leaflet"],
        },
      },
    },
  },
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "build": "npm run compile && vite build",
    "preview": "vite preview",
    "deploy": "npm run build && vercel --prod"
  }
}
```

## 📊 Monitoring Setup

### Error Tracking (Sentry)

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});
```

### Analytics (Google Analytics)

```typescript
import ReactGA from "react-ga4";

ReactGA.initialize(import.meta.env.VITE_GA_TRACKING_ID);
```

### Performance Monitoring

```typescript
import { onCLS, onFID, onLCP } from "web-vitals";

onCLS(console.log);
onFID(console.log);
onLCP(console.log);
```

## 🔄 Deployment Workflow

### Development → Staging → Production

```bash
# 1. Development
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/my-feature

# 3. Make changes and test
npm run dev
npm run build
npm run preview

# 4. Commit and push
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature

# 5. Create PR to develop
# Review and merge

# 6. Deploy to staging
git checkout staging
git merge develop
git push origin staging
# Auto-deploys to staging environment

# 7. Test staging
# Run QA tests

# 8. Deploy to production
git checkout main
git merge staging
git push origin main
# Auto-deploys to production
```

## 🆘 Troubleshooting

### Build Fails

- Check TypeScript errors: `npm run type-check`
- Check ESLint: `npm run lint`
- Clear cache: `rm -rf node_modules/.vite`

### Environment Variables Not Working

- Ensure `VITE_` prefix
- Restart dev server after changes
- Check Vercel dashboard for production

### Translations Missing

- Run `npm run compile` before build
- Check `.po` files are committed
- Verify compiled `.js` files exist

### Performance Issues

- Check bundle size: `npm run build -- --analyze`
- Optimize images
- Enable code splitting
- Configure caching

## 📖 Related Documentation

- [Development Guide](../02-development/DEVELOPMENT_GUIDE.md)
- [Performance Guide](../02-development/PERFORMANCE_GUIDE.md)
- [Architecture](../02-development/ARCHITECTURE.md)

---

[← Back to Index](../00-INDEX.md)
