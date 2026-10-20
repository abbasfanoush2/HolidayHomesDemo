# Architecture

React 19, TypeScript, Vite, React Router, Lucide icons, Recharts, Motion and CSS design tokens. One npm lockfile pins the installed dependency graph. No runtime network calls or external assets are required.

## Shared state and domain commands

`src/domain/types.ts` defines properties, owners, bookings, tasks, issues, approvals, conversations, stock, staff, invoices, documents, reviews, rates, pricing proposals, audit events, agent runs and scenario state. `seed.ts` builds deterministic fictional records. The seed has no random rendering or machine-clock dependencies.

`execute(state, command)` in `engine.ts` clones state, checks role/policy, validates preconditions, applies a command and returns a new revision. Failed commands leave the original state unchanged. The UI, assistant and scenario scheduler invoke the same commands. Views read shared selectors in `selectors.ts`, so an approved repair expense, changed rate or verified inspection appears in every relevant module.

Important commands include booking create/edit/cancel, turnover synchronisation, task create/assign/evidence, inspection pass/fail, quote request/revision/approval, repair completion/verification, pricing proposal/approval/undo, purchase/receipt/usage, invoice matching, duplicate exception review and prepared guest reply/send. The tool catalog describes these capabilities for a future adapter. Read-only portfolio/readiness/statement queries use shared selectors.

## Agent simulation and policy

A deterministic evaluator checks records in 15-minute virtual-clock slots. Replaying a slot is deduplicated. An event log records source, actor and timestamp; agent runs retain evidence, policy, proposed action, expected effect, execution result and verification. Agents can observe, draft and create low-risk tasks if enabled. No live reasoning, translation, image analysis or external sync is represented.

Costs, pricing, purchasing, finance exceptions and sensitive messages require explicit simulated approvals. Execution revalidates proposal versions, evidence, current rates and booking availability. Quote approval schedules work; it does not resolve a repair. Available stock changes only at receipt. Routine local sends are opt-in; urgent replies still require approval. Owner is read-only; Operations cannot approve financial changes. Roles illustrate views and policies, not production authentication or access control.

`assistant.ts` exports an `AssistantAdapter` and `demoAssistant`. This boundary permits a future server-side model adapter without changing the command engine. The current assistant recognises a documented, limited set of multilingual intents, answers using active filters and links to evidence. Unknown requests receive a capability explanation; ambiguous actions request a property selection.

## Persistence and virtual time

Browser localStorage key `staypilot-demo-v1` stores schema version 1 and the shared state. `staypilot-filters-v1` stores portfolio/report preferences. Commands persist locally; no server receives this data. Invalid JSON, incompatible schema or invalid core data loads the deterministic seed with a notice. Local image evidence has a 700 KB upload limit to avoid quickly exhausting browser storage. Storage errors surface a visible warning. Reset rebuilds every record from the fixed seed.

The clock starts at 2026-10-20T08:00:00Z. Timestamps are UTC; property presentation uses Europe/London, Europe/Madrid and Europe/Rome through Intl (including DST). Clock playback advances virtual minutes per tick. A property-local 11:00 checkout invalidates cleaning/inspection readiness and keeps its single turnover job. Owner/operations night blocks prevent new bookings and pricing changes and are removed from capacity denominators. Hidden tabs pause clock and scenario playback; reload restores paused playback. This is monitoring while the demo runs, not a background service.

## Data and accounting rules

Money is integer minor units with an explicit currency. Native GBP/EUR ledgers remain separate. Display conversion uses a fixed illustrative EUR→GBP rate of 0.86. Totals never silently add currencies.

Booked accommodation is allocated by arrival period. Occupancy uses clipped occupied nights / available home-nights. ADR and RevPAR allocate accommodation to nights within the reporting period. Channel fee is 3% for Direct and 15% for OTA; operator fee defaults to 20% of accommodation after channel fees, using each fictional owner’s editable agreement. Cleaning is collected and passed through at cost. Owner payable subtracts channel fee, operator fee, posted period expenses and the configurable illustrative tax adjustment. Draft/duplicate bills are excluded. Tax is an editable demo assumption, never country-specific legal advice.

`owner + operator + channel + expenses + illustrative tax = accommodation` in each native ledger. Guest cash received is gross booked accommodation plus cleaning minus outstanding guest balance. This is simplified booked-allocation accounting, not a regulated statement or real payout system. Future bookings, forecasts, estimated time savings and hypothetical avoided costs are not realised earnings.

## Interface and assets

The reference video's teal navigation, light canvas, purple AI card, dense tables, timelines and drawer motion informed the interface. Its identity, text, names, figures and industry content were not reused. Property and bedroom images are original inline SVG illustrations of fictional homes; Lucide supplies its licensed icon set. No remote images or fonts are mandatory. Reduced-motion and presentation toggles, labelled controls, visible focus, drawer focus containment, Escape close and focus restoration are implemented. Tables/calendars scroll inside their containers on small displays.
