# Implementation checklist

The supplied specification guided the build. This checklist describes the working local demo, not production integrations or guarantees.

| Required module      | Implemented workflow                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A. Today / overview  | Derived briefing, readiness, arrival/departure sources, occupancy and booked accommodation, calendar/tasks, country focus, owner/operator totals and audit activity                                    |
| B. AI Command Centre | Central manager and ten specialists, scheduled checks, policy/evidence/result runs, actionable findings, approvals and four-column evidence-linked risk matrix                                         |
| C. Properties        | 36 original illustrated homes; grid/list search and filters, create/edit, readiness and ten populated detail tabs, onboarding tasks                                                                    |
| D. Reservations      | Multi-property 14-day calendar, real local create/edit/cancel, overlap and capacity validation, adjacent stays, availability blocks, synchronised turnover work and history                            |
| E. Inbox             | Simulated channels, multilingual prepared conversations, sentiment/urgency, guest matching review queue, contextual draft replies, policy-controlled local sends, service tasks                        |
| F. Operations        | Evidence-derived Ready/At risk/Not ready board, task list, timeline, SLA/due times, current-arrival countdown, named blockers and incident histories                                                   |
| G. Housekeeping      | Booking-linked cleaning work, feasible assignment, task progress, checklists, original synthetic or uploaded local room evidence, inspection pass/fail and rework                                      |
| H. Maintenance       | Source-linked issue creation, priority/asset/supplier/cost responsibility, quote revisions and stale approvals, distinct scheduled/resolved/verified stages, one posted repair expense                 |
| I. Inventory         | Available/minimum/on-order stock, mock supplier comparisons, approved purchasing, separate receipt and posted cost, deduplicated usage and nonnegative stock validation                                |
| J. Teams             | Fictional shifts, skills, country/city service areas, availability, workload and four-job capacity checks; explicit infeasible-assignment errors and simulated roles                                   |
| K. Revenue           | Availability-aware rates and bounded proposals, per-date before/after review, approval revalidation, fixed confirmed-booking values, rate history, safe undo, labelled hypothetical forecast           |
| L. Finance           | Separate GBP/EUR ledgers, period expenses, guest balances, channel/operator/owner allocations, illustrative editable tax, unique draft invoices, categories, posting and duplicate exception approvals |
| M. Owners            | Fictional profiles and portfolio, editable demo fee agreements, owner-scoped views, reconciled native statements, factual explanation, printable statement and actual selected-data CSV                |
| N. Guest experience  | Synthetic historical ratings, factual prepared replies, tracked follow-up tasks, journey and review-request guidance without historical rating manipulation                                            |
| O. Growth            | Evidence from actual seeded channel mix, fee assumptions and explicit commercial hypotheses; linked assigned 30/60/90-day work and measurement                                                         |
| P. Reports           | Portfolio/country/property operations and financial rows, period-aware revenue chart, AI outcomes, drill-down, native amounts, actual CSV and print                                                    |
| Q. Documents         | Property/country/due/status records, Unknown/Needs review, renewal tasks, and explicit illustrative status without safety/legal certification                                                          |
| R. Administration    | Shared approvals and evidence drawers, version revalidation, activity history, language/roles/policies/motion/tax/time/reset preferences, synthetic integration errors and replay                      |

## Connected demo and interface

- [x] Deterministic one-year history, monthly expenses and 90+ future days across UK, Spain and Italy.
- [x] Five country-selectable, manual or timed scenarios using shared commands and visible actual before/after state.
- [x] Persistent copilot with supported EN/ES/IT intents, shared filters, evidence and command cards.
- [x] Labelled synthetic data and simulated AI; no mandatory API keys, paid accounts, remote fonts or images.
- [x] Global record search, quick-create forms, source-linked notifications, table search/sort/pagination and real exports.
- [x] UTC timestamps, property-local Intl presentation, DST-aware checkout conversion, virtual clock, pause/step/speed and reset.
- [x] Versioned local persistence, paused restoration, corrupt-state recovery and visible storage/precondition errors.
- [x] Common multilingual navigation, core headers, tabs, statuses, controls, prepared replies and scenario narration.
- [x] Teal/mint/purple reference-inspired visual system, original illustrations, route/drawer motion, reduced motion and desktop/mobile layouts.
- [x] Focusable controls, labelled dialogs, focus containment, Escape close, visible focus and automated accessibility checks on representative screens.
- [x] Setup, architecture, accounting assumptions, scenario guide, presenter script and verification documentation.

## Verification mapping

`tests/domain.test.ts` covers reservation invariants, turnover deduplication, readiness gates, quote approval boundaries, stale evidence, assignments, bounded pricing/undo, stock rules, sensitive messaging, accounting, assistant filters/policies and all five scenarios in all three countries.

`tests/integration.test.ts` covers blocked nights across modules, receipt expenses, owner fee/tax reconciliation, currency preservation, checkout handover, removed inspection evidence, DST, scenario replay, ID uniqueness with a full event log, and persistence/reset recovery.

`tests/e2e/demo.spec.ts` covers every route, the hero flow and real intermediate blockers, approval drawers, booking forms, CSV download, the copilot, language/persistence, clock/reset/corruption, owner scope, responsive screenshots and representative WCAG automated checks. See the verification report for actual results.
