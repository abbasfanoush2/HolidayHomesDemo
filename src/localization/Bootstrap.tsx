import { useEffect, useState, type ReactNode } from "react";
import {
  initialisePreferences,
  localeFor,
  type Preferences,
} from "./preferences";
const initial = initialisePreferences();
export function PreferenceBootstrap({
  children,
}: {
  children: (preferences: Preferences) => ReactNode;
}) {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  useEffect(() => {
    let active = true;
    initial.then((p) => {
      document.documentElement.lang = localeFor(p.language);
      if (active) setPreferences(p);
    });
    return () => {
      active = false;
    };
  }, []);
  return preferences ? (
    children(preferences)
  ) : (
    <div className="market-loading" aria-busy="true" aria-label="StayPilot">
      <div className="market-loading-mark">
        S<span>✳</span>
      </div>
      <div className="market-loading-lines">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
