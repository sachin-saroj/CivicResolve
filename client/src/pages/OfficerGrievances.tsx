import { CaseTitle, EmptyNotice, PageHeader, PriorityDot, StatusBadge } from "@/components/CivicPrimitives";
import { MutationAlert } from "@/components/MutationAlert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { nextSuggestionIndex, previousSuggestionIndex, shouldSelectSuggestion } from "@/lib/caseSearch";
import { hasInvalidDateRange } from "@/lib/publicWorkflow";
import { downloadCasePdf, downloadCsv } from "@/lib/reportExports";
import { Check, ClipboardCheck, Download, FileText, FilterX, ListChecks, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

type SortKey = "updated_desc" | "updated_asc" | "priority_desc" | "priority_asc" | "status_asc";
type BulkAction = "priority" | "status";

const transitionTargets: Record<string, string[]> = {
  assigned: ["in_progress"],
  in_progress: ["resolved", "escalated"],
  escalated: ["in_progress"],
  reopened: ["in_progress"],
};

function titleCase(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()); }

export default function OfficerGrievances() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const session = trpc.auth.me.useQuery();

  useEffect(() => {
    if (!session.isLoading && session.data?.role !== "officer" && session.data?.role !== "admin") setLocation("/staff/login");
  }, [session.isLoading, session.data, setLocation]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("updated_desc");
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction>("priority");
  const [bulkValue, setBulkValue] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dateRangeInvalid = hasInvalidDateRange(dateFrom, dateTo);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 240);
    return () => window.clearTimeout(timer);
  }, [search]);

  const params = useMemo(() => ({
    search: search.trim() || undefined,
    status: status === "all" ? undefined : status as any,
    priority: priority === "all" ? undefined : priority as any,
    categoryId: categoryId === "all" ? undefined : Number(categoryId),
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sort,
    limit: pageSize,
    offset: page * pageSize,
    overdue: overdueOnly || undefined,
  }), [search, status, priority, categoryId, dateFrom, dateTo, overdueOnly, sort, page]);

  useEffect(() => {
    setPage(0);
  }, [search, status, priority, categoryId, dateFrom, dateTo, overdueOnly, sort]);
  const queue = trpc.officer.queue.useQuery(params, { enabled: !dateRangeInvalid && (session.data?.role === "officer" || session.data?.role === "admin") });
  const catalog = trpc.public.catalog.useQuery();
  const suggestions = trpc.officer.suggestions.useQuery({ search: debouncedSearch }, { enabled: debouncedSearch.length >= 2 && (session.data?.role === "officer" || session.data?.role === "admin") });
  const bulkUpdate = trpc.officer.bulkUpdate.useMutation({
    onSuccess: data => {
      toast.success(`${data.updated} ${data.updated === 1 ? "case was" : "cases were"} updated.`);
      setSelectedIds(new Set());
      setBulkValue("");
      void utils.officer.queue.invalidate();
    },
  });

  useEffect(() => {
    const visible = new Set((queue.data || []).map(item => item.grievance.id));
    setSelectedIds(previous => new Set(Array.from(previous).filter(id => visible.has(id))));
  }, [queue.data]);

  const selectedCases = useMemo(() => (queue.data || []).filter(item => selectedIds.has(item.grievance.id)), [queue.data, selectedIds]);
  const selectedCount = selectedCases.length;
  const allSelected = Boolean(queue.data?.length) && selectedCount === queue.data?.length;
  const activeFilterCount = [search.trim(), status !== "all", priority !== "all", categoryId !== "all", dateFrom, dateTo].filter(Boolean).length;
  const bulkActionLabel = bulkAction === "priority" ? `set priority to ${titleCase(bulkValue)}` : `move to ${titleCase(bulkValue)}`;
  const availableStatusTargets = useMemo(() => {
    if (!selectedCases.length) return [];
    return ["in_progress", "escalated", "resolved"].filter(target => selectedCases.every(item => transitionTargets[item.grievance.status]?.includes(target)));
  }, [selectedCases]);

  useEffect(() => {
    if (bulkAction === "status" && bulkValue && !availableStatusTargets.includes(bulkValue)) setBulkValue("");
  }, [bulkAction, bulkValue, availableStatusTargets]);

  const resetFilters = () => { setSearch(""); setDebouncedSearch(""); setStatus("all"); setPriority("all"); setCategoryId("all"); setDateFrom(""); setDateTo(""); setSort("updated_desc"); setSelectedIds(new Set()); };
  const toggleSelected = (id: number) => setSelectedIds(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set((queue.data || []).map(item => item.grievance.id)));
  const submitBulk = () => {
    bulkUpdate.mutate({ grievanceIds: Array.from(selectedIds), action: bulkAction, ...(bulkAction === "priority" ? { priority: bulkValue as any } : { nextStatus: bulkValue as any }) });
  };
  const exportRows = (queue.data || []).map(item => ({
    trackingNumber: item.grievance.trackingNumber,
    title: item.grievance.title,
    department: item.department.name,
    category: item.category.name,
    location: item.grievance.location || "",
    priority: titleCase(item.grievance.priority),
    status: titleCase(item.grievance.status),
    updatedAt: new Date(item.grievance.updatedAt).toLocaleString(),
  }));
  const exportSuffix = activeFilterCount ? "-filtered" : "-all-cases";

  return <div className="space-y-8">
    <PageHeader eyebrow="Open case workspace" title="Case-management queue" description="Find a case in seconds, export the current view, or apply safe, auditable updates without losing sight of individual accountability." />
    <div className="surface reveal overflow-hidden">
      <div className="border-b border-slate-100 p-4">
        <div className="flex flex-wrap items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-[#5f92ba]" /><p className="micro-label">Queue controls</p>{activeFilterCount ? <span className="rounded-full bg-[#e7f1fb] px-2 py-0.5 text-[10px] font-bold text-[#39739e]">{activeFilterCount} active</span> : null}<div className="ml-auto flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="outline" onClick={() => downloadCsv(exportRows, `civicresolve${exportSuffix}.csv`)} disabled={!exportRows.length} className="h-8 rounded-lg bg-white text-xs"><Download className="mr-1.5 h-3.5 w-3.5" />CSV</Button><Button type="button" size="sm" variant="outline" onClick={() => downloadCasePdf(exportRows, `civicresolve${exportSuffix}.pdf`)} disabled={!exportRows.length} className="h-8 rounded-lg bg-white text-xs"><FileText className="mr-1.5 h-3.5 w-3.5" />PDF</Button><Button type="button" size="sm" variant="ghost" onClick={resetFilters} className="h-8 rounded-lg text-xs text-slate-500"><FilterX className="mr-1.5 h-3.5 w-3.5" />Reset filters</Button></div></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1"><label htmlFor="queue-search" className="sr-only">Search cases by tracking ID, title, or location</label><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input id="queue-search" value={search} onChange={event => { setSearch(event.target.value); setSuggestionsOpen(true); setActiveSuggestionIndex(-1); }} onFocus={() => setSuggestionsOpen(true)} onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 140)} onKeyDown={event => { const items = suggestions.data || []; if (!suggestionsOpen || !items.length) return; if (event.key === "ArrowDown") { event.preventDefault(); setActiveSuggestionIndex(current => nextSuggestionIndex(current, items.length)); } else if (event.key === "ArrowUp") { event.preventDefault(); setActiveSuggestionIndex(current => previousSuggestionIndex(current, items.length)); } else if (event.key === "Escape") { event.preventDefault(); setSuggestionsOpen(false); setActiveSuggestionIndex(-1); } else if (shouldSelectSuggestion(event.key, activeSuggestionIndex)) { event.preventDefault(); const chosen = items[activeSuggestionIndex]; if (chosen) { setSearch(chosen.trackingNumber); setSuggestionsOpen(false); setActiveSuggestionIndex(-1); } } }} placeholder="Search ID, title, or location" className="pl-9 pr-8" autoComplete="off" role="combobox" aria-expanded={suggestionsOpen && debouncedSearch.length >= 2 && Boolean(suggestions.data?.length)} aria-controls="case-suggestions" aria-activedescendant={activeSuggestionIndex >= 0 ? `case-suggestion-${activeSuggestionIndex}` : undefined} />{search ? <button type="button" aria-label="Clear case search" onMouseDown={event => event.preventDefault()} onClick={() => { setSearch(""); setDebouncedSearch(""); }} className="absolute right-3 top-2.5 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button> : null}{suggestionsOpen && debouncedSearch.length >= 2 ? <div id="case-suggestions" role="listbox" className="suggestion-popover absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">{suggestions.isLoading ? <div className="px-4 py-3 text-xs text-slate-400">Searching the case register…</div> : suggestions.data?.length ? suggestions.data.map((suggestion, index) => <button type="button" role="option" key={suggestion.trackingNumber} onMouseDown={event => event.preventDefault()} onClick={() => { setSearch(suggestion.trackingNumber); setSuggestionsOpen(false); setActiveSuggestionIndex(-1); }} id={`case-suggestion-${index}`} aria-selected={activeSuggestionIndex === index} className={`suggestion-item flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#f1f8fd] ${activeSuggestionIndex === index ? "bg-[#f1f8fd]" : ""}`}><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#e7f1fb] text-[#39739e]"><Search className="h-3.5 w-3.5" /></span><span className="min-w-0"><span className="block text-xs font-bold text-slate-800">{suggestion.trackingNumber} · {suggestion.title}</span><span className="mt-1 block truncate text-[11px] text-slate-400">{suggestion.departmentName}{suggestion.location ? ` · ${suggestion.location}` : ""}</span></span></button>) : <div className="px-4 py-3 text-xs text-slate-400">No matching cases yet.</div>}</div> : null}</div>
          <div><label className="sr-only" htmlFor="queue-status">Filter by status</label><select id="queue-status" value={status} onChange={event => setStatus(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"><option value="all">All statuses</option><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="escalated">Escalated</option><option value="resolved">Resolved</option></select></div>
          <div><label className="sr-only" htmlFor="queue-priority">Filter by priority</label><select id="queue-priority" value={priority} onChange={event => setPriority(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"><option value="all">All priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
          <div><label className="sr-only" htmlFor="queue-category">Filter by category</label><select id="queue-category" value={categoryId} onChange={event => setCategoryId(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"><option value="all">All categories</option>{catalog.data?.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3"><div><label htmlFor="queue-date-from" className="sr-only">Updated from</label><Input id="queue-date-from" type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} aria-label="Updated from" /></div><div><label htmlFor="queue-date-to" className="sr-only">Updated to</label><Input id="queue-date-to" type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} aria-label="Updated to" /></div><label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"><Checkbox checked={overdueOnly} onCheckedChange={value => setOverdueOnly(value === true)} />Overdue only</label><div><label className="sr-only" htmlFor="queue-sort">Sort cases</label><select id="queue-sort" value={sort} onChange={event => setSort(event.target.value as SortKey)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"><option value="updated_desc">Newest update first</option><option value="updated_asc">Oldest update first</option><option value="priority_desc">Highest priority first</option><option value="priority_asc">Lowest priority first</option><option value="status_asc">Workflow status A–Z</option></select></div></div>
        {dateRangeInvalid ? <p role="alert" className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"><X className="h-3.5 w-3.5" />The end date must be the same as or later than the start date.</p> : null}
      </div>
      {selectedCount ? <div className="animate-in fade-in slide-in-from-top-2 flex flex-col gap-3 border-b border-[#cfe3f4] bg-[#eff7fd] px-4 py-3 duration-300 lg:flex-row lg:items-center"><div className="flex items-center gap-2 text-sm font-semibold text-[#245d8d]"><ListChecks className="h-4 w-4" /><span aria-live="polite">{selectedCount} {selectedCount === 1 ? "case" : "cases"} selected</span><button type="button" onClick={() => setSelectedIds(new Set())} className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-[#39739e] hover:text-[#121413]"><X className="h-3.5 w-3.5" />Clear</button></div><div className="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end"><select value={bulkAction} onChange={event => { setBulkAction(event.target.value as BulkAction); setBulkValue(""); }} aria-label="Bulk action" className="h-10 rounded-xl border border-[#bcd7ec] bg-white px-3 text-sm"><option value="priority">Set priority</option><option value="status" disabled={!availableStatusTargets.length}>Move to status</option></select><select value={bulkValue} onChange={event => setBulkValue(event.target.value)} aria-label={bulkAction === "priority" ? "New priority" : "New status"} className="h-10 rounded-xl border border-[#bcd7ec] bg-white px-3 text-sm"><option value="">{bulkAction === "priority" ? "Choose priority" : "Choose permitted status"}</option>{bulkAction === "priority" ? ["critical", "high", "medium", "low"].map(value => <option key={value} value={value}>{titleCase(value)}</option>) : availableStatusTargets.map(value => <option key={value} value={value}>{titleCase(value)}</option>)}</select><Button type="button" onClick={() => setConfirmOpen(true)} disabled={!bulkValue || bulkUpdate.isPending} className="rounded-xl bg-[#121413] text-white hover:bg-[#303431]">{bulkUpdate.isPending ? "Updating…" : "Review update"}</Button></div></div> : null}
      <div className="px-4"><MutationAlert message={bulkUpdate.error?.message} /></div>
      {queue.isLoading ? <div className="p-6"><div className="h-24 animate-pulse rounded-2xl bg-slate-50" /></div> : queue.data?.length ? <div className="overflow-x-auto"><table className="data-table min-w-[930px]"><thead><tr><th className="w-12"><Checkbox checked={allSelected ? true : selectedCount ? "indeterminate" : false} onCheckedChange={toggleAll} aria-label={allSelected ? "Clear case selection" : "Select all visible cases"} /></th><th>Case</th><th>Service area</th><th>Priority</th><th>Last update</th><th>SLA</th><th>Status</th></tr></thead><tbody>{queue.data.map(item => <tr key={item.grievance.id} data-state={selectedIds.has(item.grievance.id) ? "selected" : undefined} className="hover:bg-[#fafcfc] data-[state=selected]:bg-[#eff7fd]"><td><Checkbox checked={selectedIds.has(item.grievance.id)} onCheckedChange={() => toggleSelected(item.grievance.id)} aria-label={`Select ${item.grievance.trackingNumber}`} /></td><td><Link href={`/officer/cases/${item.grievance.trackingNumber}`}><CaseTitle trackingNumber={item.grievance.trackingNumber} title={item.grievance.title} location={item.grievance.location} /></Link></td><td>{item.department.name}<p className="mt-1 text-xs text-slate-400">{item.category.name}</p></td><td><PriorityDot priority={item.grievance.priority} /></td><td>{new Date(item.grievance.updatedAt).toLocaleDateString()}</td><td className="text-xs">{item.grievance.escalatedAt ? <span className="font-semibold text-rose-600">Escalated</span> : item.grievance.dueAt ? <span className={new Date(item.grievance.dueAt) < new Date() ? "font-semibold text-rose-600" : "text-slate-500"}>{new Date(item.grievance.dueAt).toLocaleDateString()}</span> : "—"}</td><td><StatusBadge status={item.grievance.status} /></td></tr>)}</tbody></table></div> : <div className="p-6"><EmptyNotice title="No cases match this view" icon={<ClipboardCheck className="h-5 w-5" />}>Adjust the filters, try a different search, or submit a new grievance to start an open case record.</EmptyNotice></div>}
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-400"><span>Page {page + 1} · Showing up to {pageSize} cases</span><div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={page === 0 || queue.isFetching} onClick={() => setPage(current => Math.max(0, current - 1))} className="h-8 rounded-lg bg-white">Previous</Button><Button type="button" size="sm" variant="outline" disabled={(queue.data?.length || 0) < pageSize || queue.isFetching} onClick={() => setPage(current => current + 1)} className="h-8 rounded-lg bg-white">Next</Button></div></div>
    </div>
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}><AlertDialogContent className="rounded-[24px] border-slate-200 bg-white p-6"><AlertDialogHeader><p className="micro-label">Confirm public action</p><AlertDialogTitle className="tracking-[-0.04em]">Apply this update to {selectedCount} selected {selectedCount === 1 ? "case" : "cases"}?</AlertDialogTitle><AlertDialogDescription className="leading-6">This will <strong>{bulkActionLabel}</strong>. Each selected case will receive an auditable timeline entry, and the view will refresh when the update completes.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-xl">Keep reviewing</AlertDialogCancel><AlertDialogAction onClick={() => { setConfirmOpen(false); submitBulk(); }} className="rounded-xl bg-[#121413] text-white hover:bg-[#303431]"><Check className="mr-2 h-4 w-4" />Apply update</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
