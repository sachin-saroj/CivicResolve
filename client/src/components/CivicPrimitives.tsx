import { ArrowUpRight, CheckCircle2, Clock3, FileText, MapPin } from "lucide-react";
import { Link } from "wouter";
import type { ReactNode } from "react";

export function CivicMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3 group" aria-label="CivicResolve home">
      <span className={`grid h-9 w-9 place-items-center rounded-[13px] ${inverse ? "bg-white text-black" : "bg-[#121413] text-white"}`}>
        <span className="relative block h-4 w-4">
          <i className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#9ccbf4]" />
          <i className="absolute right-0 top-0 h-2 w-2 rounded-[2px] bg-[#f4bec9]" />
          <i className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-[#c7d9a2]" />
        </span>
      </span>
      <span className={`font-semibold tracking-[-0.045em] ${inverse ? "text-white" : "text-[#121413]"}`}>CivicResolve</span>
    </Link>
  );
}

const statusTheme: Record<string, string> = {
  submitted: "bg-slate-100 text-slate-700 ring-slate-200",
  acknowledged: "bg-blue-50 text-blue-800 ring-blue-100",
  assigned: "bg-indigo-50 text-indigo-800 ring-indigo-100",
  in_progress: "bg-amber-50 text-amber-800 ring-amber-100",
  escalated: "bg-rose-50 text-rose-800 ring-rose-100",
  resolved: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  reopened: "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-100",
  closed: "bg-zinc-100 text-zinc-800 ring-zinc-200",
};

export function pretty(value?: string | null) {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, character => character.toUpperCase());
}

export function StatusBadge({ status }: { status?: string | null }) {
  const key = status || "submitted";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] ring-1 ${statusTheme[key] || statusTheme.submitted}`}>{pretty(key)}</span>;
}

export function PriorityDot({ priority }: { priority?: string | null }) {
  const style: Record<string, string> = { low: "bg-slate-400", medium: "bg-sky-500", high: "bg-orange-500", critical: "bg-rose-500" };
  return <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-600"><i className={`h-2 w-2 rounded-full ${style[priority || "medium"]}`} />{pretty(priority || "medium")}</span>;
}

export function MetricCard({ label, value, hint, tone = "blue", icon }: { label: string; value: number | string; hint?: string; tone?: "blue" | "pink" | "lime" | "ink"; icon?: ReactNode }) {
  const tones = { blue: "bg-[#dfeffc]", pink: "bg-[#f9e2e6]", lime: "bg-[#eaf1d8]", ink: "bg-[#1c1f1d] text-white" };
  return (
    <article className={`rounded-[24px] p-5 sm:p-6 ${tones[tone]} min-h-[144px] flex flex-col justify-between`}>
      <div className="flex items-start justify-between gap-3"><p className="text-xs font-medium tracking-[0.08em] uppercase opacity-60">{label}</p><span className="opacity-75">{icon}</span></div>
      <div><p className="text-4xl font-semibold tracking-[-0.07em] leading-none">{value}</p>{hint ? <p className="mt-3 text-xs opacity-65">{hint}</p> : null}</div>
    </article>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-2xl"><p className="micro-label">{eyebrow || "CivicResolve"}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-[#121413] sm:text-4xl">{title}</h1>{description ? <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">{description}</p> : null}</div>{action ? <div className="shrink-0">{action}</div> : null}</div>;
}

export function CaseTitle({ trackingNumber, title, location }: { trackingNumber: string; title: string; location?: string | null }) {
  return <div><p className="text-[11px] font-semibold tracking-[0.1em] text-slate-400">{trackingNumber}</p><p className="mt-1 font-semibold tracking-[-0.025em] text-[#1c1f1d]">{title}</p>{location ? <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{location}</p> : null}</div>;
}

export function EmptyNotice({ title, children, icon = <FileText className="h-5 w-5" /> }: { title: string; children: ReactNode; icon?: ReactNode }) {
  return <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center"><span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#e7f1fb] text-[#245d8d]">{icon}</span><h3 className="mt-4 font-semibold tracking-[-0.025em]">{title}</h3><div className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{children}</div></div>;
}

export function DetailLine({ icon, label, children }: { icon?: ReactNode; label: string; children: ReactNode }) {
  return <div className="flex gap-3"><span className="mt-0.5 text-slate-400">{icon}</span><div><p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-400">{label}</p><div className="mt-1 text-sm text-slate-700">{children}</div></div></div>;
}

export function WorkflowStep({ label, state, timestamp }: { label: string; state: "complete" | "current" | "future"; timestamp?: string }) {
  const visual = state === "complete" ? "bg-[#1e7b5e] text-white" : state === "current" ? "border-2 border-[#1e7b5e] bg-white text-[#1e7b5e]" : "border border-slate-200 bg-white text-slate-300";
  return <div className="relative flex gap-3 pb-7 last:pb-0"><span className={`z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] ${visual}`}>{state === "complete" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}</span><div className="pt-0.5"><p className={`text-sm font-semibold ${state === "future" ? "text-slate-400" : "text-[#1c1f1d]"}`}>{label}</p>{timestamp ? <p className="mt-0.5 text-xs text-slate-400">{timestamp}</p> : null}</div><span className="absolute left-[11px] top-6 h-[calc(100%-24px)] w-px bg-slate-200 last:hidden" /></div>;
}

export function TextLink({ children, href }: { children: ReactNode; href: string }) {
  return <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#121413] underline decoration-slate-300 underline-offset-4 transition hover:decoration-[#121413]">{children}<ArrowUpRight className="h-3.5 w-3.5" /></Link>;
}
