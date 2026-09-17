import {
  CivicMark,
  EditorialHeading,
  PillButton,
  PriorityDot,
  StatusBadge,
  WorkflowStep,
  pretty,
} from "@/components/CivicPrimitives";
import EditorialFooter from "@/components/EditorialFooter";
import EditorialNavbar from "@/components/EditorialNavbar";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  CircleHelp,
  Clock3,
  ExternalLink,
  FileCheck,
  FileSearch,
  FileText,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";

export default function PublicTracker() {
  const [, params] = useRoute("/track/:trackingNumber");
  const [, setLocation] = useLocation();
  const initialTrackingNumber = params?.trackingNumber || "";
  const [entry, setEntry] = useState(initialTrackingNumber);

  useEffect(() => {
    setEntry(initialTrackingNumber);
  }, [initialTrackingNumber]);

  const lookup = trpc.public.lookup.useQuery(
    { trackingNumber: initialTrackingNumber.toUpperCase() },
    { enabled: Boolean(initialTrackingNumber), retry: false }
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (entry.trim()) {
      setLocation(`/track/${entry.trim().toUpperCase()}`);
    }
  };

  const result = lookup.data;

  return (
    <div className="min-h-screen bg-[#fafcfe] dark:bg-[#090a0d] text-[#0a0a0a] dark:text-[#f4f4f5] flex flex-col font-sans selection:bg-[#2563eb] selection:text-white">
      {/* Editorial Navbar */}
      <EditorialNavbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="font-script text-3xl sm:text-4xl text-[#2563eb] dark:text-[#60a5fa] mb-1">
              Public Case Docket
            </p>
            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#0a0a0a] dark:text-white tracking-tight leading-tight">
              Where is your case now?
            </h1>
            <p className="mt-3 text-sm sm:text-base text-[#52525b] dark:text-[#a1a1aa] leading-relaxed">
              Enter your tracking reference to inspect live handling status, assigned department oversight,
              and guaranteed resolution milestones. No sign-in required.
            </p>

            {/* Tracking Search Input Pill */}
            <form onSubmit={onSubmit} className="mt-8 max-w-lg mx-auto">
              <div className="relative flex items-center rounded-full bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-1.5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] transition focus-within:border-[#2563eb] dark:focus-within:border-[#3b82f6]">
                <Search className="ml-3.5 h-4 w-4 text-[#71717a] dark:text-[#a1a1aa] shrink-0" />
                <input
                  id="tracker-entry"
                  type="text"
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                  placeholder="e.g. GRV-2026-00001"
                  className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-[#0a0a0a] dark:text-white outline-none placeholder:text-[#a1a1aa] font-mono tracking-wide uppercase"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-[#2563eb] text-white px-5 py-2.5 text-xs font-bold transition hover:bg-[#1d4ed8] shadow-xs inline-flex items-center gap-1.5"
                >
                  <span>Track Case</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>

            {/* Editorial Secondary Action for Ledger Discovery */}
            <div className="mt-4 flex items-center justify-center">
              <Link
                href="/manage"
                className="group inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-[#52525b] dark:text-[#a1a1aa] hover:text-[#2563eb] dark:hover:text-[#60a5fa] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
              >
                <span>Or inspect recent filings on the <span className="font-semibold underline decoration-[#2563eb]/30 group-hover:decoration-[#2563eb] underline-offset-4">Public Grievance Ledger</span></span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Result or Initial Guidance */}
          {initialTrackingNumber ? (
            <div className="mt-8">
              {lookup.isLoading ? (
                <div className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-10 text-center shadow-xs">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#2563eb] border-t-transparent" />
                  <p className="mt-4 font-editorial text-xl text-[#0a0a0a] dark:text-white">
                    Retrieving official case docket…
                  </p>
                  <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-1 font-mono">
                    {initialTrackingNumber.toUpperCase()}
                  </p>
                </div>
              ) : lookup.error ? (
                <div className="rounded-3xl bg-white dark:bg-[#12151b] border border-rose-200 dark:border-rose-900/50 p-8 sm:p-12 text-center shadow-xs">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                    <CircleHelp className="h-6 w-6" />
                  </span>
                  <h2 className="mt-4 font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white">
                    No Matching Grievance Found
                  </h2>
                  <p className="mt-2 text-sm text-[#71717a] dark:text-[#a1a1aa] max-w-md mx-auto leading-relaxed">
                    We could not locate an official record for reference{" "}
                    <strong className="font-mono text-rose-600 dark:text-rose-400">
                      {initialTrackingNumber.toUpperCase()}
                    </strong>
                    . Please verify the identifier provided on your submission ticket.
                  </p>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setLocation("/track")}
                      className="rounded-full bg-[#f4f4f6] dark:bg-[#181d26] px-5 py-2 text-xs font-semibold text-[#0a0a0a] dark:text-white hover:bg-[#e4e4e7]"
                    >
                      Clear search
                    </button>
                  </div>
                </div>
              ) : result ? (
                /* Authenticated / Verified Case Dossier Card */
                <div className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] overflow-hidden shadow-[0_12px_40px_-4px_rgba(0,0,0,0.06)]">
                  {/* Top Dossier Ribbon */}
                  <div className="bg-[#f4f8fd] dark:bg-[#101b2b] border-b border-[#e1eaf5] dark:border-[#192b42] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="rounded-full bg-[#2563eb]/10 text-[#2563eb] dark:text-[#60a5fa] px-2.5 py-0.5 text-[11px] font-mono font-bold tracking-wider">
                          {result.trackingNumber}
                        </span>
                        <span className="text-xs text-[#71717a] dark:text-[#a1a1aa]">• Public Record</span>
                      </div>
                      <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#0a0a0a] dark:text-white tracking-tight leading-snug">
                        {result.title}
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-[#52525b] dark:text-[#a1a1aa] flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-[#2563eb]" />
                        <span>Responsible Department: <strong className="text-[#0a0a0a] dark:text-white">{result.departmentName}</strong></span>
                      </p>
                    </div>

                    <div className="flex sm:flex-col sm:items-end gap-2.5 shrink-0">
                      <StatusBadge status={result.status} />
                      <PriorityDot priority={result.priority} />
                    </div>
                  </div>

                  {/* Main Docket Content Grid */}
                  <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
                    {/* Left: Summary & Metadata */}
                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] mb-1">
                          Current Service Stage
                        </p>
                        <h3 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white">
                          {result.status === "resolved"
                            ? "Official Resolution Recorded"
                            : result.status === "closed"
                              ? "Case File Closed & Archived"
                              : result.status === "escalated"
                                ? "Critical SLA Escalation Active"
                                : "Active Municipal Handling"}
                        </h3>
                        <p className="mt-1.5 text-xs text-[#71717a] dark:text-[#a1a1aa] leading-relaxed">
                          Last operational log recorded on {new Date(result.updatedAt).toLocaleString()}.
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-[#f0f2f5] dark:border-[#20242f]">
                        <div className="flex items-start gap-2.5">
                          <Calendar className="h-4 w-4 text-[#71717a] mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold uppercase text-[#71717a]">Submitted On</p>
                            <p className="text-xs font-semibold text-[#0a0a0a] dark:text-white mt-0.5">
                              {new Date(result.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <Clock3 className="h-4 w-4 text-[#2563eb] mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold uppercase text-[#71717a]">Statutory SLA</p>
                            <p className="text-xs font-semibold text-[#0a0a0a] dark:text-white mt-0.5">
                              72-Hour Enforced
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Link to Full Public Dossier */}
                      <div className="pt-2">
                        <Link
                          href={`/cases/${result.trackingNumber}`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#0a0a0a] dark:bg-white text-white dark:text-black px-5 py-3 text-xs font-bold transition hover:bg-[#27272a] dark:hover:bg-neutral-200"
                        >
                          <span>Open Full Case Timeline & Feedback</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Right: Visual Step Progress */}
                    <div className="rounded-2xl bg-[#fafcfe] dark:bg-[#0c0e14] border border-[#e8eaed] dark:border-[#20242f] p-5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] mb-4">
                        Workflow Trajectory
                      </p>

                      <div className="space-y-1">
                        <WorkflowStep
                          label="Case Received"
                          state="complete"
                          timestamp="Acknowledgement generated"
                        />
                        <WorkflowStep
                          label="Department Triage"
                          state={["submitted"].includes(result.status) ? "current" : "complete"}
                        />
                        <WorkflowStep
                          label="Officer Inspection"
                          state={
                            ["in_progress", "escalated", "reopened"].includes(result.status)
                              ? "current"
                              : ["resolved", "closed"].includes(result.status)
                                ? "complete"
                                : "future"
                          }
                        />
                        <WorkflowStep
                          label="Formal Resolution"
                          state={["resolved", "closed"].includes(result.status) ? "complete" : "future"}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer Notice */}
                  <div className="bg-[#f8fafc] dark:bg-[#10131a] border-t border-[#e8eaed] dark:border-[#20242f] px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-[#71717a] dark:text-[#a1a1aa] gap-3">
                    <p className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      <span>This public status docket is protected and read-only.</span>
                    </p>
                    <Link href="/manage" className="text-[#2563eb] dark:text-[#60a5fa] font-bold hover:underline">
                      View Department Queue →
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            /* Three Informational Cards When No Search Entered */
            <div className="mt-14 grid gap-6 sm:grid-cols-3">
              <div className="rounded-2xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 shadow-xs">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eff6ff] dark:bg-[#192742] text-[#2563eb]">
                  <FileSearch className="h-5 w-5" />
                </span>
                <h3 className="font-editorial text-xl font-semibold text-[#0a0a0a] dark:text-white mt-4">
                  Unique Case ID
                </h3>
                <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-1.5 leading-relaxed">
                  Every submitted request generates a permanent reference in the format GRV-2026-XXXXX.
                </p>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 shadow-xs">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ecfdf5] dark:bg-[#112d22] text-[#059669]">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <h3 className="font-editorial text-xl font-semibold text-[#0a0a0a] dark:text-white mt-4">
                  Guaranteed SLAs
                </h3>
                <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-1.5 leading-relaxed">
                  Monitor the official turnaround target and observe priority escalation if deadlines near.
                </p>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 shadow-xs">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff7ed] dark:bg-[#2d1b10] text-[#ea580c]">
                  <Sparkles className="h-5 w-5" />
                </span>
                <h3 className="font-editorial text-xl font-semibold text-[#0a0a0a] dark:text-white mt-4">
                  Direct Citizen Audit
                </h3>
                <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-1.5 leading-relaxed">
                  Inspect photographic proof of completion and submit your one-time rating upon resolution.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Editorial Footer */}
      <EditorialFooter />
    </div>
  );
}
