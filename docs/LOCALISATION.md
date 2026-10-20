# Markets and localisation

The existing React/Vite app remains a static SPA, with one small Vercel function at `/api/market`. It reads only `x-vercel-ip-country`, accepts ES, IT and GB, and returns `{country}` or `{country:null}`. It never reads, stores or returns a raw IP. No GPS prompt, external IP lookup, token or account is required.

The function marks every response `private, no-store`, disables both standard and Vercel CDN caching, and varies by country header. The browser also requests it with `cache: no-store`. API paths are excluded from the SPA rewrite. Local Vite development and preview return a missing country, exercising the same browser-language fallback.

## Preference rules

The application resolves preferences before mounting the operating interface. A neutral brand/loading shell appears for at most the bounded lookup period (one second), followed by:

1. Valid URL `?market=es`, `?market=it` or `?market=uk`.
2. Deliberately saved manual market/language/currency preferences.
3. Supported Vercel country ES, IT or GB.
4. First supported browser language in the visitor's preference list (Spanish, Italian or English).
5. British English and GBP.

| Market         | Header | Language / locale       | Display currency | Initial portfolio |
| -------------- | ------ | ----------------------- | ---------------- | ----------------- |
| Spain          | ES     | Spanish / es-ES         | EUR              | Spain             |
| Italy          | IT     | Italian / it-IT         | EUR              | Italy             |
| United Kingdom | GB     | British English / en-GB | GBP              | United Kingdom    |

Links work on deep routes and retain other query parameters through navigation. A market link is an outreach override, not a deliberate saved preference. A manual choice clears only the market parameter, retaining campaign parameters. Language and currency can also be chosen independently using the globe control or Settings.

`staypilot-preferences-v2` records explicit provenance: `{version:2,mode:"automatic"}` or `{version:2,mode:"manual",market,language,currency}`. The old business-state `language:"en"` value has no provenance, so it does not block IP detection. Business records remain in schema v1 and are migrated in place. Returning to **Automatic — use my location** clears the manual binding and resolves country/browser fallback again. A delayed lookup cannot overwrite a newer manual choice.

Initial portfolio defaults apply during initialisation or an explicit market selection. Exploring other countries or navigating does not repeatedly reapply them. Saved reporting filters survive refresh; an explicit market link reapplies its initial country on a new page load. Market/language changes preserve scenarios, clock, tasks, approvals, agent runs and financial records.

## Translation implementation

`src/localization/catalogue.json` holds central English source/template keys and Spanish/Italian translations; the existing keyed navigation/scenario dictionaries are retained in `src/i18n.ts`. The locale context and a small React JSX runtime translate text and accessible attributes at render time, including nested cards, tables, drawers, charts and print content. This uses React rendering rather than mutating DOM text. Input option values and domain identifiers stay canonical. Native validation messages use the active locale. New user-facing copy must be added to the catalogue, including complete dynamic templates with parameters; proper names and technical identifiers remain unchanged.

Generated event/run/status/chat prose is persisted as stable message codes and parameters, then hydrated to canonical engine text and translated for the current interface. This preserves the engine's existing replay/validation rules and allows earlier activity to switch language. Old authored English/Spanish/Italian templates are recognised. User-authored chat is stored verbatim. Unknown free text is preserved rather than machine-translated. Agent and record statuses already use canonical enum codes.

Numbers and dates use `Intl.NumberFormat` and `Intl.DateTimeFormat` with es-ES, it-IT or en-GB. HTML `lang` and browser titles follow the interface. Charts, animated values, CSV headings/content, owner statements and print output follow the same locale. CSV uses semicolons and decimal commas for ES/IT; original transaction currency codes remain explicit. Native-ledger exports identify integer minor units.

## Money and time

Display conversion uses the existing fixed, labelled **DEMO FX: €1 = £0.86**, with rounding to integer minor units. The finance converted-totals panel displays converted revenue, owner payable and operator income; original GBP/EUR ledgers remain separately visible and reconcile exactly as before. Changing interface language reformats amounts; it does not change their values or currencies. Property pricing bounds, quantities, percentages, exchange assumptions and operational records are not converted. Arrivals, cleaning and maintenance retain their stored dates/deadlines and property-local timezones.

## Verification boundary

`tests/localisation.test.ts` mocks the Vercel request header and tests response privacy, visitor isolation, precedence/migration, timeout/fallback, exact money formatting/conversion, native-ledger/date invariants, all five scenarios in all countries/languages, persisted message references and supported multilingual copilot commands. Browser tests mock only the country response, never arbitrary IP addresses, and exercise initial loading, deep links, manual/automatic refresh, finance, CSV, print, scenarios, translated history and mobile layouts. Existing workflow, motion and accessibility regression tests remain enabled.

Live Vercel edge-header injection, deployed CDN behavior, real-country routing, VPN geolocation, Safari and Firefox require hosted/browser verification and are not claimed by the local tests. Automated scans cover the exercised interface and prepared synthetic copy; they do not translate arbitrary visitor-entered prose.
