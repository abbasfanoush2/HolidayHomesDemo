import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clapperboard,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  ShieldCheck,
  Plus,
  Sparkles,
  Globe,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { useStore } from "../store";
import {
  summary,
  dateTime,
  scenarioSnapshot,
} from "../domain/selectors";
import { SCENARIOS, BRAND } from "../domain/seed";
import {
  Badge,
  Button,
  Card,
  ExportButton,
  SectionTitle,
  Table,
} from "../components/ui";
import { scenarioTranslations } from "../i18n";
import type { Country, Role } from "../domain/types";
export function Documents() {
  const { state, filters, t, send, open } = useStore(),
    s = summary(state, filters);
  return (
    <>
      <SectionTitle
        eyebrow="CLEAR RECORDS. HONEST ASSURANCE."
        title={t("documents")}
        description="Illustrative document categories do not establish legal compliance or certify a property safe."
      />
      <div className="notice">
        <ShieldCheck size={19} />
        <span>
          Unknown and Needs review remain visible. A simulated compliance
          assistant can identify a missing record and create a task; a qualified
          human must assess real obligations.
        </span>
      </div>
      <Card>
        <Table
          rows={state.documents.filter((d) => s.ids.includes(d.propertyId))}
          label="documents"
          onRow={(d) => open(d.id)}
          columns={[
            { key: "title", label: "Document / checklist" },
            {
              key: "property",
              label: t("property"),
              render: (d) =>
                state.properties.find((p) => p.id === d.propertyId)?.name,
            },
            {
              key: "country",
              label: t("country"),
              render: (d) =>
                state.properties.find((p) => p.id === d.propertyId)?.country,
            },
            { key: "due", label: "Review due", sort: (d) => d.due },
            {
              key: "status",
              label: t("status"),
              render: (d) => <Badge value={d.status} />,
            },
            {
              key: "actions",
              label: t("action"),
              render: (d) => (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    send(
                      {
                        type: "createTask",
                        propertyId: d.propertyId,
                        title: `Review ${d.title}`,
                        kind: "Document",
                        sourceId: d.id,
                      },
                      "Document review task created. No compliance certification was made.",
                    );
                  }}
                >
                  <Plus size={13} />
                  Renewal task
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
export function ActivityPage() {
  const { state, filters, t, open } = useStore(),
    s = summary(state, filters);
  return (
    <>
      <SectionTitle
        eyebrow="A RECORD OF WHAT REALLY CHANGED"
        title={t("activity")}
        description="Observations, decisions and local side effects. All times follow the demo clock."
        actions={
          <ExportButton
            name="activity"
            rows={state.events
              .filter((e) => s.ids.includes(e.propertyId))
              .map((e) => ({ ...e }))}
          />
        }
      />
      <Card>
        <Table
          rows={state.events.filter((e) => s.ids.includes(e.propertyId))}
          label="audit events"
          onRow={(e) => open(e.sourceId)}
          columns={[
            { key: "title", label: "Observed event" },
            { key: "actor", label: "Actor" },
            {
              key: "property",
              label: t("property"),
              render: (e) =>
                state.properties.find((p) => p.id === e.propertyId)?.name,
            },
            {
              key: "time",
              label: "Simulated time",
              render: (e) => dateTime(e.time, state.language),
            },
            { key: "sourceId", label: "Source record" },
          ]}
        />
      </Card>
    </>
  );
}
export function Settings() {
  const { state, send, t, reset, filters } = useStore(),
    [resetOpen, setResetOpen] = useState(false);
  return (
    <>
      <SectionTitle
        eyebrow="MAKE SPACE FOR THE WAY YOU WORK"
        title={t("settings")}
        description={t("about")}
      />
      <div className="insight-grid">
        <Card
          title="Workspace & presentation"
          subtitle="Preferences persist on this browser."
        >
          <div className="settings-fields">
            <label>
              Demo brand
              <input value={`${BRAND.name} ${BRAND.suffix}`} readOnly />
              <small>Rename centrally in src/domain/seed.ts.</small>
            </label>
            <label>
              Interface language
              <select
                value={state.language}
                onChange={(e) =>
                  send({
                    type: "settings",
                    values: {
                      language: e.target.value as typeof state.language,
                    },
                  })
                }
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="it">Italiano</option>
              </select>
            </label>
            <label className="toggle-row">
              <span>
                Presentation motion
                <small>System reduced-motion preferences also apply.</small>
              </span>
              <input
                type="checkbox"
                checked={state.motion}
                onChange={(e) =>
                  send({
                    type: "settings",
                    values: { motion: e.target.checked },
                  })
                }
              />
            </label>
            <label className="toggle-row">
              <span>
                Demo clock running
                <small>Hidden tabs pause; missed time is not fabricated.</small>
              </span>
              <input
                type="checkbox"
                checked={state.playing}
                onChange={(e) =>
                  send({
                    type: "settings",
                    values: { playing: e.target.checked },
                  })
                }
              />
            </label>
          </div>
        </Card>
        <Card
          title="Simulated roles"
          subtitle="For demonstrating views; not production access control."
        >
          <div className="settings-fields">
            <label>
              Current role
              <select
                aria-label="Current role"
                value={state.role}
                onChange={(e) =>
                  send({
                    type: "settings",
                    values: { role: e.target.value as Role },
                  })
                }
              >
                {["Admin", "Operations", "Finance", "Owner"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              Fictional owner
              <select
                aria-label="Fictional owner"
                value={state.ownerId}
                onChange={(e) =>
                  send({
                    type: "settings",
                    values: { ownerId: e.target.value },
                  })
                }
              >
                {state.owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="body-copy">
              Owner is read-only and sees only their own fictional records
              across all modules. Operations can prepare work; cost approval
              requires Finance or Admin.
            </p>
            <Badge
              value={
                state.role === "Owner"
                  ? "Read-only owner view"
                  : "Demo role active"
              }
            />
          </div>
        </Card>
        <Card
          title="Agent permission policies"
          subtitle="All activity stays local, including autonomous actions."
        >
          <div className="settings-fields">
            <label className="toggle-row">
              <span>
                Pause all agents<small>Queue and evidence remain intact.</small>
              </span>
              <input
                type="checkbox"
                checked={state.agentsPaused || state.policies.paused}
                onChange={(e) =>
                  send({
                    type: "settings",
                    values: { agentsPaused: e.target.checked },
                  })
                }
              />
            </label>
            <label className="toggle-row">
              <span>
                Allow internal task creation
                <small>Deduplicated by source and task purpose.</small>
              </span>
              <input
                type="checkbox"
                checked={state.policies.autoTasks}
                onChange={(e) =>
                  send({
                    type: "policy",
                    values: { autoTasks: e.target.checked },
                  })
                }
              />
            </label>
            <label className="toggle-row">
              <span>
                Allow routine demo replies
                <small>
                  Urgent and sensitive replies always require review.
                </small>
              </span>
              <input
                type="checkbox"
                checked={state.policies.routineReplies}
                onChange={(e) =>
                  send({
                    type: "policy",
                    values: { routineReplies: e.target.checked },
                  })
                }
              />
            </label>
            <label>
              Illustrative tax adjustment (%)
              <input
                aria-label="Illustrative tax adjustment"
                type="number"
                min="0"
                max="50"
                step="0.01"
                value={state.taxBps / 100}
                onChange={(e) =>
                  send({
                    type: "settings",
                    values: {
                      taxBps: Math.round(Number(e.target.value) * 100),
                    },
                  })
                }
              />
              <small>
                Configurable demo assumption applied to accommodation. This does
                not represent current tax law.
              </small>
            </label>
            <p className="policy-note">
              Spending, pricing, exception resolution and sensitive messaging
              require explicit approvals. Readiness changes require authorised
              evidence and verification.
            </p>
          </div>
        </Card>
        <Card
          title="Simulation controls"
          subtitle="Fixed seed · schema v1 · localStorage"
        >
          <p className="body-copy">
            Reset restores every reservation, cost, conversation, scenario,
            policy and event to 20 October 2026 at 09:00 London time. The seed
            has 36 homes, a year of history and 90+ future days.
          </p>
          <p className="muted small">
            Notifications open related records from the bell menu. Display FX:{" "}
            {filters.currency}. Illustrative tax adjustment:{" "}
            {state.taxBps / 100}% in the simplified accounting model.
          </p>
          {resetOpen ? (
            <div className="reset-confirm">
              <p>{t("resetConfirm")}</p>
              <Button
                variant="danger"
                onClick={() => {
                  reset();
                  setResetOpen(false);
                }}
              >
                Reset all demo data
              </Button>
              <Button onClick={() => setResetOpen(false)}>{t("cancel")}</Button>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setResetOpen(true)}>
              <RotateCcw size={14} />
              {t("reset")}
            </Button>
          )}
        </Card>
      </div>
      <Card
        title="Simulated integrations"
        subtitle="These tiles replay synthetic sync records. They do not connect to external services."
      >
        <div className="three-grid integrations">
          {[
            "Airbnb",
            "Booking.com",
            "WhatsApp",
            "Demo bank",
            "Owner portal",
            "Illustrative market feed",
          ].map((name, i) => (
            <div key={name}>
              <span className="icon-tile mint">
                <Globe size={19} />
              </span>
              <h3>{name}</h3>
              <Badge value="Simulated" />
              <p>
                {i === 2
                  ? "Synthetic error: previous handover missed a classification. Replay is available."
                  : `Last synthetic sync: ${dateTime(state.lastCheck, state.language)}`}
              </p>
              <Button
                onClick={() =>
                  send(
                    {
                      type: "retryIntegration",
                      propertyId: state.properties[0].id,
                    },
                    `${name}: synthetic sync replayed. No external request was sent.`,
                  )
                }
              >
                Replay synthetic sync
                <ArrowRight size={13} />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
export function Studio() {
  const { state, send, t, open, reset, setFilters } = useStore(),
    [country, setCountry] = useState<Country>("UK"),
    q = state.scenario,
    stories =
      state.language === "en"
        ? SCENARIOS
        : scenarioTranslations[state.language].map((x, i) => ({
            ...x,
            id: i + 1,
          })),
    def = q ? stories[q.id - 1] : null,
    p = state.properties.find((p) => p.id === q?.propertyId);
  return (
    <>
      <SectionTitle
        eyebrow="A BETTER WAY TO TELL THE STORY"
        title={t("studioIntro")}
        description={t("studioBody")}
        actions={
          <select
            aria-label="Scenario country"
            value={country}
            onChange={(e) => setCountry(e.target.value as Country)}
          >
            <option value="UK">🇬🇧 United Kingdom</option>
            <option value="Spain">🇪🇸 España</option>
            <option value="Italy">🇮🇹 Italia</option>
          </select>
        }
      />
      <div className="studio-hero">
        <div>
          <span className="pill">
            <Clapperboard size={14} /> DEMO STUDIO
          </span>
          <h2>
            See what changes
            <br />
            when your team is in sync.
          </h2>
          <p>
            A fictional portfolio. Real local decisions.
            <br />A clear trail from the first signal to the verified result.
          </p>
          <span className="studio-label">
            <ShieldCheck size={14} />
            {t("demo")}
          </span>
        </div>
        <div className="studio-orbit">
          <div className="orbit-center">
            <Sparkles size={37} />
            <strong>StayPilot AI</strong>
            <small>One connected operating team</small>
          </div>
          <span className="orbit-chip a">
            <ShieldCheck size={14} />
            Evidence first
          </span>
          <span className="orbit-chip b">
            <Check size={14} />
            Verified outcomes
          </span>
          <span className="orbit-chip c">
            <Activity size={14} />
            Human decisions
          </span>
        </div>
      </div>
      <div className="scenario-grid">
        {stories.map((scenario, i) => (
          <button
            key={scenario.id}
            className={`card scenario-card ${q?.id === scenario.id ? "selected" : ""}`}
            onClick={() => {
              if (send({ type: "startScenario", id: scenario.id, country })) {
                setFilters({ country, city: "", propertyId: "", team: "" });
              }
            }}
          >
            <span className="scenario-index">0{i + 1}</span>
            <h3>{scenario.title}</h3>
            <p>{scenario.subtitle}</p>
            <span className="scenario-launch">
              {t("launch")}
              <ArrowRight size={15} />
            </span>
          </button>
        ))}
      </div>
      {q && def && p ? (
        <Card
          className="scenario-player"
          title={def.title}
          subtitle={`${p.name} · ${q.country} · ${q.step}/${def.steps.length} steps`}
          action={
            <Badge
              value={
                q.step === def.steps.length
                  ? "Complete"
                  : q.playing
                    ? "In progress"
                    : "Paused"
              }
            />
          }
        >
          <div className="scenario-steps">
            {def.steps.map((step, i) => (
              <div
                className={
                  q.step > i ? "complete" : q.step === i ? "active" : ""
                }
                key={step}
              >
                <span>{q.step > i ? <Check size={14} /> : i + 1}</span>
                <small>{step}</small>
              </div>
            ))}
          </div>
          <div className="scenario-comparison">
            <div>
              <span>{t("before")}</span>
              <strong>{q.before}</strong>
            </div>
            <ArrowRight size={20} />
            <div>
              <span>{t("after")}</span>
              <strong>{scenarioSnapshot(state, p.id, q.id)}</strong>
            </div>
            <Button onClick={() => open(p.id)}>
              {t("evidence")}
              <ArrowUpRight size={14} />
            </Button>
          </div>
          <div className="scenario-controls">
            <span>
              {q.step === def.steps.length ? t("verified") : def.steps[q.step]}
            </span>
            <div>
              <Button
                onClick={() =>
                  send({ type: "scenarioPlay", playing: !q.playing })
                }
                disabled={q.step >= def.steps.length}
              >
                {q.playing ? <Pause size={15} /> : <Play size={15} />}{" "}
                {q.playing ? t("pause") : t("autoPlay")}
              </Button>
              <Button
                variant="primary"
                disabled={q.step >= def.steps.length}
                onClick={() => send({ type: "stepScenario" })}
              >
                <SkipForward size={15} />
                {t("nextStep")}
              </Button>
              <Button
                onClick={() =>
                  send({ type: "startScenario", id: q.id, country: q.country })
                }
              >
                <RotateCcw size={14} />
                Replay
              </Button>
            </div>
          </div>
          <div className="scenario-proof">
            <h3>Evidence, decisions & local outcomes</h3>
            {state.events
              .filter((e) => e.propertyId === p.id)
              .slice(0, 7)
              .map((e) => (
                <button key={e.id} onClick={() => open(e.sourceId)}>
                  <span className="dot green" />
                  {e.title}
                  <ArrowUpRight size={12} />
                </button>
              ))}
          </div>
          {q.id === 1 && (
            <p className="notice">
              <AlertTriangle size={17} />
              Quote approval schedules the repair. Readiness stays blocked until
              repair completion, independent verification and required
              inspection evidence are all recorded.
            </p>
          )}
        </Card>
      ) : (
        <div className="studio-empty">
          <Play size={23} />
          <p>
            Select a story to begin. Use Next step to present at your own pace.
          </p>
        </div>
      )}
      <Card
        title="Presenter’s notes"
        subtitle="A five-minute route through StayPilot AI"
      >
        <div className="presenter-notes">
          <span>
            <strong>00:00 — A calmer morning</strong>Open Overview. Explain the
            explicit demo label and 36-home portfolio.
          </span>
          <span>
            <strong>00:45 — Follow the signal</strong>Launch Rescue an arrival.
            Show the critical repair and missing inspection evidence.
          </span>
          <span>
            <strong>01:30 — Keep control</strong>Step through quote approval.
            Show that the property remains blocked.
          </span>
          <span>
            <strong>02:30 — Verify the result</strong>Complete repair, verify
            it, then inspect. Show the linked expense and local guest reply.
          </span>
          <span>
            <strong>03:30 — See the whole business</strong>Show pricing, a
            native-currency owner statement and a prepared growth plan.
          </span>
          <span>
            <strong>04:30 — Make the boundary clear</strong>Open audit history.
            Everything is synthetic and local; no live AI, messages, prices or
            money.
          </span>
        </div>
        <Button
          onClick={() => {
            reset();
            setCountry("UK");
          }}
        >
          <RotateCcw size={14} />
          Reset for the next presentation
        </Button>
      </Card>
    </>
  );
}
