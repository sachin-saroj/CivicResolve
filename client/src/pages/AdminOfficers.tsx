import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyNotice, PageHeader, PillButton } from "@/components/CivicPrimitives";
import { MutationAlert } from "@/components/MutationAlert";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { BadgeCheck, UserCheck, UserRoundPlus, UsersRound } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

export default function AdminOfficers() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const people = trpc.admin.users.useQuery(undefined, { enabled: user?.role === "admin" });
  const departments = trpc.admin.departments.useQuery(undefined, { enabled: user?.role === "admin" });
  const officers = trpc.admin.officers.useQuery(undefined, { enabled: user?.role === "admin" });
  const [userId, setUserId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designation, setDesignation] = useState("");

  const eligible = useMemo(
    () => (people.data || []).filter((person) => person.role !== "admin"),
    [people.data]
  );

  const makeOfficer = trpc.admin.makeOfficer.useMutation({
    onSuccess: () => {
      setUserId("");
      setDepartmentId("");
      setDesignation("");
      utils.admin.officers.invalidate();
      utils.admin.users.invalidate();
      toast.success("Officer assignment recorded.");
    },
    onError: (error) => toast.error(error.message),
  });

  if (user?.role && user.role !== "admin") {
    return (
      <EmptyNotice title="Administrator Access Required">
        This officer assignment workspace is reserved exclusively for system administrators.
      </EmptyNotice>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    makeOfficer.mutate({
      userId: Number(userId),
      departmentId: Number(departmentId),
      designation: designation.trim() || undefined,
    });
  };

  return (
    <div className="space-y-10 font-sans">
      <PageHeader
        eyebrow="Human Resources & Dispatch"
        title="Officer Assignments"
        description="Connect authenticated staff members to their respective municipal departments to grant them case resolution authority."
      />

      <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Left: Assign Officer Form */}
        <div className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 sm:p-8 shadow-xs h-fit">
          <div className="pb-4 border-b border-[#f0f2f5] dark:border-[#20242f]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb] dark:text-[#60a5fa]">
              Staff Dispatch
            </p>
            <h2 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white mt-1">
              Designate Department Officer
            </h2>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa] block mb-1.5">
                Select Registered User
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded-xl border border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] px-3.5 py-2.5 text-sm text-[#0a0a0a] dark:text-white outline-none focus:ring-2 focus:ring-[#2563eb]"
              >
                <option value="">Choose signed-in user</option>
                {eligible.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name || `User #${person.id}`} {person.email ? `· ${person.email}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa] block mb-1.5">
                Target Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-xl border border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] px-3.5 py-2.5 text-sm text-[#0a0a0a] dark:text-white outline-none focus:ring-2 focus:ring-[#2563eb]"
              >
                <option value="">Choose department</option>
                {departments.data
                  ?.filter((item) => item.status === "active")
                  .map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa] block mb-1.5">
                Official Designation (Optional)
              </label>
              <Input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior Road Inspector"
                className="rounded-xl border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] px-3.5 py-2.5 text-sm"
              />
            </div>

            <MutationAlert message={makeOfficer.error?.message} />

            <div className="pt-2">
              <PillButton
                type="submit"
                variant="primary"
                size="md"
                disabled={makeOfficer.isPending || !userId || !departmentId}
                className="w-full"
              >
                <UserRoundPlus className="mr-2 h-4 w-4" />
                <span>{makeOfficer.isPending ? "Assigning…" : "Authorize Officer"}</span>
              </PillButton>
            </div>
          </form>
        </div>

        {/* Right: Active Service Team */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                Operational Personnel
              </p>
              <h3 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white">
                Active Officers ({officers.data?.length || 0})
              </h3>
            </div>
          </div>

          {officers.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-24 animate-pulse rounded-3xl bg-neutral-100 dark:bg-neutral-800" />
              ))}
            </div>
          ) : officers.data?.length ? (
            <div className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] divide-y divide-[#f0f2f5] dark:divide-[#20242f] overflow-hidden shadow-xs">
              {officers.data.map((item) => {
                const isAvailable = item.profile.availability === "available";
                return (
                  <article key={item.profile.id} className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <UserCheck className="h-6 w-6" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-editorial text-lg font-bold text-[#0a0a0a] dark:text-white truncate">
                          {item.user.name || `Officer #${item.user.id}`}
                        </h4>
                        <p className="text-xs text-[#52525b] dark:text-[#a1a1aa] truncate mt-0.5">
                          {item.profile.designation || "Department Officer"} • {item.department.name}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold shrink-0 ${
                        isAvailable
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-[#e4e4e7] dark:border-[#20242f]"
                      }`}
                    >
                      {isAvailable ? "Available for Triage" : "Unavailable"}
                    </span>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyNotice title="No Officers Designated">
              Once staff members have created accounts, assign them to their department here.
            </EmptyNotice>
          )}
        </div>
      </section>
    </div>
  );
}

