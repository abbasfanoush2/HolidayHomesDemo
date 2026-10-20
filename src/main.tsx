import { StrictMode, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { LocaleContext } from "./localization/context";
import type { Language } from "./domain/types";
import { PreferenceBootstrap } from "./localization/Bootstrap";
import { StoreProvider } from "./store";
import { Layout } from "./components/Layout";
import { Details } from "./components/Details";
import { Forms } from "./components/Forms";
import { Assistant } from "./components/Assistant";
import { Overview } from "./pages/Dashboard";
import { CommandCentre } from "./pages/Insights";
import { Properties, Reservations, InboxPage } from "./pages/Portfolio";
import {
  Operations,
  Housekeeping,
  Maintenance,
  Inventory,
  Team,
} from "./pages/Operations";
import {
  Revenue,
  Growth,
  Finance,
  Owners,
  Reputation,
  Reports,
} from "./pages/Commercial";
import { Documents, ActivityPage, Settings, Studio } from "./pages/Admin";
import { Approvals } from "./pages/ApprovalInbox";
import "./styles.css";
import "./reference.css";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <LocaleContext.Provider
        value={
          (document.documentElement.lang.startsWith("es")
            ? "es"
            : document.documentElement.lang.startsWith("it")
              ? "it"
              : "en") as Language
        }
      >
        <div className="fatal-error">
          <h1>The demo needs a fresh start.</h1>
          <p>
            Your local data may be from a different version. Reset it to load
            the deterministic seed.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("staypilot-demo-v1");
              location.reload();
            }}
          >
            Reset local demo data
          </button>
        </div>
      </LocaleContext.Provider>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <PreferenceBootstrap>
          {(preferences) => (
            <StoreProvider preferences={preferences}>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Overview />} />
                  <Route path="command" element={<CommandCentre />} />
                  <Route path="properties" element={<Properties />} />
                  <Route path="reservations" element={<Reservations />} />
                  <Route path="inbox" element={<InboxPage />} />
                  <Route path="operations" element={<Operations />} />
                  <Route path="housekeeping" element={<Housekeeping />} />
                  <Route path="maintenance" element={<Maintenance />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="team" element={<Team />} />
                  <Route path="revenue" element={<Revenue />} />
                  <Route path="growth" element={<Growth />} />
                  <Route path="finance" element={<Finance />} />
                  <Route path="owners" element={<Owners />} />
                  <Route path="reputation" element={<Reputation />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="documents" element={<Documents />} />
                  <Route path="approvals" element={<Approvals />} />
                  <Route path="activity" element={<ActivityPage />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="studio" element={<Studio />} />
                  <Route
                    path="*"
                    element={
                      <div className="empty">
                        <h1>That route has wandered off.</h1>
                        <Link to="/">Return to your portfolio</Link>
                      </div>
                    }
                  />
                </Route>
              </Routes>
              <Details />
              <Forms />
              <Assistant />
            </StoreProvider>
          )}
        </PreferenceBootstrap>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
