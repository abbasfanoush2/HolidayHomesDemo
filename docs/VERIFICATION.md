# Verification report

Validated in the prepared cloud instance on 20 October 2026 using Node.js 24.19.0, npm 11.9.0 and the installed system Chromium. All application data, AI, integrations and side effects are local simulations.

## Completed checks

| Check                       | Result                                                                                                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean lockfile installation | `bash scripts/cloud-install.sh` completed: `npm ci`, type checking, lint, domain tests and production build                                                                              |
| TypeScript                  | `npm run typecheck` passed; the final production build also type-checks                                                                                                                  |
| ESLint                      | `npm run lint` passed                                                                                                                                                                    |
| Domain and workflow tests   | `npm test`: **36 passed**, 0 failed, 0 skipped across two files                                                                                                                          |
| Browser suite               | `npm run test:e2e`: **9 passed**, 0 failed, 0 skipped; the arrival-rescue flow was rechecked after the final role-policy correction                                                      |
| Production build            | `npm run build` passed; React, Motion and charts are split into separate chunks                                                                                                          |
| Production runtime          | Compiled overview, complete arrival rescue, refresh persistence and native finance ledgers exercised in Chromium without runtime errors                                                  |
| Routes and network boundary | All 21 routes rendered; no mandatory external requests, missing remote assets, runtime errors or NaN output in the route smoke test                                                      |
| Responsive checks           | Overview, command centre, reservations, operations, pricing and finance checked at 1920, 1440, 1280, 1024 and 390 CSS pixels; no document overflow                                       |
| Accessibility               | Axe WCAG 2 A/AA and WCAG 2.1 AA checks found no violations on the six representative operating screens, approval drawer and mobile overview; dialog Escape/focus behavior also exercised |
| Exports and persistence     | Actual CSV download, command/history restoration, language switch, virtual time, pause/reset, corrupt-state recovery and owner-scope controls exercised                                  |
| Repository preservation     | The selected repository began without commits or tracked files. Setup created this project and lockfile; existing attachments and unrelated workspace files were preserved               |

The 36 domain tests include all five scenarios in each of the three countries, plus replay, stale evidence, idempotency, shared accounting, blocked availability, receipt expenses, owner fees/tax, DST, removed inspection evidence, full-log ID uniqueness, and finance-role approval enforcement during scenario playback. A quote approval alone never makes the property Ready.

## Visual evidence

QA captures are retained outside the checkout in `/workspace/staypilot-qa/`:

- `overview-1440.png`, `overview-390.png`
- `command-1440.png`, `command-390.png`
- `reservations-1440.png`, `reservations-390.png`
- `operations-1440.png`, `operations-390.png`
- `revenue-1440.png`, `revenue-390.png`
- `finance-1440.png`, `finance-390.png`
- `approval-1440.png`, `approval-390.png`
- `assistant-1440.png`, `assistant-390.png`

The reference video was inspected through sampled frames/contact sheets, including dashboard, insight cards, schedule/timeline, approvals and drawer transitions. Its identity and business content were not reused. Text contrast, unnamed buttons, modal capture timing and chart transition duration were corrected during QA.

## Environment configuration

The complete tested `install_script` and service/readiness instructions in `start_skill` were saved to the environment draft. No new secrets or network domains are needed. Dependencies/build outputs are retained filesystem state; servers and browser connections must restart in future tasks. Review and save the configuration in environment settings, then publish the environment through the product.

## Boundaries

This verifies the current cloud instance and local demo. Publication and restoration into a fresh task have not been performed or verified. Chromium was tested; Safari/Firefox and real external providers were not. Automated accessibility scans and representative visual checks do not establish exhaustive accessibility conformance or a guarantee of defect-free software.

The assistant supports documented deterministic intents rather than unrestricted live reasoning. Prepared business narratives and fictional source-record content can remain in their authored language; the shared navigation, core headers, common controls/statuses, tabs, assistant interactions, reply templates and scenario steps have EN/ES/IT dictionaries. Simulated roles are demonstrative views and command rules, not production authentication. Monitoring pauses when the demo tab is hidden or closed. Accounting, tax, market signals and forecasts are illustrative assumptions; no real communication, prices, booking, payout, safety certification or legal/tax conclusion is produced.
