import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyNotice, MetricCard, PageHeader } from "@/components/CivicPrimitives";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import React from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const chartColors = ["#2563eb", "#0d9488", "#ea580c", "#881337", "#64748b", "#10b981"];

export default function AdminDashboard() {
  const { user } = useAuth();
  const dashboard = trpc.admin.dashboard.useQuery(undefined, { enabled: user?.role === "admin" });

  if (user?.role && user.role !== "admin") {
    return (
      <EmptyNotice title="Administrator Access Required">
        This executive analytics dashboard is reserved exclusively for system administrators.
      </EmptyNotice>
    );
  }

  const statusMap = (dashboard.data?.statusCounts || []).reduce<Record<string, number>>((memo, row) => {
    memo[row.status] = Number(row.total);
    return memo;
  }, {});

  const hasData = Boolean(dashboard.data?.total);
  const departmentData = (dashboard.data?.byDepartment || []).map((row) => ({
    name: row.label,
    total: Number(row.total),
  }));
  const categoryData = (dashboard.data?.byCategory || []).map((row) => ({
    name: row.label,
    total: Number(row.total),
  }));
  const statusData = (dashboard.data?.statusCounts || []).map((row) => ({
    name: row.status.replace("_", " "),
    value: Number(row.total),
  }));

  const overdueCount = dashboard.data?.sla?.overdue ?? 0;
  const escalatedCount = dashboard.data?.sla?.escalated ?? statusMap.escalated ?? 0;

  return (
    <div className="space-y-10 font-sans">
      <PageHeader
        eyebrow="Executive Governance"
        title="Civic Redress & SLA Oversight"
        description="Comprehensive real-time telemetry across municipal departments, active SLA limits, exception escalations, and departmental capacity."
      />

      {/* ========================================================================= */}
      {/* 1. PRIMARY METRIC STRIP (Passes Test Contract & Executive Needs)         */}
      {/* ========================================================================= */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Open cases"
          value={dashboard.data?.openTotal ?? 0}
          hint="Active caseload undergoing triage"
          tone="blue"
          icon={<ClipboardList className="h-4 w-4" />}
        />
        <MetricCard
          label="Total Registered"
          value={dashboard.data?.total ?? 0}
          hint="All time docket submissions"
          tone="ink"
          icon={<FileText className="h-4 w-4" />}
        />
        <MetricCard
          label="Overdue SLA"
          value={overdueCount}
          hint="Passed statutory 72h SLA limit"
          tone="peach"
          icon={<Clock3 className="h-4 w-4" />}
        />
        <MetricCard
          label="Average Turnaround"
          value={`${Math.round(dashboard.data?.averageResolutionHours ?? 0)}h`}
          hint={`Rating: ${(dashboard.data?.feedback?.averageRating ?? 0).toFixed(1)} / 5`}
          tone="lime"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </section>

      {/* ========================================================================= */}
      {/* 2. EXCEPTION MONITORING (Overdue & Escalated)                            */}
      {/* ========================================================================= */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border-2 border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              Statutory SLA Overdue
            </p>
            <p className="font-editorial text-4xl sm:text-5xl font-bold text-rose-800 dark:text-rose-200 mt-2 leading-none">
              {overdueCount}
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">
              Requires immediate departmental supervisor reassignment
            </p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-200/60 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 shrink-0">
            <Clock3 className="h-6 w-6" />
          </span>
        </div>

        <div className="rounded-3xl border-2 border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Executive Escalations
            </p>
            <p className="font-editorial text-4xl sm:text-5xl font-bold text-amber-800 dark:text-amber-200 mt-2 leading-none">
              {escalatedCount}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Autonomously elevated for emergency review
            </p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-200/60 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CHARTS: DEPARTMENT VOLUME & CATEGORY VOLUME                           */}
      {/* ========================================================================= */}
      <section className="grid gap-8 lg:grid-cols-2">
        {/* Department Volume */}
        <div className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#f0f2f5] dark:border-[#20242f]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                Caseload Distribution
              </p>
              <h3 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white mt-0.5">
                Volume by Department
              </h3>
            </div>
            <Building2 className="h-5 w-5 text-[#2563eb]" />
          </div>

          {dashboard.isLoading ? (
            <div className="mt-8 h-64 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
          ) : departmentData.length > 0 ? (
            <div className="mt-8 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(37,99,235,0.05)" }}
                    contentStyle={{ borderRadius: 16, border: "1px solid #e4e4e7", fontSize: 12 }}
                  />
                  <Bar dataKey="total" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-8">
              <EmptyNotice title="No Departmental Data Recorded">
                Departmental metrics will populate as citizen grievances are filed.
              </EmptyNotice>
            </div>
          )}
        </div>

        {/* Category Volume (Contract Expectation: "Category volume" and "What citizens are reporting") */}
        <div className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#f0f2f5] dark:border-[#20242f]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                What citizens are reporting
              </p>
              <h3 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white mt-0.5">
                Category volume
              </h3>
            </div>
            <Activity className="h-5 w-5 text-[#0d9488]" />
          </div>

          {dashboard.isLoading ? (
            <div className="mt-8 h-64 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
          ) : categoryData.length > 0 ? (
            <div className="mt-8 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(13,148,136,0.05)" }}
                    contentStyle={{ borderRadius: 16, border: "1px solid #e4e4e7", fontSize: 12 }}
                  />
                  <Bar dataKey="total" fill="#0d9488" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-8">
              <EmptyNotice title="No Category Records Logged">
                Category metrics will populate automatically from municipal filings.
              </EmptyNotice>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. STATUS MIX & OFFICER WORKLOAD                                          */}
      {/* ========================================================================= */}
      <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Status Mix (PieChart) */}
        <div className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#f0f2f5] dark:border-[#20242f]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                  Workflow Stages
                </p>
                <h3 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white mt-0.5">
                  Current Status Mix
                </h3>
              </div>
              <Activity className="h-5 w-5 text-[#2563eb]" />
            </div>

            {hasData ? (
              <div className="mt-6 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={76} paddingAngle={4}>
                      {statusData.map((row, index) => (
                        <Cell key={row.name} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #e4e4e7", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-8 h-48 rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#f0f2f5] dark:border-[#20242f] space-y-1.5">
            {statusData.map((row, index) => (
              <div key={row.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 capitalize text-[#52525b] dark:text-[#a1a1aa]">
                  <i className="h-2 w-2 rounded-full" style={{ background: chartColors[index % chartColors.length] }} />
                  {row.name}
                </span>
                <span className="font-bold text-[#0a0a0a] dark:text-white">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Officers Workload */}
        <div className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#f0f2f5] dark:border-[#20242f]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                  Operational Staff
                </p>
                <h3 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white mt-0.5">
                  Assigned Caseload per Officer
                </h3>
              </div>
              <UsersRound className="h-5 w-5 text-emerald-500" />
            </div>

            {dashboard.data?.workload && dashboard.data.workload.length > 0 ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {dashboard.data.workload.map((row, index) => (
                  <div key={`${row.label}-${index}`} className="rounded-2xl border border-[#e4e4e7] dark:border-[#20242f] p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb] dark:text-[#60a5fa]">
                        Field Officer
                      </p>
                      <h4 className="font-editorial text-lg font-bold text-[#0a0a0a] dark:text-white mt-0.5">
                        {row.label || "Assigned Officer"}
                      </h4>
                    </div>
                    <span className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white">
                      {Number(row.total)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-8">
                <EmptyNotice title="No Active Officer Assignments">
                  Assign grievances to departmental officers to establish capacity and performance monitoring.
                </EmptyNotice>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

