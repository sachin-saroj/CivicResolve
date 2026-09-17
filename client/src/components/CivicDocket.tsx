import { StatusBadge, PriorityDot, pretty } from "@/components/CivicPrimitives";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  FileCheck2,
  FileText,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export interface CivicDocketData {
  trackingNumber: string;
  title: string;
  departmentName?: string;
  categoryName?: string;
  status: string;
  priority?: string;
  createdAt?: string | Date;
  slaDueHours?: number;
  location?: string;
  assignedOfficerName?: string;
  latestRemarks?: string;
  attachmentUrl?: string;
}

export default function CivicDocket({
  docket,
  interactive = true,
  className = "",
}: {
  docket: CivicDocketData;
  interactive?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"docket" | "timeline" | "proof">("docket");

  const copyTracking = () => {
    navigator.clipboard.writeText(docket.trackingNumber);
    setCopied(true);
    toast.success(`Tracking reference ${docket.trackingNumber} copied to clipboard.`);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    { key: "submitted", label: "Docket Logged" },
    { key: "assigned", label: "Officer Assigned" },
    { key: "in_progress", label: "Field Inspection" },
    { key: "resolved", label: "Certified Resolved" },
  ];

  const currentStatus = docket.status || "submitted";
  const stepIndex =
    currentStatus === "resolved" || currentStatus === "closed"
      ? 3
      : currentStatus === "in_progress" || currentStatus === "escalated"
        ? 2
        : currentStatus === "assigned" || currentStatus === "acknowledged"
          ? 1
          : 0;

  return (
    <div
      className={`group relative rounded-3xl bg-white dark:bg-[#12151b] border-2 border-[#e4e4e7] dark:border-[#20242f] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.08)] transition-all duration-300 ${
        interactive ? "hover:-translate-y-1 hover:shadow-[0_28px_60px_-12px_rgba(0,0,0,0.12)]" : ""
      } ${className}`}
    >
      {/* Archival Folder Tab Ear */}
      <div className="absolute -top-3.5 left-8 z-10 flex items-center gap-1.5 rounded-t-xl bg-[#0a0a0a] dark:bg-white px-4 py-1 text-[10px] font-mono font-bold tracking-widest text-white dark:text-black uppercase shadow-xs">
        <ShieldCheck className="h-3 w-3 text-[#2563eb] dark:text-[#3b82f6]" />
        <span>Official Dossier</span>
      </div>

      {/* Main Docket Paper Container */}
      <div className="p-6 sm:p-8">
        {/* Header: Tracking ID & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0f2f5] dark:border-[#1e232e] pb-5 pt-1">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 block">
              Civic Tracking Docket
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-[#0a0a0a] dark:text-white">
                {docket.trackingNumber}
              </span>
              <button
                type="button"
                onClick={copyTracking}
                title="Copy reference number"
                className="rounded-lg p-1.5 text-stone-600 dark:text-stone-300 hover:bg-[#f4f4f6] dark:hover:bg-[#181d26] hover:text-[#0a0a0a] dark:hover:text-white transition"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {docket.priority ? <PriorityDot priority={docket.priority} /> : null}
            <StatusBadge status={docket.status} />
          </div>
        </div>

        {/* Tab switcher inside docket */}
        <div className="mt-4 flex items-center gap-1 rounded-xl bg-[#f4f4f6] dark:bg-[#181d26] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("docket")}
            className={`flex-1 rounded-lg py-1.5 text-center transition ${
              activeTab === "docket"
                ? "bg-white dark:bg-[#20242f] text-[#0a0a0a] dark:text-white shadow-xs font-bold"
                : "text-[#71717a] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-white"
            }`}
          >
            Case File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`flex-1 rounded-lg py-1.5 text-center transition ${
              activeTab === "timeline"
                ? "bg-white dark:bg-[#20242f] text-[#0a0a0a] dark:text-white shadow-xs font-bold"
                : "text-[#71717a] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-white"
            }`}
          >
            SLA Progress
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("proof")}
            className={`flex-1 rounded-lg py-1.5 text-center transition ${
              activeTab === "proof"
                ? "bg-white dark:bg-[#20242f] text-[#0a0a0a] dark:text-white shadow-xs font-bold"
                : "text-[#71717a] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-white"
            }`}
          >
            Evidence & Log
          </button>
        </div>

        {/* Tab 1: Case File Information */}
        {activeTab === "docket" && (
          <div className="mt-5 space-y-4 animate-in fade-in duration-200">
            <div>
              <h3 className="font-editorial text-xl sm:text-2xl font-bold text-[#0a0a0a] dark:text-white leading-tight">
                {docket.title}
              </h3>
              {docket.location ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-[#71717a] dark:text-[#a1a1aa]">
                  <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <span>{docket.location}</span>
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="rounded-xl border border-[#eceef1] dark:border-[#20242f] bg-[#fafcfe] dark:bg-[#161922] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] block">
                  Department
                </span>
                <span className="mt-0.5 font-bold text-[#0a0a0a] dark:text-white truncate block">
                  {docket.departmentName || "Public Works"}
                </span>
              </div>
              <div className="rounded-xl border border-[#eceef1] dark:border-[#20242f] bg-[#fafcfe] dark:bg-[#161922] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] block">
                  Classification
                </span>
                <span className="mt-0.5 font-bold text-[#0a0a0a] dark:text-white truncate block">
                  {docket.categoryName || "General Infrastructure"}
                </span>
              </div>
            </div>

            {docket.assignedOfficerName ? (
              <div className="flex items-center justify-between rounded-xl bg-[#eff6ff] dark:bg-[#152033] px-3.5 py-2.5 text-xs text-[#1e3a8a] dark:text-[#93c5fd] border border-[#dbeafe] dark:border-[#1e3a8a]/40">
                <span className="font-semibold">Investigating Officer:</span>
                <span className="font-bold">{docket.assignedOfficerName}</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Tab 2: SLA Progress & Milestones */}
        {activeTab === "timeline" && (
          <div className="mt-5 space-y-4 animate-in fade-in duration-200">
            <div className="space-y-3">
              {steps.map((step, idx) => {
                const isDone = idx <= stepIndex;
                const isCurrent = idx === stepIndex;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                        isDone
                          ? "bg-[#16a34a] text-white shadow-xs"
                          : "border border-[#d4d4d8] dark:border-[#27272a] text-[#a1a1aa]"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold ${
                          isCurrent
                            ? "text-[#2563eb] dark:text-[#60a5fa]"
                            : isDone
                              ? "text-[#0a0a0a] dark:text-white"
                              : "text-[#a1a1aa] dark:text-[#71717a]"
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <span className="font-medium">Mandatory SLA Commitment:</span>
              <span className="font-bold">
                {docket.slaDueHours ? `${docket.slaDueHours}h Enforced` : "72h Default Threshold"}
              </span>
            </div>
          </div>
        )}

        {/* Tab 3: Proof & Latest Inspection Log */}
        {activeTab === "proof" && (
          <div className="mt-5 space-y-3 animate-in fade-in duration-200">
            <div className="rounded-xl border border-[#eceef1] dark:border-[#20242f] bg-[#fafcfe] dark:bg-[#161922] p-3 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] block mb-1">
                Latest Field Remark
              </span>
              <p className="text-[#3f3f46] dark:text-[#d4d4d8] leading-relaxed">
                {docket.latestRemarks ||
                  "Case verified by central dispatch. Assigned team scheduled for on-site survey."}
              </p>
            </div>

            {docket.attachmentUrl ? (
              <a
                href={docket.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-[#eceef1] dark:border-[#20242f] p-3 text-xs font-semibold text-[#2563eb] hover:bg-[#f4f4f6] dark:hover:bg-[#181d26] transition"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>View Attached Document</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <p className="text-center text-xs text-[#71717a] dark:text-[#a1a1aa] py-2">
                No external document attached to this public entry.
              </p>
            )}
          </div>
        )}

        {/* Footer Link to Full Tracker */}
        <div className="mt-6 pt-4 border-t border-[#f0f2f5] dark:border-[#1e232e] flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-700 dark:text-stone-300">
            Archival Registry
          </span>
          <Link
            href={`/track/${docket.trackingNumber}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#2563eb] dark:text-[#60a5fa] hover:underline"
          >
            <span>Live Redress Timeline</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
