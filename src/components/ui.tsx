import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  Children,
  isValidElement,
  cloneElement,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Download,
  Inbox,
} from "lucide-react";
import { useStore } from "../store";
import { translateStatus, phrase } from "../i18n";
import { motion } from "motion/react";
import { useMotionEnabled } from "./Motion";
function translated(node: ReactNode, lang: "en" | "es" | "it"): ReactNode {
  return Children.map(node, (child) => {
    if (typeof child === "string") return phrase(child, lang);
    if (isValidElement<{ children?: ReactNode }>(child) && child.props.children)
      return cloneElement(child, {}, translated(child.props.children, lang));
    return child;
  });
}
export function Button({
  children,
  variant = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost" | "danger";
}) {
  const { state } = useStore();
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {translated(children, state.language)}
    </button>
  );
}
export function Badge({ value }: { value: string }) {
  const { state } = useStore();
  const v = value.toLowerCase();
  return (
    <span
      className={`badge ${/not ready|critical|negative|blocked|urgent|stale|failed|unknown|rejected/.test(v) ? "red" : /at risk|pending|awaiting|queued|draft|review|needs|proposed|scheduled/.test(v) ? "amber" : /ready|complete|approved|closed|positive|matched|posted|current|outbound/.test(v) ? "green" : "neutral"}`}
    >
      <i />
      {translateStatus(value, state.language)}
    </span>
  );
}
export function Card({
  title,
  subtitle,
  children,
  action,
  className = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { state } = useStore();
  const enabled = useMotionEnabled();
  return (
    <motion.section
      className={`card ${className}`}
      initial={enabled ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: enabled ? 0.5 : 0, ease: [0.16, 1, 0.3, 1] }}
    >
      {(title || action) && (
        <div className="card-heading">
          <div>
            <h2>{translated(title, state.language)}</h2>
            {subtitle && <p>{translated(subtitle, state.language)}</p>}
          </div>
          {action}
        </div>
      )}
      {translated(children, state.language)}
    </motion.section>
  );
}
export function Empty({ text }: { text?: string }) {
  const { t } = useStore();
  return (
    <div className="empty">
      <Inbox size={28} />
      <p>{text || t("noResults")}</p>
    </div>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  const { state } = useStore();
  return (
    <div className="page-heading">
      <div>
        {eyebrow && (
          <span className="eyebrow">{translated(eyebrow, state.language)}</span>
        )}
        <h1>{translated(title, state.language)}</h1>
        {description && <p>{translated(description, state.language)}</p>}
      </div>
      <div className="heading-actions">{actions}</div>
    </div>
  );
}
export function Tabs({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { state } = useStore();
  const id = useId();
  const enabled = useMotionEnabled();
  return (
    <div className={`tabs ${className}`}>
      {Children.map(translated(children, state.language), (child) => {
        if (
          !isValidElement<{ className?: string; children?: ReactNode }>(
            child,
          ) ||
          !child.props.className?.split(" ").includes("selected")
        )
          return child;
        return cloneElement(
          child,
          {},
          <>
            {child.props.children}
            <motion.span
              className="tab-active-line"
              layoutId={`tab-${id}`}
              transition={{
                duration: enabled ? 0.32 : 0,
                ease: [0.16, 1, 0.3, 1],
              }}
              aria-hidden="true"
            />
          </>,
        );
      })}
    </div>
  );
}
export function LinkButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-button" onClick={onClick}>
      {children}
      <ArrowUpRight size={14} />
    </button>
  );
}
export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  sort?: (row: T) => string | number;
}
export function Table<T extends { id: string }>({
  rows,
  columns,
  onRow,
  pageSize = 12,
  searchable = true,
  label = "records",
}: {
  rows: T[];
  columns: Column<T>[];
  onRow?: (r: T) => void;
  pageSize?: number;
  searchable?: boolean;
  label?: string;
}) {
  const { t, state } = useStore();
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [sort, setSort] = useState({ key: "", asc: true });
  const result = useMemo(() => {
    const data = rows.filter(
      (r) =>
        !query ||
        Object.values(r).join(" ").toLowerCase().includes(query.toLowerCase()),
    );
    const col = columns.find((c) => c.key === sort.key);
    if (col?.sort)
      data.sort((a, b) => {
        const x = col.sort!(a),
          y = col.sort!(b);
        return (x < y ? -1 : x > y ? 1 : 0) * (sort.asc ? 1 : -1);
      });
    return data;
  }, [rows, query, columns, sort]);
  const pages = Math.max(1, Math.ceil(result.length / pageSize)),
    safePage = Math.min(page, pages - 1);
  return (
    <div className="data-table">
      {searchable && (
        <div className="table-toolbar">
          <label className="small-search">
            <Search size={15} />
            <input
              aria-label={`Search ${label}`}
              placeholder={`Search ${label}…`}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <span>
            {result.length.toLocaleString()} {label}
          </span>
        </div>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>
                  {c.sort ? (
                    <button
                      onClick={() =>
                        setSort({
                          key: c.key,
                          asc: sort.key === c.key ? !sort.asc : true,
                        })
                      }
                    >
                      {phrase(c.label, state.language)}
                      {sort.key === c.key ? (
                        sort.asc ? (
                          <ArrowUp size={12} />
                        ) : (
                          <ArrowDown size={12} />
                        )
                      ) : (
                        <span className="sort-mark">↕</span>
                      )}
                    </button>
                  ) : (
                    phrase(c.label, state.language)
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result
              .slice(safePage * pageSize, (safePage + 1) * pageSize)
              .map((row) => (
                <tr key={row.id} onClick={() => onRow?.(row)}>
                  {columns.map((c, i) => (
                    <td key={c.key}>
                      {i === 0 && onRow ? (
                        <button
                          className="cell-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRow(row);
                          }}
                        >
                          {c.render
                            ? c.render(row)
                            : String(
                                (row as Record<string, unknown>)[c.key] ?? "",
                              )}
                        </button>
                      ) : c.render ? (
                        c.render(row)
                      ) : (
                        String((row as Record<string, unknown>)[c.key] ?? "")
                      )}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!result.length && <Empty />}
      <div className="table-footer">
        <span>
          {result.length
            ? `${safePage * pageSize + 1}–${Math.min((safePage + 1) * pageSize, result.length)}`
            : "0"}{" "}
          / {result.length}
        </span>
        <div>
          <Button
            aria-label="Previous page"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            <ChevronLeft size={14} />
          </Button>
          <span>
            {safePage + 1} / {pages}
          </span>
          <Button
            aria-label="Next page"
            disabled={safePage >= pages - 1}
            onClick={() => setPage(safePage + 1)}
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
      <span className="sr-only">{t("noLive")}</span>
    </div>
  );
}
export function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  const keys = Object.keys(rows[0] || {}),
    q = (v: unknown) =>
      '"' +
      String(v ?? "")
        .replace(/"/g, '""')
        .replace(/^[=+@-]/, "'$&") +
      '"';
  const csv = [
    keys.map(q).join(","),
    ...rows.map((r) => keys.map((k) => q(r[k])).join(",")),
  ].join("\r\n");
  const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
export function ExportButton({
  rows,
  name,
}: {
  rows: Record<string, unknown>[];
  name: string;
}) {
  const { t } = useStore();
  return (
    <Button onClick={() => exportCsv(`staypilot-${name}.csv`, rows)}>
      <Download size={15} />
      {t("export")}
    </Button>
  );
}
export function Overlay({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const { state } = useStore();
  const enabled = useMotionEnabled();
  const ref = useRef<HTMLDivElement>(null),
    previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previous.current = document.activeElement as HTMLElement;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() =>
      ref.current
        ?.querySelector<HTMLElement>("button,input,select,textarea")
        ?.focus(),
    );
    const handle = (e: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== ref.current) return;
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const elements = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),select,textarea,[tabindex="0"],a[href]',
          ) || [],
        );
        const first = elements[0],
          last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = bodyOverflow;
      document.removeEventListener("keydown", handle);
      if (previous.current?.isConnected) previous.current.focus();
      else
        document
          .querySelector<HTMLElement>("main button,main input,main a")
          ?.focus();
    };
  }, []);
  return (
    <motion.div
      className="overlay"
      initial={enabled ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: enabled ? 0.25 : 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={ref}
        className={`drawer ${wide ? "wide" : ""}`}
        initial={enabled ? { x: "105%", opacity: 0.6 } : false}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "105%", opacity: 0.6 }}
        transition={{ duration: enabled ? 0.42 : 0, ease: [0.16, 1, 0.3, 1] }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="drawer-header">
          <div>
            <span className="eyebrow">STAYPILOT / RECORD DETAILS</span>
            <h2>{translated(title, state.language)}</h2>
          </div>
          <Button variant="ghost" onClick={onClose} aria-label="Close details">
            <X size={21} />
          </Button>
        </div>
        <div className="drawer-body">{children}</div>
      </motion.div>
    </motion.div>
  );
}
export function CheckItem({
  checked,
  onClick,
  children,
}: {
  checked: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={`check-item ${checked ? "checked" : ""}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <span>{checked && <Check size={12} />}</span>
      {children}
    </button>
  );
}
export function PropertyArt({
  country,
  index = 0,
}: {
  country: string;
  index?: number;
}) {
  const colors =
    country === "UK"
      ? ["#c0cdc0", "#e1c8a4", "#416f60"]
      : country === "Spain"
        ? ["#e0c0a1", "#f5e1c5", "#718e72"]
        : ["#bccac2", "#e5d8bd", "#617c72"];
  return (
    <svg
      className="property-art"
      viewBox="0 0 400 210"
      role="img"
      aria-label={`Original illustration of a fictional ${country} holiday home`}
    >
      <rect width="400" height="210" fill={colors[0]} />
      <circle
        cx={320 - (index % 3) * 24}
        cy="48"
        r="25"
        fill="#fff6db"
        opacity=".7"
      />
      <path
        d="M0 160Q70 118 160 151T400 125V210H0"
        fill={colors[2]}
        opacity=".35"
      />
      <path d="M85 96 190 30 298 96" fill={colors[2]} />
      <rect x="101" y="93" width="183" height="117" rx="3" fill={colors[1]} />
      <rect x="171" y="134" width="42" height="76" rx="20" fill={colors[2]} />
      <rect x="120" y="117" width="30" height="43" rx="15" fill="#f8f3df" />
      <rect x="235" y="117" width="30" height="43" rx="15" fill="#f8f3df" />
      <path
        d="M135 118v41m-15-20h30m100-21v41m-15-20h30"
        stroke={colors[2]}
        strokeWidth="3"
      />
      <path
        d="M320 205V115m0 30c-65-10-36-66-1-40 45-42 80 23 1 40"
        stroke={colors[2]}
        fill={colors[2]}
        strokeWidth="5"
      />
      <path d="M0 202h400" stroke="#faf9ed" strokeWidth="14" />
      <path d="M181 202h24l30 8h-82z" fill="#f7eedf" />
    </svg>
  );
}
