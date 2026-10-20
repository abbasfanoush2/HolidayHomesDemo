# Reference-led interface and motion

The supplied 36-second recording was reviewed at half-second intervals and at full resolution. The implementation keeps the holiday-home workflows and shared fictional records while following the recording's layout, interaction, and motion patterns.

## Reference mapping

| Recording                                      | Implemented experience                                                                                                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–6s, 32–36s: register and workflow drawer     | Compact approval register, expandable evidence rows, inset right drawer, blurred backdrop, workflow stepper, amount and source links                                                           |
| 6–12s: AI analysis and interactive suggestions | Purple intelligence summary, sweeping score gauge, source-linked suggestion cards, category/status filters, reversible dismissal, approval stamp and particles, risk radar, contextual copilot |
| 12–20s: dashboard and animated numbers         | Integrated greeting and day arc, inset purple AI card, six compact metrics, calendar/task rail, animated counts and readiness schedule                                                         |
| 20–27s: schedule and dependencies              | Animated timeline bars, dependency connectors, current-time marker, daily/weekly scale, date navigation, source drawers                                                                        |
| 27–32s: approvals and feedback                 | Shared-record decisions, inline approval results, animated stepper/status, spring stamp, mint particles and animated toast                                                                     |

The recording's construction data, brand, video controls and camera zoom are not application content. The operational timeline uses explicitly labelled illustrative shift windows in Daily mode; Weekly mode uses actual seeded task due dates. Clicking a bar inspects its corresponding source record. Moving the period does not reschedule work.

## Visual system

`src/reference.css` builds on the shared operating-screen styles: a deep teal sidebar, spring-positioned mint selection, pale mint/peach canvas, translucent cards, soft shadows, rounded controls, fine dividers, and purple AI panels. Manrope's variable Latin and Latin Extended fonts are bundled under `public/fonts/` with their SIL Open Font License. There are no external font or image requests.

The dashboard, insights, approval inbox, and readiness schedule have dedicated components. Shared cards, tables, tabs, drawers, copilot, notifications and navigation carry the visual language through the remaining operating routes.

## Motion behavior

| Element              | Timing and behavior                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| Route                | 480ms upward fade and blur reveal                                                                     |
| Cards and table rows | 350–500ms entrance; small sequential delays for metric, suggestion and register rows                  |
| Counts               | 1.35s eased interpolation; final accessible text remains stable                                       |
| Health gauge         | 1.6s arc and 1.7s needle sweep, calculated from current readiness                                     |
| Navigation / tabs    | Shared layout selection with spring or eased movement                                                 |
| Schedule bars        | 650ms growth, staggered by home and workflow stage                                                    |
| Drawer               | 420ms slide on entry and exit, 250ms backdrop fade; focus trap, Escape and focus restoration retained |
| Approval             | Spring stamp and 850ms particles after a successful approved state                                    |
| Copilot / toast      | 300–350ms entrance and exit; message entrance and hover/press feedback                                |

Settings → Presentation motion and the operating system's reduced-motion preference disable motion. All final data, actions, focus behavior and evidence remain available. Animations never advance domain state: approving a quote only schedules the repair, and the property remains blocked until its evidence requirements are met.

## Interaction checks

The browser suite exercises suggestion filtering, dismissal/restore, approval feedback against persisted source state, schedule scale/period changes and evidence drawers, both motion preferences, desktop/tablet/mobile layouts, modal focus, the complete arrival rescue, and representative accessibility scans. See [verification](VERIFICATION.md) for results and boundaries.
