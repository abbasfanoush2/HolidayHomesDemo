# Vercel deployment

Import `abbasfanoush2/HolidayHomesDemo` from GitHub into the intended Vercel account/team. The root directory is the repository root. `vercel.json` selects Vite, runs `npm ci` and `npm run build`, publishes `dist`, and routes application URLs back to `index.html` for React Router.

No application environment variables, API keys or backend services are required. Git credentials and Vercel deployment credentials belong to the deployment tooling and must never be committed or exposed as `VITE_` variables.

With Vercel CLI authentication available, deploy from the repository root using:

```bash
npx vercel@64.7.0 --prod
```

Choose the intended account/team and this project if the CLI requests a project link. In the managed cloud environment, CLI data/cache/config directories must use writable paths under `/workspace`, and outbound HTTPS access to `api.vercel.com` must be available. Authentication can use a securely configured `VERCEL_TOKEN` scoped to the intended account/team. Never enter a token in chat or save it in this repository.

After Vercel reports a successful production deployment, verify the returned production URL and direct visits to `/studio`, `/properties`, `/reservations`, `/operations`, `/revenue` and `/finance`. Confirm hashed JavaScript/CSS assets load with their correct content types. Run the arrival-rescue scenario and refresh a nested route to check SPA fallback and browser-local persistence.

Every browser has independent synthetic demo state in localStorage. The public website still uses simulated AI, prepared content and fictional records; no real messages, bookings, rate updates or payments occur. Hosting does not turn the browser simulation into a background monitoring service.
