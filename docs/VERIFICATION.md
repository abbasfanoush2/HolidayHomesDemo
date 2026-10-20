# Verification report

Validated in the prepared cloud instance on 20 October 2026 using Node.js 24.19.0, npm 11.9.0 and the installed system Chromium. All application data, AI, integrations and side effects are local simulations.

## Completed checks

| Check                       | Result                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Clean lockfile installation | `bash scripts/cloud-install.sh` completed: `npm ci`, type checking, lint, domain tests and production build                                                                                |
| TypeScript                  | `npm run typecheck` passed; the final production build also type-checks                                                                                                                    |
| ESLint                      | `npm run lint` passed                                                                                                                                                                      |
| Domain and workflow tests   | `npm test`: **72 passed**, 0 failed, 0 skipped across three files                                                                                                                          |
| Browser suite               | 28 browser checks passed across the full run and targeted rechecks; no failures remain                                                                                                     |
| Production build            | `npm run build` passed; React, Motion and charts are split into separate chunks                                                                                                            |
| Production runtime          | Compiled overview, complete arrival rescue, refresh persistence and native finance ledgers exercised in Chromium without runtime errors                                                    |
| Routes and network boundary | All 21 routes rendered; no mandatory external requests, missing remote assets, runtime errors or NaN output in the route smoke test                                                        |
| Responsive checks           | Overview, command centre, reservations, operations, pricing, finance and approvals checked at 1920, 1440, 1280, 1024 and 390 CSS pixels; no document overflow                              |
| Accessibility               | Axe WCAG 2 A/AA and WCAG 2.1 AA checks found no violations on the seven representative operating screens, approval drawer and mobile overview; dialog Escape/focus behavior also exercised |
| Exports and persistence     | Actual CSV download, command/history restoration, language switch, virtual time, pause/reset, corrupt-state recovery and owner-scope controls exercised                                    |
| Repository preservation     | The selected repository began without commits or tracked files. Setup created this project and lockfile; existing attachments and unrelated workspace files were preserved                 |

The original 36 domain tests include all five scenarios in each of the three countries, plus replay, stale evidence, idempotency, shared accounting, blocked availability, receipt expenses, owner fees/tax, DST, removed inspection evidence, full-log ID uniqueness, and finance-role approval enforcement during scenario playback. A quote approval alone never makes the property Ready.

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

The 36-second reference was re-reviewed at half-second intervals and full resolution. The dashboard, AI insight composition, approval register and schedule were rebuilt around its layout and motion. The interface includes animated counters/gauges, shared navigation/tab selection, staggered cards/rows, schedule bars/dependencies, sliding drawers with exit transitions, approval stamps/particles, and copilot/toast feedback. Both reduced-motion settings preserve working actions and final data. See [design and motion](DESIGN_MOTION.md).

Updated visual captures and a 26-second animation walkthrough are retained under `/workspace/staypilot-qa/redesign/`, including `StayPilot-motion-preview.mp4`. Production smoke checks exercised direct routes, the complete arrival rescue and refresh persistence, and confirmed the bundled Manrope font loaded with no runtime errors. New browser checks verify dismissal/restore, approved source state with unresolved repair, schedule controls/evidence, and both motion preferences. Accessibility scans wait for entrance opacity to settle before measuring contrast.

## Automatic-market verification

- Mocked Vercel ES/IT/GB headers, missing/unsupported/malformed headers, independent sequential visitors, GET/HEAD/method handling, private/no-store and both CDN no-store headers.
- URL → deliberate manual → IP → supported browser language → UK fallback priority; all three deep market links, retained outreach parameters, old saved EN migration, refresh, Automatic reset and a delayed-detection/manual-selection race.
- Neutral initial loading with no English dashboard observed for ES/IT; document locale and page titles, independent language/currency controls, initial filters without repeated navigation resets.
- Exact £1,234.56 / 1.234,56 € formatting, fixed demo FX conversion, unchanged native ledgers/transactions/pricing bounds/quantities and property-local deadlines.
- All five scenarios across three countries and three interface languages (45 combinations), restoring message codes between steps; translated earlier events/replies and multilingual copilot intents.
- All 21 routes in both Spanish and Italian; finance tabs/source drawer, translated CSV downloads, native validation messages, owner statement print PDFs, scenario/copilot interaction and 390px longer-text layouts.
- Existing workflow, motion and representative Axe accessibility checks remain enabled. Two old browser expectations were updated for the new country-scoped default (one pending UK decision rather than three portfolio-wide decisions) and the accessible market popover's translated language control, then passed on recheck. Tab selection animations were also verified after the render-time translation integration.

Localisation evidence lives in `/workspace/staypilot-qa/localisation/`, including finance/Studio mobile captures and Spanish/Italian owner-statement PDFs. See [implementation and preference rules](LOCALISATION.md).

Actual Vercel edge-header injection, deployed CDN behavior and real-country/VPN geolocation were **not** tested. Local tests mock country headers or the same-origin country response; they add no public IP-address override. Safari and Firefox were not tested.

## Environment configuration

The complete tested `install_script` and service/readiness instructions in `start_skill` were saved to the environment draft. No new secrets or network domains are needed. Dependencies/build outputs are retained filesystem state; servers and browser connections must restart in future tasks. Review and save the configuration in environment settings, then publish the environment through the product.

## Boundaries

This verifies the current cloud instance and local demo. Publication and restoration into a fresh task have not been performed or verified. Chromium was tested; Safari/Firefox and real external providers were not. Automated accessibility scans and representative visual checks do not establish exhaustive accessibility conformance or a guarantee of defect-free software.

The assistant supports documented deterministic intents rather than unrestricted live reasoning. The prepared experience, including finance, fictional descriptions/messages, dynamic agent history, copilot responses, accessibility labels, exports and print statements, uses central EN/ES/IT dictionaries. Proper names, technical identifiers and arbitrary visitor-entered prose remain authored content. Simulated roles are demonstrative views and command rules, not production authentication. Monitoring pauses when the demo tab is hidden or closed. Accounting, tax, market signals and forecasts are illustrative assumptions; no real communication, prices, booking, payout, safety certification or legal/tax conclusion is produced.
