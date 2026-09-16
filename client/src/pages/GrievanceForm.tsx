import { EditorialHeading, PageHeader, PillButton } from "@/components/CivicPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAttachmentRecoveryMessage } from "@/lib/publicWorkflow";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  FileUp,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const guideSteps = [
  { step: "01", heading: "Service", helper: "Department & category" },
  { step: "02", heading: "Concern", helper: "Title, details & location" },
  { step: "03", heading: "Documentation", helper: "Optional proof attachment" },
  { step: "04", heading: "Review & File", helper: "Verifiable docket preview" },
];

async function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("Could not read the selected document."));
    reader.readAsDataURL(file);
  });
}

export default function GrievanceForm() {
  const catalog = trpc.public.catalog.useQuery();
  const create = trpc.portal.create.useMutation();
  const upload = trpc.portal.uploadAttachment.useMutation();

  const [departmentId, setDepartmentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState("");
  const [submitted, setSubmitted] = useState<{ trackingNumber: string; attachmentIssue?: string } | null>(null);

  const categories = useMemo(
    () => (catalog.data?.categories || []).filter((category) => category.departmentId === Number(departmentId)),
    [catalog.data, departmentId]
  );

  const isReady = Boolean(
    departmentId && categoryId && title.trim().length >= 8 && description.trim().length >= 20
  );

  const stage = !departmentId || !categoryId ? 1 : title.trim().length < 8 || description.trim().length < 20 ? 2 : 3;

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const candidate = event.target.files?.[0] || null;
    if (candidate && candidate.size > 2 * 1024 * 1024) {
      setFile(null);
      setValidation("Attachments must be 2 MB or smaller.");
      return;
    }
    if (
      candidate &&
      !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(candidate.type)
    ) {
      setFile(null);
      setValidation("Please use a PDF, JPG, PNG, or WEBP file.");
      return;
    }
    setFile(candidate);
    setValidation("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setValidation("");
    if (!isReady) {
      setValidation("Please complete the department, category, title, and detailed description before sending.");
      return;
    }
    try {
      const created = await create.mutateAsync({
        departmentId: Number(departmentId),
        categoryId: Number(categoryId),
        title: title.trim(),
        description: description.trim(),
        location: location.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
      });

      let attachmentIssue: string | undefined;
      if (file) {
        try {
          await upload.mutateAsync({
            trackingNumber: created.trackingNumber,
            fileName: file.name,
            mimeType: file.type as "application/pdf" | "image/jpeg" | "image/png" | "image/webp",
            fileData: await readAsBase64(file),
          });
        } catch (error: any) {
          attachmentIssue = getAttachmentRecoveryMessage(error);
          toast.warning("Your grievance was registered, but the file attachment failed to upload.");
        }
      }

      setSubmitted({ trackingNumber: created.trackingNumber, attachmentIssue });
      toast.success("Grievance officially registered with tracking code.");
    } catch (error: any) {
      setValidation(error?.message || "Could not submit your grievance. Please review the form and retry.");
    }
  };

  /* SUCCESS SCREEN (Physical Ticket Docket) */
  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 animate-fade-in">
        <div className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
          {/* Top Success Banner */}
          <div className="bg-[#f0fdf4] dark:bg-[#0e2417] border-b border-[#dcfce7] dark:border-[#163824] p-8 sm:p-12 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500 text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <p className="font-script text-3xl sm:text-4xl text-[#16a34a] dark:text-[#4ade80] mt-4 mb-1">
              Recorded with Honour
            </p>
            <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#0a0a0a] dark:text-white tracking-tight">
              Your Case is Now in the Active Workflow
            </h1>
            <p className="mt-3 max-w-md mx-auto text-xs sm:text-sm text-[#52525b] dark:text-[#a1a1aa] leading-relaxed">
              Your grievance has been assigned to the responsible municipal department. Keep this official
              tracking ID to follow inspection milestones and resolution without signing in.
            </p>

            {/* Tactile Ticket Card */}
            <div className="mt-8 mx-auto max-w-sm rounded-2xl bg-white dark:bg-[#181d26] border-2 border-dashed border-[#86efac] dark:border-[#166534] p-5 text-left shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                Official Tracking ID
              </p>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-[#16a34a] dark:text-[#4ade80] tracking-wider mt-1 select-all">
                {submitted.trackingNumber}
              </p>
              <p className="mt-2 text-[11px] text-[#71717a] dark:text-[#a1a1aa]">
                SLA Countdown: <strong>72 Hours statutory target active</strong>
              </p>
            </div>

            {submitted.attachmentIssue ? (
              <p className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300">
                {submitted.attachmentIssue}
              </p>
            ) : null}
          </div>

          {/* Action Footer */}
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={`/cases/${submitted.trackingNumber}`}>
              <button className="w-full sm:w-auto rounded-full bg-[#0a0a0a] dark:bg-white text-white dark:text-black px-6 py-3 text-xs font-bold transition hover:bg-[#27272a] dark:hover:bg-neutral-200">
                Open Full Case Record →
              </button>
            </Link>
            <Link href="/track">
              <button className="w-full sm:w-auto rounded-full border border-[#e4e4e7] dark:border-[#272f3d] bg-white dark:bg-[#15181e] px-6 py-3 text-xs font-semibold text-[#0a0a0a] dark:text-white hover:bg-[#f4f4f6]">
                Track Status Lookup
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* MAIN GUIDED FORM */
  return (
    <div className="mx-auto max-w-4xl py-6 space-y-10">
      {/* Page Header */}
      <div>
        <p className="font-script text-3xl sm:text-4xl text-[#2563eb] dark:text-[#60a5fa] mb-1">
          Open Public Redress
        </p>
        <h1 className="font-editorial text-4xl sm:text-5xl font-semibold text-[#0a0a0a] dark:text-white tracking-tight">
          Tell us what needs attention.
        </h1>
        <p className="mt-2 text-sm text-[#52525b] dark:text-[#a1a1aa] leading-relaxed max-w-2xl">
          Three short steps route your concern directly to the assigned departmental inspector.
          No citizen sign-in or password is required.
        </p>
      </div>

      {/* Guide Steps Indicator */}
      <div className="grid gap-3 sm:grid-cols-3">
        {guideSteps.map((step, idx) => {
          const stepNum = idx + 1;
          const isCurrent = stage === stepNum;
          const isPast = stage > stepNum;

          return (
            <div
              key={step.step}
              className={`rounded-2xl border p-4 transition-all ${
                isCurrent
                  ? "bg-[#eff6ff] dark:bg-[#14233c] border-[#2563eb] shadow-xs"
                  : isPast
                    ? "bg-[#f0fdf4] dark:bg-[#102419] border-[#86efac] dark:border-[#1b4329]"
                    : "bg-white dark:bg-[#12151b] border-[#e4e4e7] dark:border-[#20242f] opacity-75"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                    isPast
                      ? "bg-[#16a34a] text-white"
                      : isCurrent
                        ? "bg-[#2563eb] text-white"
                        : "bg-[#f4f4f6] dark:bg-[#20242f] text-[#71717a]"
                  }`}
                >
                  {isPast ? <Check className="h-3.5 w-3.5" /> : step.step}
                </span>
                <div>
                  <p className="text-xs font-bold text-[#0a0a0a] dark:text-white">{step.heading}</p>
                  <p className="text-[11px] text-[#71717a] dark:text-[#a1a1aa]">{step.helper}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {catalog.isLoading ? (
        <div className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#2563eb]" />
          <p className="mt-3 font-editorial text-lg text-[#0a0a0a] dark:text-white">
            Loading active municipal catalog…
          </p>
        </div>
      ) : catalog.error ? (
        <div className="rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-rose-800 dark:text-rose-300">
              Could not load service departments.
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
              Please check your connection and retry.
            </p>
          </div>
          <button
            type="button"
            onClick={() => catalog.refetch()}
            className="rounded-full bg-white px-4 py-2 text-xs font-bold text-rose-700 shadow-xs"
          >
            Retry
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] overflow-hidden shadow-[0_4px_24px_-2px_rgba(0,0,0,0.03)]">
          <div className="p-6 sm:p-10 space-y-10">
            {/* SECTION 1: ROUTING */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-[#f0f2f5] dark:border-[#20242f]">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#eff6ff] dark:bg-[#192742] text-xs font-bold text-[#2563eb]">
                  01
                </span>
                <div>
                  <h3 className="font-editorial text-xl font-bold text-[#0a0a0a] dark:text-white">
                    Service Routing
                  </h3>
                  <p className="text-xs text-[#71717a] dark:text-[#a1a1aa]">
                    Select the municipal team best positioned to inspect and rectify the issue.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 pt-2">
                <div>
                  <Label htmlFor="department" className="text-xs font-bold uppercase tracking-wider text-[#3f3f46] dark:text-[#d4d4d8]">
                    Responsible Department <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="department"
                    value={departmentId}
                    onChange={(e) => {
                      setDepartmentId(e.target.value);
                      setCategoryId("");
                    }}
                    className="mt-2 h-12 w-full rounded-2xl border border-[#e4e4e7] dark:border-[#20242f] bg-[#fafcfe] dark:bg-[#151922] px-4 text-xs sm:text-sm text-[#0a0a0a] dark:text-white outline-none focus:border-[#2563eb]"
                  >
                    <option value="">Select a department…</option>
                    {catalog.data?.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.slaHours}h Target SLA)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-[#3f3f46] dark:text-[#d4d4d8]">
                    Issue Category <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    disabled={!departmentId}
                    className="mt-2 h-12 w-full rounded-2xl border border-[#e4e4e7] dark:border-[#20242f] bg-[#fafcfe] dark:bg-[#151922] px-4 text-xs sm:text-sm text-[#0a0a0a] dark:text-white outline-none focus:border-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {departmentId ? "Select specific category…" : "Select a department first"}
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* SECTION 2: THE ISSUE */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-[#f0f2f5] dark:border-[#20242f]">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#eff6ff] dark:bg-[#192742] text-xs font-bold text-[#2563eb]">
                  02
                </span>
                <div>
                  <h3 className="font-editorial text-xl font-bold text-[#0a0a0a] dark:text-white">
                    Issue Particulars
                  </h3>
                  <p className="text-xs text-[#71717a] dark:text-[#a1a1aa]">
                    Provide concise, actionable details for field officers.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="grievance-title" className="text-xs font-bold uppercase tracking-wider text-[#3f3f46] dark:text-[#d4d4d8]">
                    Subject / Title <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="grievance-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Short, descriptive summary (e.g. Broken drainage cover near bus stop)"
                    maxLength={180}
                    className="mt-2 h-12 rounded-2xl border-[#e4e4e7] dark:border-[#20242f] bg-[#fafcfe] dark:bg-[#151922] text-xs sm:text-sm"
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-[#71717a]">
                    <span>{title.trim().length < 8 ? "8 characters minimum" : "✓ Sufficient title length"}</span>
                    <span>{title.length}/180</span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="location" className="text-xs font-bold uppercase tracking-wider text-[#3f3f46] dark:text-[#d4d4d8]">
                      Precise Location / Landmark
                    </Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Street, building name, landmark, or intersection"
                      maxLength={240}
                      className="mt-2 h-12 rounded-2xl border-[#e4e4e7] dark:border-[#20242f] bg-[#fafcfe] dark:bg-[#151922] text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact-email" className="text-xs font-bold uppercase tracking-wider text-[#3f3f46] dark:text-[#d4d4d8]">
                      Email for Status Logs <span className="font-normal text-[#a1a1aa]">(Optional)</span>
                    </Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="citizen@example.org"
                      maxLength={320}
                      className="mt-2 h-12 rounded-2xl border-[#e4e4e7] dark:border-[#20242f] bg-[#fafcfe] dark:bg-[#151922] text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-[#3f3f46] dark:text-[#d4d4d8]">
                    Detailed Description <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what occurred, when it started, and specific context that will enable the service team to inspect immediately…"
                    maxLength={5000}
                    className="mt-2 min-h-36 rounded-2xl border-[#e4e4e7] dark:border-[#20242f] bg-[#fafcfe] dark:bg-[#151922] text-xs sm:text-sm leading-relaxed p-4"
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px] text-[#71717a]">
                    <span>
                      {description.trim().length < 20
                        ? `${description.trim().length}/20 characters minimum required`
                        : "✓ Description length acceptable"}
                    </span>
                    <span>{description.length}/5000</span>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 3: EVIDENCE ATTACHMENT */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-[#f0f2f5] dark:border-[#20242f]">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#eff6ff] dark:bg-[#192742] text-xs font-bold text-[#2563eb]">
                  03
                </span>
                <div>
                  <h3 className="font-editorial text-xl font-bold text-[#0a0a0a] dark:text-white">
                    Optional Verification Evidence
                  </h3>
                  <p className="text-xs text-[#71717a] dark:text-[#a1a1aa]">
                    Attach a site photograph, invoice, or supporting document to accelerate resolution.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <div
                  className={`rounded-2xl border-2 border-dashed p-6 transition-all ${
                    file
                      ? "border-[#2563eb] bg-[#eff6ff]/40 dark:bg-[#14233c]/40"
                      : "border-[#d4d4d8] dark:border-[#27272a] bg-[#fafcfe] dark:bg-[#151922]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white dark:bg-[#1f242e] border border-[#e4e4e7] dark:border-[#2f3645] text-[#2563eb] shadow-2xs">
                        <FileUp className="h-6 w-6" />
                      </span>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-[#0a0a0a] dark:text-white">
                          {file ? file.name : "Upload supporting photograph or PDF"}
                        </p>
                        <p className="text-[11px] text-[#71717a] dark:text-[#a1a1aa]">
                          {file
                            ? `${Math.ceil(file.size / 1024)} KB ready to send`
                            : "JPG, PNG, WEBP, or PDF up to 2MB maximum"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {file ? (
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          className="rounded-full px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center gap-1"
                        >
                          <X className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      ) : null}
                      <label className="cursor-pointer rounded-full bg-[#0a0a0a] dark:bg-white text-white dark:text-black px-4 py-2 text-xs font-bold transition hover:bg-[#27272a] dark:hover:bg-neutral-200 shadow-2xs">
                        <span>Browse File</span>
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          onChange={selectFile}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 4: REVIEW & DOCKET PREVIEW */}
            <section className="space-y-4 pt-4 border-t border-[#f0f2f5] dark:border-[#20242f]">
              <div className="flex items-center gap-3 pb-3 border-b border-[#f0f2f5] dark:border-[#20242f]">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#eff6ff] dark:bg-[#192742] text-xs font-bold text-[#2563eb]">
                  04
                </span>
                <div>
                  <h3 className="font-editorial text-xl font-bold text-[#0a0a0a] dark:text-white">
                    Review & Verification Preview
                  </h3>
                  <p className="text-xs text-[#71717a] dark:text-[#a1a1aa]">
                    Preview of the official civic docket record that will be issued upon registration.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#fafcfe] dark:bg-[#151922] border border-[#e4e4e7] dark:border-[#20242f] p-5">
                <div className="flex items-center justify-between border-b border-[#eceef1] dark:border-[#20242f] pb-3 mb-3">
                  <span className="font-mono text-xs font-bold text-[#2563eb]">
                    DRAFT REGISTRATION • GRV-2026-XXXXX
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    {isReady ? "Ready to Lodge" : "Incomplete Details"}
                  </span>
                </div>
                <p className="font-editorial text-lg sm:text-xl font-bold text-[#0a0a0a] dark:text-white">
                  {title.trim() || "Pending grievance summary..."}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#71717a] dark:text-[#a1a1aa]">
                  <span>
                    Dept:{" "}
                    <strong className="text-[#0a0a0a] dark:text-white">
                      {catalog.data?.departments.find((d) => d.id === Number(departmentId))?.name || "Unselected"}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Category:{" "}
                    <strong className="text-[#0a0a0a] dark:text-white">
                      {categories.find((c) => c.id === Number(categoryId))?.name || "Unselected"}
                    </strong>
                  </span>
                  {location ? (
                    <>
                      <span>•</span>
                      <span>Location: {location}</span>
                    </>
                  ) : null}
                  {file ? (
                    <>
                      <span>•</span>
                      <span className="text-[#2563eb]">Attachment: {file.name}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </section>
          </div>

          {/* Validation Banner */}
          {validation ? (
            <div className="mx-6 sm:mx-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validation}</span>
            </div>
          ) : null}

          {/* Submission Action Bar */}
          <div className="bg-[#f8fafc] dark:bg-[#10131a] border-t border-[#e8eaed] dark:border-[#20242f] p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Grievance records are cryptographically timestamped and bound to strict public SLAs.</span>
            </p>

            <button
              type="submit"
              disabled={!isReady || create.isPending || upload.isPending}
              className={`rounded-full px-8 py-3.5 text-xs sm:text-sm font-bold transition shadow-xs inline-flex items-center gap-2 ${
                isReady && !create.isPending && !upload.isPending
                  ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                  : "bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600 cursor-not-allowed"
              }`}
            >
              {create.isPending || upload.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Registering Docket…</span>
                </>
              ) : (
                <>
                  <span>Send Grievance Now</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
