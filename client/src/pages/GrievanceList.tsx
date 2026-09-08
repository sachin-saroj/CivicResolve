import { useAuth } from "@/_core/hooks/useAuth";
import { CaseTitle, EmptyNotice, PageHeader, PriorityDot, StatusBadge } from "@/components/CivicPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { FilePlus2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

export default function GrievanceList() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const query = trpc.citizen.list.useQuery(undefined, { enabled: user?.role === "user" });
  const items = useMemo(() => (query.data || []).filter(item => { const matchesSearch = `${item.grievance.trackingNumber} ${item.grievance.title}`.toLowerCase().includes(search.toLowerCase()); return matchesSearch && (status === "all" || item.grievance.status === status); }), [query.data, search, status]);
  if (user?.role && user.role !== "user") return <EmptyNotice title="This is not your workspace">Use the navigation for your assigned role.</EmptyNotice>;
  return <div className="space-y-8"><PageHeader eyebrow="Citizen workspace" title="My grievances" description="Search every case you have submitted and open a record for its private history, documents, and outcome." action={<Link href="/grievances/new"><Button className="rounded-xl bg-[#121413] text-white hover:bg-[#303431]"><FilePlus2 className="mr-2 h-4 w-4" />New grievance</Button></Link>} /><div className="surface overflow-hidden"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search ID or title" className="pl-9" /></div><select value={status} onChange={event => setStatus(event.target.value)} aria-label="Filter grievance status" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"><option value="all">All statuses</option><option value="submitted">Submitted</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div>{query.isLoading ? <div className="p-6"><div className="h-20 animate-pulse rounded-2xl bg-slate-50" /></div> : items.length ? <div className="overflow-x-auto"><table className="data-table min-w-[720px]"><thead><tr><th>Case</th><th>Service area</th><th>Priority</th><th>Updated</th><th>Status</th></tr></thead><tbody>{items.map(item => <tr key={item.grievance.id} className="transition hover:bg-[#fafcfc]"><td><Link href={`/grievances/${item.grievance.id}`}><CaseTitle trackingNumber={item.grievance.trackingNumber} title={item.grievance.title} location={item.grievance.location} /></Link></td><td>{item.department.name}<p className="mt-1 text-xs text-slate-400">{item.category.name}</p></td><td><PriorityDot priority={item.grievance.priority} /></td><td>{new Date(item.grievance.updatedAt).toLocaleDateString()}</td><td><StatusBadge status={item.grievance.status} /></td></tr>)}</tbody></table></div> : <div className="p-6"><EmptyNotice title="No matching grievances">Try a different search, or submit a new civic concern when you need help.</EmptyNotice></div>}</div></div>;
}
