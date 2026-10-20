import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { Check } from "lucide-react";
import { useStore } from "../store";
import { localeFor } from "../localization/preferences";

export function useMotionEnabled() {
  const { state } = useStore();
  const reduced = useReducedMotion();
  return state.motion && !reduced;
}

/** Animate the displayed value only; assistive technology receives the final value. */
export function CountUp({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  delay = 0,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  delay?: number;
}) {
  const enabled = useMotionEnabled();
  const { state } = useStore();
  const format = (n: number) =>
    `${prefix}${new Intl.NumberFormat(localeFor(state.language), { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: "always" }).format(n)}${suffix}`;
  const count = useMotionValue(enabled ? 0 : value);
  const display = useTransform(count, format);
  useEffect(() => {
    const control = animate(count, value, {
      duration: enabled ? 1.35 : 0,
      delay: enabled ? delay : 0,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => control.stop();
  }, [value, enabled, count, delay]);
  return (
    <span className="count-up">
      <motion.span aria-hidden="true">{display}</motion.span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}

export function AnimatedValue({ value }: { value: string | number }) {
  const { state } = useStore();
  const match = String(value).match(/^([^\d]*)(\d[\d.,\s\u00a0\u202f]*)(.*)$/);
  if (!match) return <>{value}</>;
  const parts = new Intl.NumberFormat(localeFor(state.language)).formatToParts(
    12345.6,
  );
  const decimal = parts.find((p) => p.type === "decimal")?.value || ".";
  const group = parts.find((p) => p.type === "group")?.value || ",";
  const numeric = match[2]
    .trim()
    .split(group)
    .join("")
    .replace(/\s/g, "")
    .replace(decimal, ".");
  return (
    <CountUp
      value={Number(numeric)}
      decimals={numeric.split(".")[1]?.length || 0}
      prefix={match[1]}
      suffix={(match[2].match(/\s+$/)?.[0] || "") + match[3]}
    />
  );
}

export function HealthGauge({
  value,
  large = false,
}: {
  value: number;
  large?: boolean;
}) {
  const enabled = useMotionEnabled();
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`precision-gauge ${large ? "large" : ""}`}
      aria-label={`Portfolio readiness ${safeValue}%`}
    >
      <svg viewBox="0 0 220 145" aria-hidden="true">
        <defs>
          <linearGradient id={large ? "gauge-large" : "gauge-small"}>
            <stop stopColor="#8bd5c2" />
            <stop offset="1" stopColor="#c3aee4" />
          </linearGradient>
        </defs>
        <path
          d="M30 105 A80 80 0 0 1 190 105"
          fill="none"
          stroke="#ffffff14"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <motion.path
          d="M30 105 A80 80 0 0 1 190 105"
          fill="none"
          stroke={`url(#${large ? "gauge-large" : "gauge-small"})`}
          strokeWidth="7"
          strokeLinecap="round"
          pathLength="1"
          initial={enabled ? { pathLength: 0 } : false}
          animate={{ pathLength: safeValue / 100 }}
          transition={{
            duration: enabled ? 1.6 : 0,
            ease: [0.16, 1, 0.3, 1],
            delay: enabled ? 0.15 : 0,
          }}
        />
        {Array.from({ length: 11 }, (_, i) => {
          const angle = Math.PI + (i * Math.PI) / 10;
          return (
            <line
              key={i}
              x1={110 + Math.cos(angle) * 65}
              y1={105 + Math.sin(angle) * 65}
              x2={110 + Math.cos(angle) * (i % 5 === 0 ? 56 : 61)}
              y2={105 + Math.sin(angle) * (i % 5 === 0 ? 56 : 61)}
              stroke="#ffffff40"
              strokeWidth="1.5"
            />
          );
        })}
        <motion.g
          style={{ transformOrigin: "110px 105px" }}
          initial={enabled ? { rotate: -90 } : false}
          animate={{ rotate: -90 + safeValue * 1.8 }}
          transition={{ duration: enabled ? 1.7 : 0, ease: [0.16, 1, 0.3, 1] }}
        >
          <path d="M108 105 110 43 112 105Z" fill="#e8e3f2" opacity=".7" />
        </motion.g>
        <circle cx="110" cy="105" r="5" fill="#b6e0d2" />
        <text x="24" y="125">
          0
        </text>
        <text x="106" y="15">
          50
        </text>
        <text x="183" y="125">
          100
        </text>
      </svg>
      <div className="gauge-value">
        <strong>
          <CountUp value={safeValue} delay={0.1} />
        </strong>
        <small>out of 100</small>
      </div>
    </div>
  );
}

export function ApprovalFeedback({ label = "Approved" }: { label?: string }) {
  const enabled = useMotionEnabled();
  return (
    <motion.div
      className="approval-feedback"
      initial={enabled ? { opacity: 0, scale: 1.16, rotate: -12 } : false}
      animate={{ opacity: 1, scale: 1, rotate: -6 }}
      transition={{ type: "spring", stiffness: 350, damping: 18 }}
      role="status"
    >
      <Check size={17} />
      {label}
      {enabled && (
        <span className="approval-particles" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <motion.i
              key={i}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos((i * Math.PI) / 6) * 100,
                y: Math.sin((i * Math.PI) / 6) * 70,
                opacity: 0,
                scale: 0.1,
                rotate: i * 40,
              }}
              transition={{ duration: 0.85, ease: "easeOut" }}
            />
          ))}
        </span>
      )}
    </motion.div>
  );
}
