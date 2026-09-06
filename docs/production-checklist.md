# EMC Frontend — Production Readiness Checklist

Run this before every production deployment.

---

## Build & Environment

- [ ] Copy `.env.example` → `.env` and fill in all values
- [ ] `VITE_API_URL=https://api.emc.sa/api` (or your production API URL)
- [ ] `VITE_APP_ENV=production`
- [ ] `npm ci` (clean install from lockfile)
- [ ] `npm run build` exits with code **0** — must show `✓ built in X.XXs`
- [ ] `npm run preview` — verify app loads at `http://localhost:4173`

## Sentry (optional but recommended)

- [ ] `npm install @sentry/react`
- [ ] Set `VITE_SENTRY_DSN` to your Sentry project DSN
- [ ] Rebuild and deploy
- [ ] Trigger a test error → verify it appears in Sentry dashboard

## Assets & Performance

| Asset | Before | After | Method |
|---|---|---|---|
| `logo.png` | 370 kB | 252 kB | vite-plugin-image-optimizer (−32%) |
| `icons.svg` | 4.9 kB | 0.67 kB | svgo (−87%) |
| `react.svg` | deleted | — | unused scaffold file |
| `vite.svg` | deleted | — | unused scaffold file |
| `hero.png` | deleted | — | unreferenced |

> **Next step:** Replace `logo.png` with a WebP export from the design tool for a further ~60% reduction. Update all 7 imports in `src/` from `logo.png` to `logo.webp`.

## Bundle Sizes (gzip, production build)

| Chunk | gzip | Notes |
|---|---|---|
| `vendor-react` | 71 kB | React runtime — cached across deploys |
| `vendor-charts` | **87 kB** | Recharts — lazy, only downloaded on chart pages |
| `vendor-router` | 15 kB | React Router |
| `vendor-motion` | 13 kB | Framer Motion |
| `vendor-http` | 15 kB | Axios |
| `vendor-sanitize` | 9 kB | DOMPurify |
| `index` (main) | 40 kB | App shell + routing |

## Security

- [ ] All `dangerouslySetInnerHTML` pass through `DOMPurify.sanitize()` ✓
- [ ] No API keys or secrets in frontend env vars
- [ ] `VITE_API_URL` must be the HTTPS production URL
- [ ] Content-Security-Policy header configured on web server (see Nginx below)

## Error Handling

- [ ] `ErrorBoundary` wraps entire app — shows Arabic "حدث خطأ غير متوقع" ✓
- [ ] `validateEnv()` runs at startup — blocks if `VITE_API_URL` is missing ✓
- [ ] No unguarded `console.log` / `console.error` in production code ✓

## Routing & Auth

- [ ] Login redirect works — unauthenticated users sent to `/login?next=...`
- [ ] Token expiry (401) clears session and redirects automatically ✓
- [ ] Notification polling every 90 s in `DashboardLayout` ✓

## Final Smoke Test

- [ ] Log in as student → verify Dashboard, My Courses, Sessions, Materials load
- [ ] Log in as admin → verify Admin Dashboard, Courses, Users load
- [ ] Click a material download → verify file downloads (not 401)
- [ ] Trigger a notification → verify bell updates and click marks read
- [ ] Log out → verify redirect to login page
- [ ] Open DevTools → verify zero seed/mock data appears when APIs return empty

---

## Recommended Nginx Config (SPA + security headers)

```nginx
server {
    listen 443 ssl http2;
    server_name app.emc.sa;

    root /var/www/emc-frontend/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache fingerprinted assets permanently
    location ~* \.(js|css|woff2?|png|jpg|webp|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.emc.sa https://sentry.io;" always;
}
```

## Quick Commands

```bash
# Clean install from lockfile
npm ci

# Type-check only (no build output)
npx tsc --noEmit

# Production build
npm run build

# Preview production build locally at :4173
npm run preview

# Check top 10 largest chunks
ls -lh dist/assets/*.js | sort -k5 -rh | head -10
```

---

## Final Go-Live Checklist

### Frontend
- [ ] `.env` has `VITE_API_URL` and `VITE_APP_ENV=production`
- [ ] `npm ci && npm run build` exits 0
- [ ] `npm run preview` — app loads, no console errors
- [ ] Nginx / Caddy config deployed with security headers
- [ ] Sentry DSN set (optional)
- [ ] Smoke test passed (login → dashboard → download → notifications)

### Backend (parallel)
- [ ] `php artisan emc:production-check` exits 0
- [ ] `GET /api/health` returns `{"status":"ok"}`
- [ ] Supervisor running: `supervisorctl status emc:*` shows `RUNNING`
- [ ] Cron active: `sudo systemctl status cron`
- [ ] First backup triggered: `php artisan emc:backup --db --storage`
