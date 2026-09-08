import { PageHeader } from "@/components/CivicPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { getAttachmentRecoveryMessage } from "@/lib/publicWorkflow";
import { Check, CheckCircle2, FileUp, Info, Loader2, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const guideSteps = [
  { number: 1, heading: "Choose service", helper: "Where should it go?" },
  { number: 2, heading: "Describe the issue", helper: "What happened and where?" },
  { number: 3, heading: "Add proof", helper: "Optional supporting document" },
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
  const categories = useMemo(() => (catalog.data?.categories || []).filter(category => category.departmentId === Number(departmentId)), [catalog.data, departmentId]);
  const isReady = Boolean(departmentId && categoryId && title.trim().length >= 8 && description.trim().length >= 20);
  const stage = !departmentId || !categoryId ? 1 : title.trim().length < 8 || description.trim().length < 20 ? 2 : 3;

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const candidate = event.target.files?.[0] || null;
    if (candidate && candidate.size > 2 * 1024 * 1024) { setFile(null); setValidation("Attachments must be 2 MB or smaller."); return; }
    if (candidate && !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(candidate.type)) { setFile(null); setValidation("Use a PDF, JPG, PNG, or WEBP file."); return; }
    setFile(candidate);
    setValidation("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setValidation("");
    if (!isReady) { setValidation("Complete the service area, category, title, and issue description before submitting."); return; }
    try {
      const created = await create.mutateAsync({ departmentId: Number(departmentId), categoryId: Number(categoryId), title: title.trim(), description: description.trim(), location: location.trim() || undefined, contactEmail: contactEmail.trim() || undefined });
      let attachmentIssue: string | undefined;
      if (file) {
        try {
          await upload.mutateAsync({ trackingNumber: created.trackingNumber, fileName: file.name, mimeType: file.type as "application/pdf" | "image/jpeg" | "image/png" | "image/webp", fileData: await readAsBase64(file) });
        } catch (error: any) {
          attachmentIssue = getAttachmentRecoveryMessage(error);
          toast.warning("Your grievance was saved, but the document did not upload.");
        }
      }
      setSubmitted({ trackingNumber: created.trackingNumber, attachmentIssue });
      toast.success("Your grievance has been recorded.");
    } catch (error: any) { setValidation(error?.message || "We could not submit your grievance. Please review the form and try again."); }
  };

  if (submitted) return <div className="mx-auto max-w-2xl py-8 reveal"><div className="surface workflow-success overflow-hidden"><div className="bg-[#eaf1d8] p-8 text-center sm:p-12"><span className="success-orbit mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-[#3f6c52]"><CheckCircle2 className="h-7 w-7" /></span><p className="micro-label mt-6">Submission complete</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.06em]">Your case is now in the process.</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">Keep this tracking ID. It is your no-login key to follow the case and view its full activity record.</p><div className="tracking-ticket mx-auto mt-7 rounded-2xl bg-white px-5 py-4 text-left sm:max-w-sm"><p className="micro-label">Your tracking ID</p><p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{submitted.trackingNumber}</p></div>{submitted.attachmentIssue ? <p role="alert" className="mx-auto mt-5 max-w-md rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">{submitted.attachmentIssue}</p> : null}</div><div className="flex flex-col gap-3 p-6 sm:flex-row sm:justify-center"><Link href={`/cases/${submitted.trackingNumber}`}><Button className="w-full rounded-xl bg-[#121413] text-white hover:bg-[#303431] sm:w-auto">Open case record</Button></Link><Link href="/manage"><Button variant="outline" className="w-full rounded-xl bg-white sm:w-auto">View case manager</Button></Link></div></div></div>;

  return <div className="mx-auto max-w-4xl space-y-7"><PageHeader eyebrow="Open public service" title="Tell us what needs attention" description="Three short steps help route your concern to the right service area. No account is needed." /><div className="workflow-steps surface reveal grid gap-px overflow-hidden bg-slate-100 sm:grid-cols-3">{guideSteps.map(step => <div key={step.number} className={`workflow-step bg-white p-4 ${stage === step.number ? "is-current" : stage > step.number ? "is-complete" : ""}`}><span className="step-number">{stage > step.number ? <Check className="h-3.5 w-3.5" /> : step.number}</span><div><p className="text-sm font-semibold">{step.heading}</p><p className="mt-0.5 text-xs text-slate-400">{step.helper}</p></div></div>)}</div>{catalog.isLoading ? <div className="surface p-8"><div className="flex items-center gap-3 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin text-[#5f92ba]" />Preparing service categories…</div></div> : catalog.error ? <div role="alert" className="surface flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Service categories could not be loaded.</p><p className="mt-1 text-xs text-slate-500">Please retry before completing your submission.</p></div><Button type="button" variant="outline" onClick={() => catalog.refetch()} className="rounded-xl bg-white"><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></div> : <form onSubmit={submit} className="surface workflow-form reveal overflow-hidden"><div className="grid gap-7 p-6 sm:p-8"><section className="form-section"><div className="section-heading"><span>1</span><div><p className="micro-label">Routing</p><p className="text-sm font-semibold">Choose the service area</p></div></div><div className="mt-5 grid gap-6 sm:grid-cols-2"><div><Label htmlFor="department" className="text-sm font-semibold">Responsible service area <span className="text-rose-500">*</span></Label><select id="department" value={departmentId} onChange={event => { setDepartmentId(event.target.value); setCategoryId(""); }} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Choose a department</option>{catalog.data?.departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}</select><p className="mt-2 text-xs text-slate-400">Select the team best placed to help.</p></div><div><Label htmlFor="category" className="text-sm font-semibold">Category <span className="text-rose-500">*</span></Label><select id="category" value={categoryId} onChange={event => setCategoryId(event.target.value)} disabled={!departmentId} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-50"><option value="">{departmentId ? "Choose a category" : "Choose a department first"}</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select><p className="mt-2 text-xs text-slate-400">{departmentId ? `${categories.length} available categories` : "Categories appear after you select a service area."}</p></div></div></section><section className="form-section"><div className="section-heading"><span>2</span><div><p className="micro-label">The issue</p><p className="text-sm font-semibold">Describe what happened</p></div></div><div className="mt-5"><Label htmlFor="grievance-title" className="text-sm font-semibold">What needs attention? <span className="text-rose-500">*</span></Label><Input id="grievance-title" value={title} onChange={event => setTitle(event.target.value)} className="mt-2 h-11" placeholder="A short, specific title" maxLength={180} aria-invalid={Boolean(title && title.trim().length < 8)} /><p className={`mt-2 text-xs ${title && title.trim().length < 8 ? "text-amber-700" : "text-slate-400"}`}>{title.trim().length}/8 characters minimum</p></div><div className="mt-5"><Label htmlFor="location" className="text-sm font-semibold">Where did this occur?</Label><Input id="location" value={location} onChange={event => setLocation(event.target.value)} className="mt-2 h-11" placeholder="Address, building, landmark, or online service" maxLength={240} /></div><div className="mt-5"><Label htmlFor="contact-email" className="text-sm font-semibold">Email for updates <span className="text-xs font-normal text-slate-400">(optional)</span></Label><Input id="contact-email" type="email" value={contactEmail} onChange={event => setContactEmail(event.target.value)} className="mt-2 h-11" placeholder="you@example.org" maxLength={320} /><p className="mt-2 text-xs text-slate-400">We will only use this to log service-update notification attempts.</p></div><div className="mt-5"><Label htmlFor="description" className="text-sm font-semibold">Describe the issue <span className="text-rose-500">*</span></Label><Textarea id="description" value={description} onChange={event => setDescription(event.target.value)} className="mt-2 min-h-40 resize-y" placeholder="Include what happened, when you noticed it, and details that will help the service team act." maxLength={5000} aria-invalid={Boolean(description && description.trim().length < 20)} /><div className="mt-2 flex items-center justify-between text-xs"><span className={description && description.trim().length < 20 ? "text-amber-700" : "text-slate-400"}>{Math.min(description.trim().length, 20)}/20 characters minimum</span><span className="text-slate-400">{description.length}/5000</span></div><div className="character-meter mt-2"><span style={{ width: `${Math.min(100, description.length / 20 * 100)}%` }} /></div></div></section><section className="form-section"><div className="section-heading"><span>3</span><div><p className="micro-label">Optional evidence</p><p className="text-sm font-semibold">Add a supporting document</p></div></div><div className={`file-drop mt-5 ${file ? "has-file" : ""}`}><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#dfeffc] text-[#245d8d]"><FileUp className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{file?.name || "Attach optional evidence"}</p><p className="mt-0.5 text-xs text-slate-400">PDF, JPG, PNG, or WEBP up to 2 MB.</p></div></div><div className="flex shrink-0 items-center gap-2">{file ? <Button type="button" variant="ghost" onClick={() => setFile(null)} className="h-9 rounded-lg px-2 text-xs text-slate-500"><X className="mr-1 h-3.5 w-3.5" />Remove</Button> : null}<input id="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={selectFile} className="block max-w-[150px] text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 file:shadow-sm" /></div></div></section></div>{validation ? <div role="alert" className="mx-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-8">{validation}</div> : null}<div className="mt-7 flex flex-col gap-4 border-t border-slate-100 bg-[#fbfcfc] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"><p className="flex max-w-md gap-2 text-xs leading-5 text-slate-500"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[#5f92ba]" />You will receive a unique tracking ID immediately. Please do not include passwords or confidential credentials.</p><Button type="submit" disabled={!isReady || create.isPending || upload.isPending} className="submit-button rounded-xl bg-[#121413] px-6 text-white hover:bg-[#303431]">{create.isPending || upload.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : <><Sparkles className="mr-2 h-4 w-4" />Submit grievance</>}</Button></div></form>}<p className="flex justify-center gap-2 text-center text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5" />Open public service — do not include personal passwords or sensitive credentials.</p></div>;
}
