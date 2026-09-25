import { useAuth } from "@/_core/hooks/useAuth";
import { CaseTitle, EmptyNotice, PageHeader, PriorityDot, StatusBadge } from "@/components/CivicPrimitives";
import { MutationAlert } from "@/components/MutationAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Filter, Search, UserRoundPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function AdminGrievances() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [assignee, setAssignee] = useState<Record<number, string>>({});

  const [page, setPage] = useState(0);
  const pageSize = 25;

  const params = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status === "all" ? undefined : (status as any),
      limit: pageSize,
      offset: page * pageSize,
      paginate: true,
    }),
    [search, status, page, pageSize]
  );

  const cases = trpc.admin.listGrievances.useQuery(params, { enabled: user?.role === "admin" });
  const officers = trpc.admin.officers.useQuery(undefined, { enabled: user?.role === "admin" });

  const items = useMemo(() => {
    if (!cases.data) return [];
    return Array.isArray(cases.data) ? cases.data : cases.data.items;
  }, [cases.data]);

  const total = useMemo(() => {
    if (!cases.data) return 0;
    return Array.isArray(cases.data) ? cases.data.length : cases.data.total;
  }, [cases.data]);

  const hasMore = useMemo(() => {
    if (!cases.data) return false;
    return Array.isArray(cases.data) ? false : cases.data.hasMore;
  }, [cases.data]);

  const assign = trpc.admin.assign.useMutation({
    onSuccess: () => {
      utils.admin.listGrievances.invalidate();
      utils.admin.dashboard.invalidate();
      toast.success("Officer assignment recorded.");
    },
    onError: (error) => toast.error(error.message),
  });

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-8">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#2563eb] border-t-transparent" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <EmptyNotice title="Administrator Access Required">
        <div className="space-y-3">
          <p>This executive case triage console is reserved exclusively for system administrators.</p>
          <div>
            <Link
              href="/staff/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0a0a0a] dark:bg-white text-white dark:text-black px-4 py-2 text-xs font-semibold hover:bg-[#27272a] transition"
            >
              Sign In to Staff Workspace →
            </Link>
          </div>
        </div>
      </EmptyNotice>
    );
  }

  return (
    <div className="space-y-10 font-sans">
      <PageHeader
        eyebrow="Municipal Case Docket"
        title="Comprehensive Case Triage"
        description="Inspect all recorded civic grievances, monitor service trajectories, and dispatch responsible departmental officers."
      />

      <div className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] overflow-hidden shadow-xs">
        {/* Search & Filter Bar */}
        <div className="p-4 sm:p-6 border-b border-[#f0f2f5] dark:border-[#20242f] flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717a] dark:text-[#a1a1aa]" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search by tracking reference ID (e.g. GRV-2026-00001)..."
              className="pl-10 rounded-full border-[#e4e4e7] dark:border-[#20242f] bg-[#fafcfe] dark:bg-[#181d26] text-xs sm:text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-[#71717a] dark:text-[#a1a1aa] shrink-0 hidden sm:block" />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
              className="rounded-full border border-[#e4e4e7] dark:border-[#20242f] bg-[#fafcfe] dark:bg-[#181d26] px-4 py-2 text-xs font-semibold text-[#0a0a0a] dark:text-white outline-none focus:ring-2 focus:ring-[#2563eb]"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="px-6 pt-3">
          <MutationAlert message={assign.error?.message} />
        </div>

        {/* Case Table */}
        {cases.isLoading ? (
          <div className="p-8">
            <div className="h-40 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
          </div>
        ) : items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#f0f2f5] dark:border-[#20242f] bg-[#fafcfe]/50 dark:bg-[#181d26]/50 text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                  <th className="py-3.5 px-6">Case Reference</th>
                  <th className="py-3.5 px-4">Citizen Contact</th>
                  <th className="py-3.5 px-4">Department & Topic</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Stage Status</th>
                  <th className="py-3.5 px-6">Field Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f5] dark:divide-[#20242f]">
                {items.map((item) => {
                  const options = (officers.data || []).filter(
                    (officer) =>
                      officer.profile.departmentId === item.grievance.departmentId &&
                      officer.profile.availability === "available"
                  );
                  return (
                    <tr
                      key={item.grievance.id}
                      className="hover:bg-[#fafcfe] dark:hover:bg-[#181d26]/50 transition"
                    >
                      <td className="py-4 px-6">
                        <Link href={`/officer/cases/${item.grievance.trackingNumber}`}>
                          <CaseTitle
                            trackingNumber={item.grievance.trackingNumber}
                            title={item.grievance.title}
                            location={item.grievance.location}
                          />
                        </Link>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-[#0a0a0a] dark:text-white">
                          {item.citizen.name || "Citizen"}
                        </p>
                        <p className="text-[11px] text-[#71717a] dark:text-[#a1a1aa] mt-0.5">
                          {item.citizen.email || "Anonymous"}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-[#0a0a0a] dark:text-white block">
                          {item.department.name}
                        </span>
                        <span className="text-[11px] text-[#71717a] dark:text-[#a1a1aa]">
                          {item.category.name}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <PriorityDot priority={item.grievance.priority} />
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={item.grievance.status} />
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <select
                            value={assignee[item.grievance.id] || ""}
                            onChange={(e) =>
                              setAssignee((previous) => ({
                                ...previous,
                                [item.grievance.id]: e.target.value,
                              }))
                            }
                            className="h-8 max-w-44 rounded-lg border border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] px-2 text-xs text-[#0a0a0a] dark:text-white outline-none"
                          >
                            <option value="">
                              {item.grievance.assignedOfficerId ? "Reassign…" : "Assign officer…"}
                            </option>
                            {options.map((officer) => (
                              <option key={officer.user.id} value={officer.user.id}>
                                {officer.user.name || `Officer #${officer.user.id}`}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label="Assign officer to case"
                            title="Assign officer to case"
                            disabled={!assignee[item.grievance.id] || assign.isPending}
                            onClick={() =>
                              assign.mutate({
                                grievanceId: item.grievance.id,
                                officerId: Number(assignee[item.grievance.id]),
                              })
                            }
                            className="h-8 rounded-lg"
                          >
                            <UserRoundPlus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10">
            <EmptyNotice title="No Grievances Found in Current Filter">
              Citizen grievance records will appear here as they are filed and routed through municipal channels.
            </EmptyNotice>
          </div>
        )}

        {/* Pagination controls */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#f0f2f5] dark:border-[#20242f] text-xs text-[#71717a] dark:text-[#a1a1aa]">
            <p>
              Showing <span className="font-semibold text-[#0a0a0a] dark:text-white">{page * pageSize + 1}</span> to{" "}
              <span className="font-semibold text-[#0a0a0a] dark:text-white">
                {Math.min((page + 1) * pageSize, total)}
              </span>{" "}
              of <span className="font-semibold text-[#0a0a0a] dark:text-white">{total}</span> cases
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0 || cases.isLoading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-8 rounded-lg text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore || cases.isLoading}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 rounded-lg text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

