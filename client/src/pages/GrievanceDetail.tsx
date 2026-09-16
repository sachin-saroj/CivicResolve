import { useAuth } from "@/_core/hooks/useAuth";
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
import { MutationAlert } from "@/components/MutationAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { createStaffMutationPlan } from "@/lib/detailWorkflow";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  MessageSquareText,
  Send,
  UserRound,
} from "lucide-react";
import React, { FormEvent, useState } from "react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";

const journey = ["submitted", "acknowledged", "assigned", "in_progress", "resolved", "closed"];

function routeReference() {
  const [, citizen] = useRoute("/grievances/:id");
  const [, officer] = useRoute("/officer/cases/:trackingNumber");
  return {
    citizenId: Number(citizen?.id || 0),
    trackingNumber: officer?.trackingNumber?.toUpperCase() || "",
  };
}

export default function GrievanceDetail() {
  const { user } = useAuth();
  const route = routeReference();
  const id = route.citizenId;
  const utils = trpc.useUtils();

  const detailByTracking = trpc.grievances.detailByTracking.useQuery(
    { trackingNumber: route.trackingNumber },
    { enabled: Boolean(route.trackingNumber && user) }
  );
  const detail = trpc.grievances.detail.useQuery(
    { grievanceId: id },
    { enabled: Boolean(id && user) }
  );
  const activeDetail = route.trackingNumber ? detailByTracking : detail;
  const mutationPlan = createStaffMutationPlan(utils, activeDetail.data, id, route.trackingNumber);
  const resolvedId = mutationPlan.grievanceId;
  const refreshDetail = mutationPlan.onSuccess;

  const [remarks, setRemarks] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [resolution, setResolution] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState("5");
  const [reopenReason, setReopenReason] = useState("");

  const progress = trpc.officer.addProgress.useMutation({
    onSuccess: () => {
      refreshDetail();
      setRemarks("");
      setActionTaken("");
      toast.success("Operational progress recorded.");
    },
  });

  const update = trpc.officer.updateCase.useMutation({
    onSuccess: () => {
      refreshDetail();
      setRemarks("");
      setActionTaken("");
      setResolution("");
      toast.success("Grievance status updated.");
    },
  });

  const reopen = trpc.citizen.reopen.useMutation({
    onSuccess: () => {
      refreshDetail();
      setReopenReason("");
      toast.success("Reopen request submitted.");
    },
  });

  const feedback = trpc.citizen.feedback.useMutation({
    onSuccess: () => {
      refreshDetail();
      setFeedbackText("");
      toast.success("Thank you for your feedback.");
    },
  });

  const data: any = activeDetail.data;
  const isOfficer = user?.role === "officer" || user?.role === "admin";
  const back = "/manage";
  const canUpdate =
    isOfficer &&
    (user?.role === "admin" ||
      (Boolean(data?.grievance?.assignedOfficerId) &&
        data.grievance.assignedOfficerId === user?.id));

  const sendProgress = (event: FormEvent) => {
    event.preventDefault();
    progress.mutate({
      grievanceId: resolvedId,
      remarks: remarks.trim() || undefined,
      actionTaken: actionTaken.trim() || undefined,
    });
  };

  const transition = (event: FormEvent) => {
    event.preventDefault();
    if (!nextStatus) return;
    update.mutate({
      grievanceId: resolvedId,
      nextStatus: nextStatus as any,
      priority: priority ? (priority as any) : undefined,
      remarks: remarks.trim() || undefined,
      actionTaken: actionTaken.trim() || undefined,
      resolutionDetails: resolution.trim() || undefined,
    });
  };

  if (activeDetail.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-40 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-40 animate-pulse rounded-3xl bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-80 animate-pulse rounded-3xl bg-neutral-100 dark:bg-neutral-800" />
      </div>
    );
  }

  if (activeDetail.error || !data) {
    return (
      <EmptyNotice title="Docket Unavailable">
        {activeDetail.error?.message ||
          "This grievance record is either not assigned to your service unit or has been archived."}
      </EmptyNotice>
    );
  }

  const currentIndex = journey.indexOf(data.grievance.status);
  const nextOptions: Record<string, string[]> = {
    submitted: ["acknowledged"],
    acknowledged: ["assigned"],
    assigned: ["in_progress"],
    in_progress: ["resolved", "escalated"],
    escalated: ["in_progress"],
    resolved: ["closed"],
    reopened: ["in_progress"],
    closed: [],
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 font-sans">
      {/* Return Link */}
      <Link
        href={back}
        className="inline-flex items-center gap-2 rounded-full border border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#12151b] px-4 py-2 text-xs font-bold text-[#52525b] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-white transition shadow-2xs"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Return to Operational Queue</span>
      </Link>

      {/* Main Dossier Card */}
      <div className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] overflow-hidden shadow-xs">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-6 sm:p-8 bg-blue-50/40 dark:bg-blue-950/20 border-b border-[#f0f2f5] dark:border-[#20242f]">
          <CaseTitle
            trackingNumber={data.grievance.trackingNumber}
            title={data.grievance.title}
            location={data.grievance.location}
          />
          <div className="flex items-center gap-3 shrink-0">
            <PriorityDot priority={data.grievance.priority} />
            <StatusBadge status={data.grievance.status} />
          </div>
        </div>

        {/* Dossier Body */}
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
              Citizen Filing Narrative
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#0a0a0a] dark:text-[#f4f4f5]">
              {data.grievance.description}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 pt-6 border-t border-[#f0f2f5] dark:border-[#20242f]">
              <DetailLine icon={<UserRound className="h-4 w-4 text-[#2563eb]" />} label="Filing Citizen">
                <span className="font-semibold text-[#0a0a0a] dark:text-white block">
                  {data.citizen.name || "Citizen"}
                </span>
                <span className="text-xs text-[#71717a] dark:text-[#a1a1aa]">
                  {data.grievance.contactEmail || data.citizen.email || "No email on record"}
                </span>
              </DetailLine>

              <DetailLine icon={<Clock3 className="h-4 w-4 text-[#2563eb]" />} label="Logged At">
                <span className="font-semibold text-[#0a0a0a] dark:text-white">
                  {new Date(data.grievance.createdAt).toLocaleString()}
                </span>
              </DetailLine>

              <DetailLine icon={<Clock3 className="h-4 w-4 text-[#ea580c]" />} label="Statutory SLA Target">
                <span
                  className={
                    data.grievance.dueAt &&
                    new Date(data.grievance.dueAt) < new Date() &&
                    !["resolved", "closed"].includes(data.grievance.status)
                      ? "font-bold text-rose-600 dark:text-rose-400"
                      : "font-semibold text-[#0a0a0a] dark:text-white"
                  }
                >
                  {data.grievance.dueAt ? new Date(data.grievance.dueAt).toLocaleString() : "Not designated"}
                  {data.grievance.escalatedAt ? (
                    <span className="block text-xs font-bold text-rose-600 dark:text-rose-400">
                      Auto-Escalated {new Date(data.grievance.escalatedAt).toLocaleString()}
                    </span>
                  ) : null}
                </span>
              </DetailLine>

              <DetailLine icon={<MessageSquareText className="h-4 w-4 text-[#0d9488]" />} label="Assigned Branch">
                <span className="font-semibold text-[#0a0a0a] dark:text-white">
                  {data.department.name}
                  <span className="text-[#71717a] dark:text-[#a1a1aa]"> • {data.category.name}</span>
                </span>
              </DetailLine>
            </div>

            {/* Resolution Details */}
            {data.grievance.resolutionDetails ? (
              <div className="mt-8 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Official Redress Resolution
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-emerald-950 dark:text-emerald-100">
                  {data.grievance.resolutionDetails}
                </p>
              </div>
            ) : null}

            {/* Attachments */}
            {data.attachments?.length ? (
              <div className="mt-8 pt-6 border-t border-[#f0f2f5] dark:border-[#20242f]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                  Verification Proof Documents
                </p>
                <div className="mt-3 grid gap-2">
                  {data.attachments.map((attachment: any) => (
                    <a
                      key={attachment.id}
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-[#e4e4e7] dark:border-[#20242f] p-3.5 text-xs font-semibold text-[#0a0a0a] dark:text-white transition hover:bg-[#fafcfe] dark:hover:bg-[#181d26]"
                    >
                      <FileText className="h-4 w-4 text-[#2563eb]" />
                      <span>{attachment.fileName}</span>
                      <span className="ml-auto text-[#71717a] dark:text-[#a1a1aa]">
                        {Math.ceil(attachment.fileSize / 1024)} KB
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Workflow Position Sidebar */}
          <aside className="rounded-2xl bg-[#fafcfe] dark:bg-[#181d26]/60 border border-[#e4e4e7] dark:border-[#20242f] p-5 h-fit">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] mb-4">
              Service Stage Journey
            </p>
            <div className="space-y-1">
              {journey.map((stage, index) => (
                <WorkflowStep
                  key={stage}
                  label={pretty(stage)}
                  state={
                    index < currentIndex
                      ? "complete"
                      : index === currentIndex
                      ? "current"
                      : "future"
                  }
                  timestamp={
                    index === currentIndex ? `Current: ${pretty(data.grievance.status)}` : undefined
                  }
                />
              ))}
            </div>
          </aside>
        </div>
      </div>

      {/* Activity Timeline & Officer Operations */}
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Timeline */}
        <section className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 sm:p-8 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
            Chronological Audit Log
          </p>
          <h2 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white mt-1">
            Docket History
          </h2>

          <div className="mt-6 space-y-5">
            {data.history.map((entry: any) => (
              <div
                key={entry.history.id}
                className="relative border-l-2 border-[#2563eb]/40 dark:border-[#2563eb]/60 pl-4 py-1"
              >
                <span className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-[#2563eb]" />
                <p className="text-xs font-bold text-[#0a0a0a] dark:text-white">
                  {pretty(entry.history.activityType)} • {pretty(entry.history.newStatus)}
                </p>
                <p className="text-[11px] text-[#71717a] dark:text-[#a1a1aa] mt-0.5">
                  {entry.actor.name || "Service Officer"} • {new Date(entry.history.createdAt).toLocaleString()}
                </p>
                {entry.history.remarks ? (
                  <p className="mt-2 text-xs leading-relaxed text-[#52525b] dark:text-[#a1a1aa]">
                    {entry.history.remarks}
                  </p>
                ) : null}
                {entry.history.actionTaken ? (
                  <p className="mt-1 text-xs font-medium text-[#0a0a0a] dark:text-white">
                    Action: {entry.history.actionTaken}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* Officer Actions or Citizen Feedback */}
        <section className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 sm:p-8 shadow-xs">
          {canUpdate ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb] dark:text-[#60a5fa]">
                Authorized Officer Control
              </p>
              <h2 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white mt-1">
                Advance Grievance Workflow
              </h2>

              <MutationAlert message={progress.error?.message || update.error?.message} />

              <form onSubmit={sendProgress} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="remarks" className="text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa] block mb-1.5">
                    Progress note
                  </Label>
                  <Textarea
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="rounded-xl border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] px-3.5 py-2.5 text-sm min-h-24"
                    placeholder="Document your findings, resident contact, or inspection notes..."
                  />
                </div>

                <div>
                  <Label htmlFor="action" className="text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa] block mb-1.5">
                    Action taken
                  </Label>
                  <Input
                    id="action"
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    className="rounded-xl border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] px-3.5 py-2.5 text-sm"
                    placeholder="Inspection scheduled, contractor dispatched, valve replaced…"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={progress.isPending || (!remarks.trim() && !actionTaken.trim())}
                  className="rounded-full bg-[#0a0a0a] text-white dark:bg-white dark:text-black hover:bg-[#27272a] dark:hover:bg-neutral-200 text-xs font-bold px-5 py-2.5"
                >
                  {progress.isPending ? "Recording…" : "Post Progress Update"}
                </Button>
              </form>

              <form onSubmit={transition} className="mt-8 border-t border-[#f0f2f5] dark:border-[#20242f] pt-6 space-y-4">
                <Label htmlFor="status" className="text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa] block">
                  Update workflow status
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    id="status"
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                    className="rounded-xl border border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] px-3.5 py-2.5 text-sm text-[#0a0a0a] dark:text-white outline-none"
                  >
                    <option value="">Transition to status…</option>
                    {(nextOptions[data.grievance.status] || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {pretty(opt)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="rounded-xl border border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] px-3.5 py-2.5 text-sm text-[#0a0a0a] dark:text-white outline-none"
                  >
                    <option value="">Preserve priority</option>
                    {["low", "medium", "high", "critical"].map((opt) => (
                      <option key={opt} value={opt}>
                        {pretty(opt)}
                      </option>
                    ))}
                  </select>
                </div>

                {nextStatus === "resolved" ? (
                  <Textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="rounded-xl border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] px-3.5 py-2.5 text-sm min-h-20"
                    placeholder="Provide clear details describing the resolution provided to the citizen..."
                  />
                ) : null}

                <Button
                  type="submit"
                  disabled={
                    update.isPending ||
                    !nextStatus ||
                    (nextStatus === "resolved" && !resolution.trim())
                  }
                  className="rounded-full bg-[#2563eb] text-white hover:bg-[#1d4ed8] text-xs font-bold px-6 py-2.5"
                >
                  {update.isPending ? "Updating Stage…" : "Commit Workflow Transition"}
                  <Send className="ml-2 h-3.5 w-3.5" />
                </Button>
              </form>
            </>
          ) : user?.role === "user" ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                Resident Audit
              </p>
              <h2 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white mt-1">
                Citizen Next Steps
              </h2>

              {data.grievance.status === "resolved" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    reopen.mutate({ grievanceId: resolvedId, remarks: reopenReason });
                  }}
                  className="mt-5 space-y-3"
                >
                  <Label htmlFor="reopen" className="text-xs font-semibold">
                    Request a reopen
                  </Label>
                  <Textarea
                    id="reopen"
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    placeholder="Explain why the resolution needs further operational attention..."
                    className="rounded-xl border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] text-sm"
                  />
                  <Button
                    disabled={reopen.isPending || reopenReason.trim().length < 8}
                    className="rounded-full bg-[#0a0a0a] text-white dark:bg-white dark:text-black text-xs font-bold px-5 py-2"
                  >
                    Submit Reopen Request
                  </Button>
                </form>
              ) : (
                <p className="mt-4 text-xs leading-relaxed text-[#71717a] dark:text-[#a1a1aa]">
                  The responsible departmental officer will update this case trajectory as field milestones are reached.
                </p>
              )}

              {["resolved", "closed"].includes(data.grievance.status) && !data.feedback ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    feedback.mutate({
                      grievanceId: resolvedId,
                      rating: Number(rating),
                      comment: feedbackText.trim() || undefined,
                    });
                  }}
                  className="mt-6 pt-6 border-t border-[#f0f2f5] dark:border-[#20242f] space-y-3"
                >
                  <p className="text-xs font-bold text-[#0a0a0a] dark:text-white">
                    How was your resolution experience?
                  </p>
                  <div className="flex items-center gap-3">
                    <select
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                      className="rounded-xl border border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] px-3 py-2 text-xs font-bold"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} Stars
                        </option>
                      ))}
                    </select>
                    <Button
                      type="submit"
                      disabled={feedback.isPending}
                      className="rounded-full bg-[#0a0a0a] text-white dark:bg-white dark:text-black text-xs font-bold px-4 py-2"
                    >
                      Post Feedback
                    </Button>
                  </div>
                  <Textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Optional feedback comments..."
                    className="rounded-xl border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] text-xs"
                  />
                </form>
              ) : null}

              {data.feedback ? (
                <div className="mt-6 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-4 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="mr-2 inline h-4 w-4" />
                  Feedback received: {data.feedback.rating}/5 stars
                </div>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                Case Permissions
              </p>
              <h2 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white mt-1">
                Read-Only Supervisory View
              </h2>
              <p className="mt-4 text-xs leading-relaxed text-[#71717a] dark:text-[#a1a1aa]">
                This case docket is assigned to an officer in another service department. Only the designated officer or a system administrator may post operational updates.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

