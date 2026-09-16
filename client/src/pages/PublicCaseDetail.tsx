import {
  CaseTitle,
  DetailLine,
  EmptyNotice,
  PageHeader,
  PriorityDot,
  StatusBadge,
  WorkflowStep,
  pretty,
} from "@/components/CivicPrimitives";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import React, { useState } from "react";
import { Link, useRoute } from "wouter";

const journey = ["submitted", "acknowledged", "assigned", "in_progress", "resolved", "closed"];

export default function PublicCaseDetail() {
  const [, params] = useRoute("/cases/:trackingNumber");
  const trackingNumber = params?.trackingNumber?.toUpperCase() || "";
  const detail = trpc.portal.detail.useQuery({ trackingNumber }, { enabled: Boolean(trackingNumber) });

  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const feedback = trpc.portal.feedback.useMutation({
    onSuccess: () => {
      detail.refetch();
      setComment("");
    },
  });

  if (detail.isLoading) {
    return (
      <div className="mx-auto max-w-5xl py-12 space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="h-80 animate-pulse rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f]" />
      </div>
    );
  }

  if (!detail.data) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <EmptyNotice title="Case Record Unavailable">
          {detail.error?.message || "We could not find an official case corresponding to this tracking reference. Please verify your reference number and retry."}
        </EmptyNotice>
      </div>
    );
  }

  const data = detail.data;
  const currentIndex = Math.max(journey.indexOf(data.grievance.status), 0);

  return (
    <div className="mx-auto max-w-5xl py-6 space-y-8 animate-fade-in font-sans">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/track"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#52525b] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-white transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Case Tracker</span>
        </Link>
        <span className="text-[11px] font-mono font-bold text-[#2563eb] dark:text-[#60a5fa] rounded-full bg-[#eff6ff] dark:bg-[#14233c] px-3 py-1 border border-[#dbeafe] dark:border-[#1e3a66]">
          {data.grievance.trackingNumber}
        </span>
      </div>

      <PageHeader
        eyebrow="Public tracking"
        title="Case details"
        description="Follow the complete service journey with your tracking reference. This public view is read-only."
      />

      {/* Main Editorial Case File Card */}
      <div className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] overflow-hidden shadow-[0_12px_40px_-4px_rgba(0,0,0,0.06)]">
        {/* Header Ribbon */}
        <div className="bg-[#f4f8fd] dark:bg-[#101b2b] border-b border-[#e1eaf5] dark:border-[#192b42] p-6 sm:p-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <CaseTitle
            trackingNumber={data.grievance.trackingNumber}
            title={data.grievance.title}
            location={data.grievance.location}
          />

          <div className="flex sm:flex-col sm:items-end gap-2.5 shrink-0">
            <StatusBadge status={data.grievance.status} />
            <PriorityDot priority={data.grievance.priority} />
          </div>
        </div>

        {/* Dossier Body */}
        <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.3fr_0.7fr]">
          {/* Left: Narrative & Resolution Details */}
          <div className="space-y-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] mb-2">
                Issue described
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#27272a] dark:text-[#e4e4e7] font-sans">
                {data.grievance.description}
              </p>
            </div>

            {/* Department & Operational Metadata */}
            <div className="grid gap-5 sm:grid-cols-2 pt-6 border-t border-[#f0f2f5] dark:border-[#20242f]">
              <DetailLine icon={<Building2 className="h-4 w-4 text-[#2563eb]" />} label="Service area">
                <span className="font-semibold text-[#0a0a0a] dark:text-white">{data.department.name}</span>
                <span className="block text-xs text-[#71717a] dark:text-[#a1a1aa]">{data.category.name}</span>
              </DetailLine>

              <DetailLine icon={<Clock3 className="h-4 w-4 text-[#0d9488]" />} label="Received">
                <span className="font-semibold text-[#0a0a0a] dark:text-white">
                  {new Date(data.grievance.createdAt).toLocaleDateString()}
                </span>
                <span className="block text-xs text-[#71717a] dark:text-[#a1a1aa]">
                  {new Date(data.grievance.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </DetailLine>

              <DetailLine icon={<MessageSquareText className="h-4 w-4 text-[#16a34a]" />} label="Reported location">
                <span className="font-semibold text-[#0a0a0a] dark:text-white">
                  {data.grievance.location || "Not specified"}
                </span>
              </DetailLine>

              <DetailLine icon={<Clock3 className="h-4 w-4 text-[#71717a]" />} label="Last update">
                <span className="font-semibold text-[#0a0a0a] dark:text-white">
                  {new Date(data.grievance.updatedAt).toLocaleDateString()}
                </span>
              </DetailLine>
            </div>

            {/* Official Resolution Summary (When Available) */}
            {data.grievance.resolutionDetails ? (
              <div className="rounded-2xl bg-[#f0fdf4] dark:bg-[#0e2417] border border-[#dcfce7] dark:border-[#163824] p-6">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-[#16a34a] dark:text-[#4ade80]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Resolution details</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#14532d] dark:text-[#bbf7d0]">
                  {data.grievance.resolutionDetails}
                </p>
              </div>
            ) : null}

            {/* Attached Verification Documents */}
            {data.attachments?.length ? (
              <div className="pt-4 border-t border-[#f0f2f5] dark:border-[#20242f]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] mb-3">
                  Documents ({data.attachments.length})
                </p>
                <div className="grid gap-2.5">
                  {data.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-[#e4e4e7] dark:border-[#272f3d] bg-[#fafcfe] dark:bg-[#151820] p-3 text-xs font-semibold text-[#0a0a0a] dark:text-white transition hover:bg-[#f4f4f6]"
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <FileText className="h-4 w-4 text-[#2563eb] shrink-0" />
                        <span className="truncate">{att.fileName}</span>
                      </span>
                      <span className="text-[11px] text-[#71717a] dark:text-[#a1a1aa] shrink-0 ml-3">
                        {Math.ceil(att.fileSize / 1024)} KB
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Right: Visual Step Trajectory */}
          <div className="rounded-2xl bg-[#fafcfe] dark:bg-[#0c0e14] border border-[#e8eaed] dark:border-[#20242f] p-6 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
              Workflow position
            </p>

            <div className="space-y-1">
              {journey.map((stage, idx) => (
                <WorkflowStep
                  key={stage}
                  label={pretty(stage)}
                  state={idx < currentIndex ? "complete" : idx === currentIndex ? "current" : "future"}
                  timestamp={idx === currentIndex ? `Current: ${pretty(data.grievance.status)}` : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Two Columns: Historical Activity Log & Citizen Feedback */}
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Timeline Log */}
        <section className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 sm:p-8 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] mb-1">
            Activity record
          </p>
          <h2 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white mb-6">
            Case timeline
          </h2>

          <div className="space-y-6">
            {data.history.map((entry) => (
              <div key={entry.history.id} className="relative border-l-2 border-[#e4e4e7] dark:border-[#20242f] pl-5 pb-1">
                <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-[#2563eb] ring-4 ring-white dark:ring-[#12151b]" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#0a0a0a] dark:text-white">
                    {pretty(entry.history.activityType)}
                  </span>
                  <span className="text-[11px] text-[#71717a] dark:text-[#a1a1aa]">• {pretty(entry.history.newStatus)}</span>
                </div>
                <p className="text-[11px] text-[#71717a] dark:text-[#a1a1aa] mt-0.5">
                  Service team · {new Date(entry.history.createdAt).toLocaleString()}
                </p>
                {entry.history.remarks ? (
                  <p className="mt-2 text-xs sm:text-sm text-[#52525b] dark:text-[#d4d4d8] leading-relaxed">
                    {entry.history.remarks}
                  </p>
                ) : null}
                {entry.history.actionTaken ? (
                  <p className="mt-1 text-xs text-[#2563eb] dark:text-[#60a5fa] font-medium">
                    Action: {entry.history.actionTaken}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* Citizen Feedback or Internal Notice */}
        <section className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          {["resolved", "closed"].includes(data.grievance.status) && !data.feedback ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#16a34a] mb-1">
                Your experience
              </p>
              <h2 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white">
                How did we do?
              </h2>
              <p className="mt-2 text-xs text-[#71717a] dark:text-[#a1a1aa] leading-relaxed">
                Share one response about how this case was handled. Feedback can be submitted once.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  feedback.mutate({
                    trackingNumber,
                    rating: Number(rating),
                    comment: comment.trim() || undefined,
                  });
                }}
                className="mt-6 space-y-4"
              >
                <div>
                  <select
                    aria-label="Rating"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#151922] px-3 text-xs"
                  >
                    {[5, 4, 3, 2, 1].map((val) => (
                      <option key={val} value={val}>
                        {val} / 5 Stars
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Textarea
                    aria-label="Feedback comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Optional comment"
                    className="rounded-xl text-xs"
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={feedback.isPending}
                  className="rounded-full bg-[#0a0a0a] dark:bg-white text-white dark:text-black px-6 py-2.5 text-xs font-bold transition hover:bg-[#27272a] shadow-xs"
                >
                  {feedback.isPending ? "Sending…" : "Send feedback"}
                </Button>
              </form>
            </div>
          ) : data.feedback ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#16a34a] mb-1">
                Your experience
              </p>
              <h2 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white">
                Feedback received
              </h2>
              <p className="mt-3 text-xs text-[#71717a] dark:text-[#a1a1aa] leading-relaxed">
                Thank you for rating this case {data.feedback.rating}/5. Your response has been recorded.
              </p>
              {data.feedback.comment ? (
                <p className="mt-3 text-xs italic text-[#52525b] dark:text-[#a1a1aa] leading-relaxed">
                  "{data.feedback.comment}"
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Internal Staff Sign-in Callout with exact string "Protected service workspace" */}
          <div className="pt-6 mt-6 border-t border-[#f0f2f5] dark:border-[#20242f]">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
            <p className="micro-label mt-3">Protected service workspace</p>
            <h3 className="font-editorial text-xl font-bold text-[#0a0a0a] dark:text-white mt-1">
              Updates are handled by staff
            </h3>
            <p className="mt-1.5 text-xs text-[#71717a] dark:text-[#a1a1aa] leading-relaxed">
              This public tracker is intentionally read-only. Authorized officers and administrators record progress, assignments, and status changes in the internal workspace.
            </p>
            <div className="mt-4">
              <Link
                href="/staff/login"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f4f6] dark:bg-[#181d26] px-4 py-2 text-xs font-bold text-[#0a0a0a] dark:text-white hover:bg-[#e4e4e7] transition"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Staff sign in</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
