import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  Sparkles,
  Building2,
  CalendarDays,
  Inbox,
  ClipboardList,
  SprayCan,
  Wrench,
  Package,
  Users,
  ChartNoAxesCombined,
  TrendingUp,
  Wallet,
  Landmark,
  Heart,
  ChartPie,
  FileCheck,
  ShieldCheck,
  History,
  Settings,
  Clapperboard,
  Search,
  Plus,
  Bell,
  ChevronDown,
  ArrowUpRight,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Globe,
  Play,
  Pause,
  SkipForward,
  CheckCircle2,
  TriangleAlert,
  X,
  Compass,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "../store";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BRAND, day } from "../domain/seed";
import { dateTime, scopedProperties } from "../domain/selectors";
import type { TranslationKey } from "../i18n";
import { Button } from "./ui";
export const navGroups: {
  title: TranslationKey;
  items: [TranslationKey, string, LucideIcon][];
}[] = [
  {
    title: "todayAI",
    items: [
      ["overview", "/", LayoutDashboard],
      ["command", "/command", Sparkles],
    ],
  },
  {
    title: "portfolioGuests",
    items: [
      ["properties", "/properties", Building2],
      ["reservations", "/reservations", CalendarDays],
      ["inbox", "/inbox", Inbox],
    ],
  },
  {
    title: "operationsGroup",
    items: [
      ["operations", "/operations", ClipboardList],
      ["housekeeping", "/housekeeping", SprayCan],
      ["maintenance", "/maintenance", Wrench],
      ["inventory", "/inventory", Package],
      ["team", "/team", Users],
    ],
  },
  {
    title: "revenueGroup",
    items: [
      ["revenue", "/revenue", ChartNoAxesCombined],
      ["growth", "/growth", TrendingUp],
      ["reputation", "/reputation", Heart],
    ],
  },
  {
    title: "financeGroup",
    items: [
      ["finance", "/finance", Wallet],
      ["owners", "/owners", Landmark],
      ["reports", "/reports", ChartPie],
    ],
  },
  {
    title: "admin",
    items: [
      ["documents", "/documents", FileCheck],
      ["approvals", "/approvals", ShieldCheck],
      ["activity", "/activity", History],
      ["settings", "/settings", Settings],
    ],
  },
];
export function Layout() {
  const reducedMotion = useReducedMotion();
  const {
    state,
    send,
    filters,
    setFilters,
    t,
    open,
    toast,
    detail,
    assistant,
    setAssistant,
    setModal,
  } = useStore();
  const [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState(""),
    [notifications, setNotifications] = useState(false),
    [quick, setQuick] = useState(false);
  const navigate = useNavigate(),
    location = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);
  const allIds = scopedProperties(state, { ...filters, search: "" }).map(
    (p) => p.id,
  );
  const matches =
    query.trim().length > 1
      ? [
          ...state.properties
            .filter((p) => allIds.includes(p.id))
            .map((p) => ({ id: p.id, title: p.name, sub: p.city })),
          ...state.bookings
            .filter((b) => allIds.includes(b.propertyId))
            .map((b) => ({
              id: b.id,
              title: b.guest,
              sub: `${b.id} · ${b.start}`,
            })),
          ...state.issues
            .filter((i) => allIds.includes(i.propertyId))
            .map((i) => ({ id: i.id, title: i.title, sub: i.status })),
          ...state.tasks
            .filter(
              (x) => allIds.includes(x.propertyId) && x.status !== "Complete",
            )
            .map((x) => ({ id: x.id, title: x.title, sub: x.kind })),
          ...state.owners
            .filter((o) =>
              state.properties.some(
                (p) => allIds.includes(p.id) && p.ownerId === o.id,
              ),
            )
            .map((o) => ({ id: o.id, title: o.name, sub: "Owner" })),
        ]
          .filter((x) =>
            `${x.title} ${x.sub}`.toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, 8)
      : [];
  useEffect(() => {
    setMobile(false);
    document.title = `${BRAND.name} AI — ${t(navGroups.flatMap((g) => g.items).find((i) => i[1] === location.pathname)?.[0] || "studio")}`;
  }, [location.pathname, state.language]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setQuery("");
        setQuick(false);
        setNotifications(false);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return (
    <div
      className={`app-shell ${collapsed ? "sidebar-collapsed" : ""} ${mobile ? "mobile-nav-open" : ""}`}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {mobile && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className="sidebar">
        <NavLink to="/" className="brand" aria-label="StayPilot home">
          <span className="brand-icon">
            <Home size={23} strokeWidth={1.8} />
            <i />
          </span>
          <span>
            {BRAND.name}
            <small>AI</small>
            <em>HOSPITALITY, IN HARMONY</em>
          </span>
        </NavLink>
        <button className="workspace" onClick={() => navigate("/settings")}>
          <span className="workspace-logo">C</span>
          <span>
            {BRAND.workspace}
            <small>{allIds.length} homes. One team.</small>
          </span>
          <ChevronDown size={13} />
        </button>
        <nav aria-label="Main navigation">
          {navGroups.map((g) => (
            <div className="nav-group" key={g.title}>
              <p>{t(g.title)}</p>
              {g.items.map(([key, path, Icon]) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === "/"}
                  title={t(key)}
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          className="nav-active-pill"
                          layoutId="navigation-active"
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 36,
                            duration:
                              state.motion && !reducedMotion ? undefined : 0,
                          }}
                        />
                      )}
                      <Icon size={17} strokeWidth={1.65} />
                      <span>{t(key)}</span>
                      {key === "approvals" && (
                        <em>
                          {
                            state.approvals.filter(
                              (a) =>
                                a.status === "Pending" &&
                                allIds.includes(a.propertyId),
                            ).length
                          }
                        </em>
                      )}
                      {key === "inbox" && <i className="nav-dot" />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink
            to="/studio"
            className="studio-link"
            aria-label={t("studio")}
          >
            <Clapperboard size={18} />
            <span>
              {t("studio")}
              <small>Your next great demo starts here</small>
            </span>
            <ArrowUpRight size={15} />
          </NavLink>
          <div className="profile">
            <span className="avatar">AL</span>
            <span>
              Alex Lane<small>Portfolio administrator</small>
            </span>
            <button
              title={collapsed ? t("navExpand") : t("navCollapse")}
              aria-label={collapsed ? t("navExpand") : t("navCollapse")}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen size={16} />
              ) : (
                <PanelLeftClose size={16} />
              )}
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Open navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={22} />
          </button>
          <div className="global-search">
            <Search size={17} />
            <input
              ref={searchRef}
              placeholder={t("search")}
              aria-label={t("search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>⌘ K</kbd>
            {query && (
              <div className="search-results">
                {matches.length ? (
                  matches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        open(m.id);
                        setQuery("");
                      }}
                    >
                      <Search size={15} />
                      <span>
                        {m.title}
                        <small>{m.sub}</small>
                      </span>
                      <ArrowUpRight size={14} />
                    </button>
                  ))
                ) : (
                  <p>No matching records</p>
                )}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <span className="monitor-status">
              <i className={state.playing ? "live" : ""} />
              {state.playing ? t("monitoring") : t("paused")}
            </span>
            <label className="language-select">
              <Globe size={15} />
              <select
                aria-label="Interface language"
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
                <option value="en">EN</option>
                <option value="es">ES</option>
                <option value="it">IT</option>
              </select>
            </label>
            <div className="popover-wrap">
              <Button
                variant="primary"
                aria-label={t("create")}
                onClick={() => setQuick(!quick)}
              >
                <Plus size={16} />
                <span>{t("create")}</span>
                <ChevronDown size={13} />
              </Button>
              {quick && (
                <div className="popover quick-menu">
                  {(
                    ["Property", "Booking", "Task", "Issue", "Bill"] as const
                  ).map((key, i) => (
                    <button
                      key={key}
                      onClick={() => {
                        setModal(key);
                        setQuick(false);
                      }}
                    >
                      <Plus size={14} />
                      {t(
                        (
                          [
                            "newProperty",
                            "newBooking",
                            "newTask",
                            "newIssue",
                            "newBill",
                          ] as const
                        )[i],
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="popover-wrap">
              <button
                className="notification-button icon-button"
                aria-label="Notifications"
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={19} />
                <i />
              </button>
              {notifications && (
                <div className="popover notification-menu">
                  <h3>{t("attention")}</h3>
                  {state.events
                    .filter((e) => allIds.includes(e.propertyId))
                    .slice(0, 6)
                    .map((e) => (
                      <button
                        key={e.id}
                        onClick={() => {
                          open(e.sourceId);
                          setNotifications(false);
                        }}
                      >
                        <span className="dot" />
                        <span>
                          {e.title}
                          <small>{dateTime(e.time, state.language)}</small>
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
            <button
              className="avatar top-avatar"
              onClick={() => navigate("/settings")}
              aria-label="Profile settings"
            >
              AL
            </button>
          </div>
        </header>
        <div className="demo-strip">
          <span>
            <Compass size={13} />
            {t("demo")}
          </span>
          <div className="clock-controls">
            <span>
              {dateTime(state.now, state.language)} <small>London</small>
            </span>
            <button
              aria-label={state.playing ? "Pause clock" : "Play clock"}
              onClick={() =>
                send({ type: "settings", values: { playing: !state.playing } })
              }
            >
              {state.playing ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <button
              aria-label="Step clock 15 minutes"
              onClick={() => send({ type: "tick", minutes: 15 })}
            >
              <SkipForward size={12} />
            </button>
            <select
              aria-label="Clock speed"
              value={state.speed}
              onChange={(e) =>
                send({
                  type: "settings",
                  values: { speed: Number(e.target.value) },
                })
              }
            >
              <option value="1">1 min / tick</option>
              <option value="5">5 min / tick</option>
              <option value="30">30 min / tick</option>
              <option value="60">60 min / tick</option>
            </select>
          </div>
        </div>
        <main id="main" tabIndex={-1}>
          <div className="filterbar">
            <div className="filter-label">
              <span className="dot" /> {t("portfolioOverview")}
            </div>
            <div className="filters">
              <select
                aria-label="Country filter"
                value={filters.country}
                onChange={(e) =>
                  setFilters({
                    country: e.target.value as typeof filters.country,
                    city: "",
                    propertyId: "",
                  })
                }
              >
                <option value="All">🌐 {t("allCountries")}</option>
                <option value="UK">🇬🇧 United Kingdom</option>
                <option value="Spain">🇪🇸 España</option>
                <option value="Italy">🇮🇹 Italia</option>
              </select>
              <select
                aria-label="City filter"
                value={filters.city}
                onChange={(e) =>
                  setFilters({ city: e.target.value, propertyId: "" })
                }
              >
                <option value="">{t("allCities")}</option>
                {[
                  ...new Set(
                    state.properties
                      .filter(
                        (p) =>
                          filters.country === "All" ||
                          p.country === filters.country,
                      )
                      .map((p) => p.city),
                  ),
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                aria-label="Property filter"
                value={filters.propertyId}
                onChange={(e) => setFilters({ propertyId: e.target.value })}
              >
                <option value="">{t("allProperties")}</option>
                {state.properties
                  .filter(
                    (p) =>
                      (filters.country === "All" ||
                        p.country === filters.country) &&
                      (!filters.city || p.city === filters.city) &&
                      (state.role !== "Owner" || p.ownerId === state.ownerId),
                  )
                  .map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <select
                aria-label="Team filter"
                value={filters.team}
                onChange={(e) => setFilters({ team: e.target.value })}
              >
                <option value="">{t("allTeams")}</option>
                {state.staff
                  .filter(
                    (p) =>
                      filters.country === "All" ||
                      p.country === filters.country,
                  )
                  .map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <select
                aria-label="Display currency"
                value={filters.currency}
                onChange={(e) =>
                  setFilters({
                    currency: e.target.value as typeof filters.currency,
                  })
                }
              >
                <option value="GBP">£ GBP</option>
                <option value="EUR">€ EUR</option>
              </select>
              <label className="date-filter">
                <CalendarDays size={13} />
                <input
                  type="date"
                  aria-label="Period start"
                  value={filters.from}
                  onChange={(e) => {
                    if (e.target.value) setFilters({ from: e.target.value });
                  }}
                />
                <span>–</span>
                <input
                  type="date"
                  aria-label="Period end"
                  min={filters.from}
                  value={filters.to}
                  onChange={(e) => {
                    if (e.target.value >= filters.from)
                      setFilters({ to: e.target.value });
                  }}
                />
              </label>
            </div>
          </div>
          <motion.div
            className="route-content"
            key={location.pathname}
            initial={
              state.motion && !reducedMotion
                ? { opacity: 0, y: 12, filter: "blur(3px)" }
                : false
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: state.motion && !reducedMotion ? 0.48 : 0,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <Outlet />
          </motion.div>
          <footer className="page-footer">
            <span>
              <span className="mini-brand">✳</span> A little less managing. A
              lot more hosting.
            </span>
            <span>{t("fx")}</span>
          </footer>
        </main>
      </div>
      <button
        className={`assistant-launch ${assistant ? "opened" : ""}`}
        onClick={() => setAssistant(!assistant)}
        aria-label={t("ask")}
      >
        {assistant ? (
          <X size={21} />
        ) : (
          <>
            <Sparkles size={19} />
            <span>{t("ask")}</span>
            <kbd>AI</kbd>
          </>
        )}
      </button>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.message}
            className={`toast ${toast.error ? "error" : ""}`}
            initial={
              state.motion && !reducedMotion
                ? { opacity: 0, y: 18, x: "-50%", scale: 0.96 }
                : false
            }
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: 8, x: "-50%", scale: 0.98 }}
            transition={{
              duration: state.motion && !reducedMotion ? 0.3 : 0,
              ease: [0.16, 1, 0.3, 1],
            }}
            role={toast.error ? "alert" : "status"}
          >
            {toast.error ? (
              <TriangleAlert size={19} />
            ) : (
              <CheckCircle2 size={19} />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only">
        {day(state.now)}
        {detail}
      </span>
    </div>
  );
}
