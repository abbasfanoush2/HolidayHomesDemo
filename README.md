# StayPilot AI

A local, fictional holiday-home operating system for a 36-home UK, Spain and Italy portfolio. **Demo • Synthetic data • Simulated AI.** No keys, database server, accounts or live integrations are required. Nothing sends a real message, changes an external rate or moves money.

## Run

Use Node.js 22 or 24 and npm (the prepared cloud environment has Node 24).

```bash
cd /workspace/HolidayHomesDemo
npm ci
npm run dev
```

Open the running app at port 5173 in your own development environment. `/` is the overview; `/studio` is the direct presentation entry route. The cloud onboarding interface does not provide a web preview. In future cloud tasks use this existing checkout; do not create another worktree unless explicitly requested.

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

The browser suite uses the environment's installed `/usr/bin/chromium`. Set `CHROMIUM_PATH` to another installed Chromium binary when needed. On another machine install Chromium through its supported package manager. `npm run preview` serves the production build. The app uses browser history routing; `vercel.json` supplies the index.html fallback for direct route visits and refreshes. See [Vercel deployment](docs/DEPLOYMENT.md).

## Present

1. Open `/studio` and select UK, Spain or Italy.
2. Launch **Rescue an arrival**. Use **Next step** to control the story or **Auto-play** for a timed replay.
3. Inspect the property after the cost approval: the critical issue still blocks readiness.
4. Continue through repair evidence, independent verification and inspection. The home becomes Ready only after all evidence is complete.
5. Open Finance, the owner statement and the audit history to see the same changes.

Settings → Reset demo restores the fixed seed, every scenario, policy, clock, conversation, approval and ledger. The virtual clock begins on **20 October 2026, 08:00 UTC / 09:00 London**. Clock progression and agent scheduling stop when the tab is hidden. Reload restores the saved business state with clock and presentation playback paused; no closed-tab monitoring is claimed.

The entire prepared experience supports British English, Spanish and Italian, including finance, records, agent history, copilot, exports and print statements. Initial preferences follow a market link, deliberate manual choice, IP country, browser language, then UK fallback. The globe control provides manual choices and Automatic. GBP/EUR ledgers remain separate; display conversion uses **€1 = £0.86 DEMO FX**. See [localisation and preference rules](docs/LOCALISATION.md).

## Explore

- Today: overview, command centre, evidence-linked risk matrix, agent runs.
- Portfolio: property creation/editing, detail tabs, multi-home booking calendar, overlap-validated reservations, unified simulated inbox.
- Operations: readiness board/list/timeline, cleaning and inspection checklists, local image evidence, maintenance lifecycle, approvals, stock and receipt workflows, suppliers and feasible shift assignments.
- Commercial: available-night pricing proposals, bounded execution and safe undo, growth tasks, guest feedback and prepared replies.
- Finance: native ledgers, duplicate exception review, unique draft invoices, matching/posting, balances, owner statements, CSV and print reports.
- Administration: documents and renewal tasks, approvals, audit events, demo roles, permission policies, virtual time and simulated integration replay.

Rename the demo in `src/domain/seed.ts` (`BRAND`). The brand is fictional; no trademark clearance is implied. All local illustrations were drawn for this demo; no reference-video identity or business data was reused.

See [architecture](docs/ARCHITECTURE.md), [scenario and data guide](docs/SCENARIOS.md), [five-minute demo script](docs/DEMO_SCRIPT.md), [implementation checklist](docs/CHECKLIST.md) and [verification report](docs/VERIFICATION.md).

The [design and motion guide](docs/DESIGN_MOTION.md) maps the supplied reference recording to the interface: sweeping gauges, animated numbers, spring navigation, timeline dependencies, sliding drawers, approval stamps and particles. Settings → Presentation motion and the system reduced-motion preference control animation. The bundled Manrope font works without external requests.
