# EMC Frontend — Deployment Checklist

Step-by-step guide for every production deployment.
Run steps in order. Do not skip sections marked **BLOCKING**.

---

## 0. Pre-Deployment Gates (BLOCKING)

All of the following must be true before any deployment proceeds:

```bash
npm ci                  # clean install from lockfile
npx tsc --noEmit        # 0 TypeScript errors
npm test                # 52/52 tests pass
npm run build           # exits 0
```

If any command exits non-zero: **stop, fix, re-run before continuing.**

---

## 1. Environment Variables

### Required (build fails without these)

| Variable | Example | Notes |
|---|---|---|
| `VITE_API_URL` | `https://api.emc.sa/api` | Must be HTTPS in production |
| `VITE_APP_ENV` | `production` | Accepted: `production`, `staging`, `development` |

### Optional (features degrade gracefully if absent)

| Variable | Example | Notes |
|---|---|---|
| `VITE_SENTRY_DSN` | `https://xxx@sentry.io/yyy` | Requires `npm install @sentry/react` |
| `VITE_API_BASE_URL` | `https://api.emc.sa/api` | Fallback if `VITE_API_URL` unset |

### Never expose in frontend `.env`

- `STRIPE_SECRET` — backend only
- `PAYPAL_LIVE_CLIENT_SECRET` — backend only
- Any database credentials

### Set-up

```bash
cp .env.example .env
# Edit .env with production values
# Verify:
grep VITE_API_URL .env          # must not be localhost
grep VITE_APP_ENV .env          # must be "production"
```

---

## 2. Build Commands

```bash
# 1. Clean install (use ci not install for reproducible builds)
npm ci

# 2. Type-check only
npx tsc --noEmit

# 3. Run tests
npm test

# 4. Production build
npm run build

# 5. Preview build locally before deploying
npm run preview
# Visit http://localhost:4173 — verify:
# - App loads without blank screen
# - Login works
# - Dashboard loads for each role
# - No console errors
```

### Expected output

```
✓ 3246 modules transformed
✓ built in ~3s
vite-plugin-image-optimizer: logo -32% (369kB → 252kB)
```

---

## 3. Hosting Setup

### Static file server requirements

- Serve `dist/index.html` for all paths that don't match a static file (SPA routing)
- Serve files with gzip or Brotli compression

### Nginx (recommended)

```nginx
server {
    listen 443 ssl http2;
    server_name app.emc.sa;
    root /var/www/emc-frontend/dist;
    index index.html;

    # SPA: all non-file routes → index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Aggressive caching for fingerprinted assets (JS/CSS/images have hash in filename)
    location ~* \.(js|css|woff2?|png|jpg|webp|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # No cache for index.html (always fetch latest)
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        expires 0;
    }

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://api.emc.sa https://sentry.io https://*.sentry.io; worker-src 'self' blob:;" always;
}
```

### Caddy alternative

```caddy
app.emc.sa {
    root * /var/www/emc-frontend/dist
    encode gzip
    try_files {path} /index.html
    file_server
    header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    header X-Frame-Options "DENY"
    header X-Content-Type-Options "nosniff"
}
```

### Vercel / Netlify

Create `public/_redirects` (Netlify) or `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 4. Cache Headers Strategy

| Resource | Cache-Control | Reason |
|---|---|---|
| `index.html` | `no-cache` | Always fresh — entry point to hashed assets |
| `dist/assets/*.js` | `public, immutable, max-age=31536000` | Filename hash changes with content |
| `dist/assets/*.css` | `public, immutable, max-age=31536000` | Same |
| `dist/assets/logo-*.png` | `public, immutable, max-age=31536000` | Hash-fingerprinted |
| `dist/assets/favicon*.svg` | `public, max-age=86400` | No hash — daily revalidation |

---

## 5. Deployment Steps

```bash
# On CI or deployment server:

# 1. Pull latest code
git pull origin main

# 2. Install exact deps
npm ci

# 3. Validate environment
cp .env.production .env           # or inject vars from secrets manager
grep VITE_API_URL .env            # confirm non-localhost

# 4. Build
npm run build                     # must exit 0

# 5. Deploy dist/ to web server
rsync -avz --delete dist/ deploy@server:/var/www/emc-frontend/dist/
# OR: upload to S3/CDN bucket
# OR: commit dist/ to deployment branch

# 6. Verify
curl -s -o /dev/null -w "%{http_code}" https://app.emc.sa/
# → 200

curl -s -o /dev/null -w "%{http_code}" https://app.emc.sa/dashboard/student
# → 200 (SPA fallback works)
```

---

## 6. Rollback Plan

### Fast rollback (< 2 min)

Keep the previous `dist/` in a dated backup before every deploy:

```bash
# Before deploying new version:
cp -r /var/www/emc-frontend/dist /var/www/emc-frontend/dist-backup-$(date +%Y%m%d-%H%M)

# Rollback:
rm -rf /var/www/emc-frontend/dist
cp -r /var/www/emc-frontend/dist-backup-20250601-1430 /var/www/emc-frontend/dist
```

### CI/CD rollback

If using GitHub Actions / GitLab CI, tag each successful deploy:

```bash
git tag deploy-$(date +%Y%m%d-%H%M) && git push --tags
# Rollback: checkout previous tag, rebuild, redeploy
```

### Emergency kill switch

If the app is completely broken and rollback will take time:

```nginx
# Replace dist/index.html temporarily with a maintenance page:
location / {
    return 503 "المنصة في وضع الصيانة. يرجى المحاولة لاحقاً.";
    add_header Content-Type "text/html; charset=utf-8";
}
```

---

## 7. Post-Deploy Smoke Test

Run these within 5 minutes of every deploy:

```
[ ] https://app.emc.sa loads (HTTP 200)
[ ] Login as student → dashboard loads
[ ] Notification bell visible
[ ] No "لم يتم العثور على البيانات" where real data should appear
[ ] Browser console has no red errors
[ ] Network tab: API calls go to api.emc.sa (not localhost)
[ ] Check Sentry dashboard for any spike in errors
```

---

## 8. Monitoring

| Tool | Purpose | Setup |
|---|---|---|
| Sentry | Frontend error tracking | Set `VITE_SENTRY_DSN` + `npm i @sentry/react` |
| UptimeRobot / BetterUptime | Uptime monitoring | Monitor `https://app.emc.sa/` |
| Backend `/api/health` | System health | Monitor every 60s from infra |
| Nginx access log | Traffic/errors | `tail -f /var/log/nginx/access.log` |
