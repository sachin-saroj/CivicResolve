import { ArrowUpRight, CheckCircle2, Clock3, FileText, MapPin, AlertCircle, Sparkles, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import React, { type ReactNode } from "react";

export function CivicMark({ inverse = false, size = "md" }: { inverse?: boolean; size?: "sm" | "md" | "lg" }) {
  const isLg = size === "lg";
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 group" aria-label="CivicResolve home">
      <span className={`grid ${isLg ? "h-11 w-11 rounded-[14px]" : "h-8.5 w-8.5 rounded-[11px]"} place-items-center ${
        inverse
          ? "bg-white text-black shadow-sm"
          : "bg-[#0a0a0a] text-white dark:bg-[#1f242e] dark:border dark:border-[#2f3645] shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
      }`}>
        <span className="relative block h-3.5 w-3.5">
          <i className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#3b82f6]" />
          <i className="absolute right-0 top-0 h-1.5 w-1.5 rounded-[2px] bg-[#f43f5e]" />
          <i className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-[#10b981]" />
        </span>
      </span>
      <div className="flex flex-col">
        <span className={`font-editorial ${isLg ? "text-2xl" : "text-xl"} font-bold tracking-[-0.03em] leading-tight ${
          inverse ? "text-white" : "text-[#0a0a0a] dark:text-white"
        }`}>
          CivicResolve
        </span>
      </div>
    </Link>
  );
}

export function EditorialHeading({
  eyebrow,
  title,
  subtitle,
  swash = false,
  align = "left",
  size = "md",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  swash?: boolean;
  align?: "left" | "center";
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";
  const sizeClasses = {
    sm: "text-2xl sm:text-3xl",
    md: "text-3xl sm:text-4xl lg:text-5xl",
    lg: "text-4xl sm:text-5xl lg:text-6xl",
    xl: "text-5xl sm:text-6xl lg:text-7xl",
  }[size];

  return (
    <div className={`max-w-3xl ${alignClass}`}>
      {eyebrow ? (
        <p className="font-script text-2xl sm:text-3xl text-[#2563eb] dark:text-[#60a5fa] leading-none mb-1">
          {eyebrow}
        </p>
      ) : null}
      <h2 className={`font-editorial ${sizeClasses} font-semibold text-[#0a0a0a] dark:text-white tracking-[-0.03em] leading-[1.08]`}>
        {swash && title.length > 0 ? (
          <>
            <span className="font-script text-[1.28em] font-normal text-[#2563eb] dark:text-[#60a5fa] inline-block mr-1 leading-none">
              {title.charAt(0)}
            </span>
            {title.slice(1)}
          </>
        ) : (
          title
        )}
      </h2>
      {subtitle ? (
        <p className="mt-3.5 text-sm sm:text-base leading-relaxed text-[#52525b] dark:text-[#a1a1aa] font-sans">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function PillButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "blue" | "maroon" | "outline" | "quiet";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}) {
  const sizeClass = {
    sm: "h-9 px-4 text-xs",
    md: "h-11 px-6 text-sm",
    lg: "h-13 px-8 text-base",
  }[size];

  const variantClass = {
    primary:
      "bg-[#0a0a0a] text-white border border-[#27272a] hover:bg-[#18181b] shadow-[0_2px_10px_rgba(0,0,0,0.1)] dark:bg-white dark:text-black dark:border-white/20 dark:hover:bg-neutral-200",
    blue:
      "bg-[#2563eb] text-white border border-[#1d4ed8] hover:bg-[#1d4ed8] shadow-[0_4px_14px_rgba(37,99,235,0.25)]",
    maroon:
      "bg-[#881337] text-white border border-[#9f1239] hover:bg-[#9f1239] shadow-[0_4px_14px_rgba(136,19,55,0.25)]",
    secondary:
      "bg-[#f4f4f6] text-[#0a0a0a] border border-[#e4e4e7] hover:bg-[#eaeaea] dark:bg-[#181d26] dark:text-white dark:border-[#272f3d] dark:hover:bg-[#202734]",
    outline:
      "bg-transparent text-[#0a0a0a] border border-[#d4d4d8] hover:bg-[#f4f4f6] dark:text-white dark:border-[#3f3f46] dark:hover:bg-[#181d26]",
    quiet:
      "bg-transparent text-[#52525b] hover:text-[#0a0a0a] hover:bg-[#f4f4f6] dark:text-[#a1a1aa] dark:hover:text-white dark:hover:bg-[#181d26]",
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`pill-button ${sizeClass} ${variantClass} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

export function FolderTabCard({
  tabTitle,
  title,
  subtitle,
  icon,
  badge,
  children,
  accent = "blue",
  className = "",
}: {
  tabTitle: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: string;
  children?: ReactNode;
  accent?: "blue" | "navy" | "teal" | "orange" | "maroon" | "green";
  className?: string;
}) {
  const accentBorders = {
    blue: "border-t-[#2563eb]",
    navy: "border-t-[#0f172a]",
    teal: "border-t-[#0d9488]",
    orange: "border-t-[#ea580c]",
    maroon: "border-t-[#881337]",
    green: "border-t-[#16a34a]",
  }[accent];

  return (
    <div className={`relative flex flex-col pt-3 ${className}`}>
      {/* Folder Tab Ear on Top */}
      <div className="flex items-center">
        <div className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-t-xl bg-white dark:bg-[#12151b] border-t border-l border-r border-[#e4e4e7] dark:border-[#20242f] text-[11px] font-bold tracking-wider uppercase text-[#71717a] dark:text-[#a1a1aa] shadow-[0_-2px_6px_rgba(0,0,0,0.02)] transition-colors duration-150`}>
          {icon ? <span className="h-3 w-3">{icon}</span> : null}
          <span>{tabTitle}</span>
        </div>
      </div>

      {/* Main Card Body */}
      <div className={`rounded-b-2xl rounded-tr-2xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] border-t-2 ${accentBorders} p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] transition-all hover:translate-y-[-2px] hover:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.06)]`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-editorial text-xl sm:text-2xl font-semibold text-[#0a0a0a] dark:text-white tracking-tight">
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-1 text-xs sm:text-sm text-[#52525b] dark:text-[#a1a1aa] leading-relaxed">
                {subtitle}
              </p>
            ) : null}
          </div>
          {badge ? (
            <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#f4f4f6] dark:bg-[#181d26] text-[#27272a] dark:text-[#e4e4e7] border border-[#e4e4e7] dark:border-[#272f3d]">
              {badge}
            </span>
          ) : null}
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  );
}

const statusConfig: Record<string, { label: string; bg: string; text: string; ring: string; dot: string }> = {
  submitted: {
    label: "Submitted",
    bg: "bg-slate-50 dark:bg-slate-900/60",
    text: "text-slate-700 dark:text-slate-300",
    ring: "ring-slate-200 dark:ring-slate-800",
    dot: "bg-slate-400",
  },
  acknowledged: {
    label: "Acknowledged",
    bg: "bg-blue-50 dark:bg-blue-950/60",
    text: "text-blue-800 dark:text-blue-300",
    ring: "ring-blue-200 dark:ring-blue-800",
    dot: "bg-blue-500",
  },
  assigned: {
    label: "Assigned",
    bg: "bg-indigo-50 dark:bg-indigo-950/60",
    text: "text-indigo-800 dark:text-indigo-300",
    ring: "ring-indigo-200 dark:ring-indigo-800",
    dot: "bg-indigo-500",
  },
  in_progress: {
    label: "In Progress",
    bg: "bg-amber-50 dark:bg-amber-950/60",
    text: "text-amber-800 dark:text-amber-300",
    ring: "ring-amber-200 dark:ring-amber-800",
    dot: "bg-amber-500",
  },
  escalated: {
    label: "Escalated",
    bg: "bg-rose-50 dark:bg-rose-950/70",
    text: "text-rose-800 dark:text-rose-200",
    ring: "ring-rose-300 dark:ring-rose-800",
    dot: "bg-rose-500 animate-pulse motion-reduce:animate-none",
  },
  resolved: {
    label: "Resolved",
    bg: "bg-emerald-50 dark:bg-emerald-950/60",
    text: "text-emerald-800 dark:text-emerald-300",
    ring: "ring-emerald-200 dark:ring-emerald-800",
    dot: "bg-emerald-500",
  },
  reopened: {
    label: "Reopened",
    bg: "bg-fuchsia-50 dark:bg-fuchsia-950/60",
    text: "text-fuchsia-800 dark:text-fuchsia-300",
    ring: "ring-fuchsia-200 dark:ring-fuchsia-800",
    dot: "bg-fuchsia-500",
  },
  closed: {
    label: "Closed",
    bg: "bg-zinc-100 dark:bg-zinc-800/80",
    text: "text-zinc-800 dark:text-zinc-300",
    ring: "ring-zinc-200 dark:ring-zinc-700",
    dot: "bg-zinc-500",
  },
};

export function pretty(value?: string | null) {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, character => character.toUpperCase());
}

export function StatusBadge({ status, size = "md" }: { status?: string | null; size?: "sm" | "md" }) {
  const key = status || "submitted";
  const conf = statusConfig[key] || statusConfig.submitted;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${sizeClasses} font-semibold tracking-wide ring-1 ${conf.bg} ${conf.text} ${conf.ring}`}
    >
      <i className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
      {conf.label}
    </span>
  );
}

export function PriorityDot({ priority }: { priority?: string | null }) {
  const style: Record<string, { dot: string; text: string }> = {
    low: { dot: "bg-slate-400 dark:bg-slate-500", text: "text-slate-600 dark:text-slate-400" },
    medium: { dot: "bg-sky-500", text: "text-sky-700 dark:text-sky-400" },
    high: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
    critical: { dot: "bg-rose-500 animate-pulse motion-reduce:animate-none", text: "text-rose-700 dark:text-rose-400 font-semibold" },
  };
  const conf = style[priority || "medium"] || style.medium;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${conf.text}`}>
      <i className={`h-2 w-2 rounded-full ${conf.dot}`} />
      {pretty(priority || "medium")}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "blue",
  icon,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "blue" | "pink" | "lime" | "ink" | "lavender" | "peach";
  icon?: ReactNode;
}) {
  const tones: Record<string, { bg: string; text: string; border: string; darkBg: string; darkBorder: string }> = {
    blue: { bg: "bg-[#eff6ff]", text: "text-[#1e3a8a]", border: "border-[#dbeafe]", darkBg: "dark:bg-[#101e38]", darkBorder: "dark:border-[#1d2d4d]" },
    lavender: { bg: "bg-[#f5f3ff]", text: "text-[#4c1d95]", border: "border-[#ede9fe]", darkBg: "dark:bg-[#201538]", darkBorder: "dark:border-[#2f204e]" },
    peach: { bg: "bg-[#fff7ed]", text: "text-[#7c2d12]", border: "border-[#ffedd5]", darkBg: "dark:bg-[#2e1810]", darkBorder: "dark:border-[#422216]" },
    pink: { bg: "bg-[#fff1f2]", text: "text-[#881337]", border: "border-[#ffe4e6]", darkBg: "dark:bg-[#2e1018]", darkBorder: "dark:border-[#421724]" },
    lime: { bg: "bg-[#f0fdf4]", text: "text-[#14532d]", border: "border-[#dcfce7]", darkBg: "dark:bg-[#102919]", darkBorder: "dark:border-[#173d25]" },
    ink: { bg: "bg-[#0a0a0a]", text: "text-white", border: "border-[#27272a]", darkBg: "dark:bg-[#12151b]", darkBorder: "dark:border-[#252b38]" },
  };
  const isDark = tone === "ink";
  const conf = tones[tone] || tones.blue;

  return (
    <article
      className={`rounded-2xl p-5 sm:p-6 ${conf.bg} ${conf.darkBg} border ${conf.border} ${conf.darkBorder} min-h-[140px] flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all hover:translate-y-[-1px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)]`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-neutral-300" : conf.text}`}>
          {label}
        </p>
        {icon ? (
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${isDark ? "bg-white/10 text-white" : "bg-black/5 dark:bg-white/10 text-current"}`}>
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <p className="font-editorial text-4xl sm:text-5xl font-bold tracking-tight leading-none text-[#0a0a0a] dark:text-white">
            {value}
          </p>
          {hint ? (
            <span className="text-xs text-[#71717a] dark:text-[#a1a1aa] font-medium">
              {hint}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between pb-2 border-b border-[#e8eaed] dark:border-[#20242f]">
      <div className="max-w-2xl">
        <p className="micro-label text-[#2563eb] dark:text-[#60a5fa]">{eyebrow || "CivicResolve"}</p>
        <h1 className="mt-1.5 font-editorial text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-[-0.03em] text-[#0a0a0a] dark:text-white leading-tight">
          {title}
        </h1>
        {description ? (
          <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-[#52525b] dark:text-[#a1a1aa]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CaseTitle({
  trackingNumber,
  title,
  location,
}: {
  trackingNumber: string;
  title: string;
  location?: string | null;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-wider font-mono text-[#2563eb] dark:text-[#60a5fa]">
        {trackingNumber}
      </p>
      <h3 className="mt-1 font-editorial text-lg sm:text-xl font-semibold tracking-tight text-[#0a0a0a] dark:text-white leading-snug">
        {title}
      </h3>
      {location ? (
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#71717a] dark:text-[#a1a1aa]">
          <MapPin className="h-3 w-3 text-rose-500" />
          {location}
        </p>
      ) : null}
    </div>
  );
}

export function EmptyNotice({
  title,
  children,
  icon = <FileText className="h-5 w-5" />,
}: {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d4d4d8] dark:border-[#27272a] bg-white dark:bg-[#12151b] px-6 py-12 text-center shadow-xs">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#eff6ff] dark:bg-[#1e293b] text-[#2563eb] dark:text-[#60a5fa]">
        {icon}
      </span>
      <h3 className="mt-4 font-editorial text-2xl font-semibold tracking-tight text-[#0a0a0a] dark:text-white">
        {title}
      </h3>
      <div className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#52525b] dark:text-[#a1a1aa]">
        {children}
      </div>
    </div>
  );
}

export function DetailLine({ icon, label, children }: { icon?: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-[#a1a1aa] dark:text-[#71717a]">{icon}</span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">{label}</p>
        <div className="mt-0.5 text-sm text-[#27272a] dark:text-[#e4e4e7]">{children}</div>
      </div>
    </div>
  );
}

export function WorkflowStep({
  label,
  state,
  timestamp,
}: {
  label: string;
  state: "complete" | "current" | "future";
  timestamp?: string;
}) {
  const visual =
    state === "complete"
      ? "bg-[#16a34a] text-white"
      : state === "current"
        ? "border-2 border-[#2563eb] bg-white dark:bg-[#12151b] text-[#2563eb]"
        : "border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#12151b] text-[#a1a1aa]";

  return (
    <div className="relative flex gap-3 pb-7 last:pb-0">
      <span className={`z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] ${visual}`}>
        {state === "complete" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
      </span>
      <div className="pt-0.5">
        <p className={`text-sm font-semibold ${state === "future" ? "text-[#a1a1aa] dark:text-[#71717a]" : "text-[#0a0a0a] dark:text-white"}`}>
          {label}
        </p>
        {timestamp ? <p className="mt-0.5 text-xs text-[#71717a] dark:text-[#a1a1aa]">{timestamp}</p> : null}
      </div>
      <span className="absolute left-[11px] top-6 h-[calc(100%-24px)] w-px bg-[#e4e4e7] dark:bg-[#27272a] last:hidden" />
    </div>
  );
}

export function TextLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0a0a0a] dark:text-white underline decoration-[#d4d4d8] dark:decoration-[#3f3f46] underline-offset-4 transition hover:decoration-[#0a0a0a] dark:hover:decoration-white"
    >
      {children}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  );
}

export function TactileCard({
  children,
  className = "",
  border = "default",
}: {
  children: ReactNode;
  className?: string;
  border?: "default" | "strong" | "subtle";
}) {
  const borderClass = {
    default: "border-[#e4e4e7] dark:border-[#20242f]",
    strong: "border-[#d4d4d8] dark:border-[#272f3d]",
    subtle: "border-[#f4f4f5] dark:border-[#181d26]",
  }[border];

  return (
    <div
      className={`rounded-3xl bg-white dark:bg-[#12151b] border ${borderClass} shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function EditorialEyebrow({
  children,
  variant = "script",
  className = "",
}: {
  children: ReactNode;
  variant?: "script" | "caps";
  className?: string;
}) {
  if (variant === "script") {
    return (
      <p className={`font-script text-2xl sm:text-3xl text-[#2563eb] dark:text-[#60a5fa] leading-none mb-1 ${className}`}>
        {children}
      </p>
    );
  }
  return (
    <p className={`text-[11px] font-bold uppercase tracking-[0.16em] text-[#71717a] dark:text-[#a1a1aa] mb-2 ${className}`}>
      {children}
    </p>
  );
}

export function EditorialCard({
  children,
  className = "",
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 sm:p-8 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.04)] ${
        hover ? "transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.08)]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function SoftCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-[#f2f2f2] dark:bg-[#161922] border border-[#e8eaed] dark:border-[#20242f] p-5 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function ElevatedCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl bg-white dark:bg-[#12151b] border border-[#d4d4d8] dark:border-[#272f3d] p-6 sm:p-8 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.1)] ${className}`}
    >
      {children}
    </div>
  );
}

export function DocumentCard({
  docketNumber,
  title,
  department,
  status,
  timestamp,
  children,
  className = "",
}: {
  docketNumber: string;
  title: string;
  department?: string;
  status?: string;
  timestamp?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-2xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] transition hover:shadow-md ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[#f0f0f2] dark:border-[#1d222c] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
            {docketNumber}
          </span>
        </div>
        {status ? <StatusBadge status={status} size="sm" /> : null}
      </div>
      <h4 className="font-editorial text-lg sm:text-xl font-semibold text-[#0a0a0a] dark:text-white leading-snug">
        {title}
      </h4>
      {department || timestamp ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#71717a] dark:text-[#a1a1aa]">
          {department ? <span>{department}</span> : null}
          {department && timestamp ? <span>•</span> : null}
          {timestamp ? <span>{timestamp}</span> : null}
        </div>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export function FeatureCard({
  icon,
  eyebrow,
  title,
  description,
  accent = "blue",
  className = "",
}: {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
  accent?: "blue" | "navy" | "teal" | "orange" | "maroon" | "green";
  className?: string;
}) {
  const accentColors = {
    blue: "text-[#2563eb] bg-[#eff6ff] dark:bg-[#1e293b]",
    navy: "text-[#182454] bg-[#f0f2f8] dark:bg-[#161a28]",
    teal: "text-[#0d4e60] bg-[#eef8f8] dark:bg-[#122428]",
    orange: "text-[#f97f07] bg-[#fff7ed] dark:bg-[#2c1d12]",
    maroon: "text-[#5c0f08] bg-[#fdf2f2] dark:bg-[#2a1315]",
    green: "text-[#4caf6d] bg-[#f0fdf4] dark:bg-[#14261a]",
  }[accent];

  return (
    <div
      className={`rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 sm:p-8 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] transition hover:-translate-y-1 hover:shadow-md ${className}`}
    >
      {icon ? (
        <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${accentColors}`}>
          {icon}
        </div>
      ) : null}
      {eyebrow ? (
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] mb-1.5">
          {eyebrow}
        </p>
      ) : null}
      <h3 className="font-editorial text-2xl font-semibold text-[#0a0a0a] dark:text-white tracking-tight">
        {title}
      </h3>
      <p className="mt-2.5 text-sm leading-relaxed text-[#52525b] dark:text-[#a1a1aa]">
        {description}
      </p>
    </div>
  );
}

export function ImageFrame({
  src,
  alt,
  caption,
  rotation = "none",
  className = "",
}: {
  src: string;
  alt: string;
  caption?: string;
  rotation?: "left" | "right" | "none";
  className?: string;
}) {
  const rotClass = {
    left: "-rotate-1 hover:rotate-0",
    right: "rotate-1 hover:rotate-0",
    none: "",
  }[rotation];

  return (
    <figure className={`group relative transition-transform duration-300 ${rotClass} ${className}`}>
      <div className="overflow-hidden rounded-3xl border-4 border-white dark:border-[#1c212a] bg-white dark:bg-[#12151b] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.12)]">
        <img src={src} alt={alt} className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
      </div>
      {caption ? (
        <figcaption className="mt-3 text-center text-xs font-mono uppercase tracking-widest text-[#71717a] dark:text-[#a1a1aa]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function EditorialSection({
  children,
  className = "",
  container = "default",
}: {
  children: ReactNode;
  className?: string;
  container?: "default" | "narrow" | "wide" | "full";
}) {
  const containerClass = {
    narrow: "max-w-4xl mx-auto px-4 sm:px-6",
    default: "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8",
    wide: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    full: "w-full px-4 sm:px-6 lg:px-8",
  }[container];

  return (
    <section className={`py-14 sm:py-20 lg:py-24 ${className}`}>
      <div className={containerClass}>{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className = "",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-dashed border-[#d4d4d8] dark:border-[#27272a] bg-white/60 dark:bg-[#12151b]/60 backdrop-blur-xs p-8 sm:p-12 text-center ${className}`}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff6ff] dark:bg-[#1e293b] text-[#2563eb] dark:text-[#60a5fa]">
        {icon || <FileText className="h-6 w-6" />}
      </div>
      <h3 className="font-editorial text-2xl font-semibold text-[#0a0a0a] dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#52525b] dark:text-[#a1a1aa]">
        {description}
      </p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}


