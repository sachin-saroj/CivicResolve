import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function EditorialFooter() {
  return (
    <footer className="relative bg-[#0a0a0a] text-white border-t border-neutral-800/80 overflow-hidden pt-16 pb-12">
      {/* Subtle Grain / Ambient Glow */}
      <div className="absolute top-0 left-1/4 h-64 w-96 -translate-y-1/2 rounded-full bg-[#1d4ed8]/10 blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr] pb-14 border-b border-neutral-800">
          {/* Left Column: Brand & Manifesto */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3.5 py-1 text-xs font-semibold text-neutral-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Public Service Infrastructure • Open Access</span>
            </div>

            <h3 className="font-editorial text-3xl sm:text-4xl font-normal text-neutral-100 tracking-tight leading-tight">
              Designed for transparency. <br />
              <span className="font-script text-4xl sm:text-5xl text-[#60a5fa] italic font-normal">
                Accountable to all.
              </span>
            </h3>

            <p className="text-sm text-neutral-400 leading-relaxed max-w-md font-sans">
              CivicResolve bridges citizens and public departments through transparent tracking, 
              strict SLA enforcement, and automated escalations without requiring a citizen login wall.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/cases/new"
                className="inline-flex items-center gap-2 rounded-full bg-white text-black px-5 py-2.5 text-xs font-bold transition hover:bg-neutral-200"
              >
                <span>Submit Grievance</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/track"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900/60 text-neutral-300 px-5 py-2.5 text-xs font-semibold transition hover:bg-neutral-800 hover:text-white"
              >
                <span>Track Case</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Navigation Links */}
          <div className="grid gap-8 sm:grid-cols-3 pt-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-4">
                Public Services
              </p>
              <ul className="space-y-2.5 text-xs font-medium text-neutral-300">
                <li>
                  <Link href="/track" className="hover:text-white transition">Track Status</Link>
                </li>
                <li>
                  <Link href="/cases/new" className="hover:text-white transition">File Grievance</Link>
                </li>
                <li>
                  <Link href="/manage" className="hover:text-white transition">Public Board</Link>
                </li>
                <li>
                  <a href="#departments" className="hover:text-white transition">Service Catalog</a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-4">
                Service Standards
              </p>
              <ul className="space-y-2.5 text-xs font-medium text-neutral-300">
                <li>
                  <span className="text-neutral-400">72-Hour Default SLA</span>
                </li>
                <li>
                  <span className="text-neutral-400">Auto-Escalation Engine</span>
                </li>
                <li>
                  <span className="text-neutral-400">Zero Citizen Sign-in Wall</span>
                </li>
                <li>
                  <span className="text-neutral-400">Single Feedback Window</span>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-4">
                Administration
              </p>
              <ul className="space-y-2.5 text-xs font-medium text-neutral-300">
                <li>
                  <Link href="/staff/login" className="hover:text-white transition inline-flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-400" />
                    <span>Staff Portal</span>
                  </Link>
                </li>
                <li>
                  <Link href="/admin" className="hover:text-white transition">Executive Analytics</Link>
                </li>
                <li>
                  <Link href="/admin/departments" className="hover:text-white transition">Department Triage</Link>
                </li>
                <li>
                  <Link href="/admin/officers" className="hover:text-white transition">Officer Directory</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Massive Editorial Serif Signature Wordmark */}
        <div className="pt-10 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <h2 className="font-editorial text-5xl sm:text-7xl lg:text-9xl font-bold tracking-[-0.04em] text-white/90 select-none leading-none">
              CIVICRESOLVE
            </h2>
          </div>
          <div className="text-xs text-neutral-500 space-y-1">
            <p>© 2026 CivicResolve Public Redress Infrastructure.</p>
            <p>Certified Public Service Platform • All records encrypted & tracked.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
