# Vercel deployment

Import `abbasfanoush2/HolidayHomesDemo` from GitHub into the intended Vercel account/team. The root directory is the repository root. `vercel.json` selects Vite, runs `npm ci` and `npm run build`, publishes `dist`, and routes application URLs back to `index.html` for React Router while preserving `/api/*` function routes. Vercel builds `api/market.ts` as a same-origin function; do not deploy only the `dist` folder to static hosting if IP-country detection is required.

No application environment variables, API keys or separate backend services are required. The market function uses Vercel’s supplied country header; local development/preview and static-only hosting fall back to browser language. Git credentials and Vercel deployment credentials belong to the deployment tooling and must never be committed or exposed as `VITE_` variables.

With Vercel CLI authentication available, deploy from the repository root using:

```bash
npx vercel@64.7.0 --prod
```

Choose the intended account/team and this project if the CLI requests a project link. In the managed cloud environment, CLI data/cache/config directories must use writable paths under `/workspace`, and outbound HTTPS access to `api.vercel.com` must be available. Authentication can use a securely configured `VERCEL_TOKEN` scoped to the intended account/team. Never enter a token in chat or save it in this repository.

After Vercel reports a successful production deployment, verify the returned production URL and direct visits to `/studio`, `/properties`, `/reservations`, `/operations`, `/revenue` and `/finance`. Confirm hashed JavaScript/CSS assets load with their correct content types. Run the arrival-rescue scenario and refresh a nested route to check SPA fallback and browser-local persistence.

Check `/finance?market=es`, `/studio?market=it` and `/properties?market=uk` as well as Automatic/manual selection. Confirm `/api/market` returns only a supported country or null with private/no-store and CDN no-store headers. Its actual edge-injected country and deployed cache behavior require verification on Vercel; local tests mock headers rather than using a VPN. See [localisation](LOCALISATION.md).

Every browser has independent synthetic demo state in localStorage. The public website still uses simulated AI, prepared content and fictional records; no real messages, bookings, rate updates or payments occur. Hosting does not turn the browser simulation into a background monitoring service.
