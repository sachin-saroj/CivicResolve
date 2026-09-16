import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyNotice, PageHeader, PillButton, pretty } from "@/components/CivicPrimitives";
import { MutationAlert } from "@/components/MutationAlert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Building2, CheckCircle2, Clock3, Plus, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export default function AdminDepartments() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const departments = trpc.admin.departments.useQuery(undefined, { enabled: user?.role === "admin" });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slaHours, setSlaHours] = useState("72");
  const [slaEdits, setSlaEdits] = useState<Record<number, string>>({});

  const create = trpc.admin.createDepartment.useMutation({
    onSuccess: () => {
      setName("");
      setDescription("");
      setSlaHours("72");
      utils.admin.departments.invalidate();
      utils.public.catalog.invalidate();
      toast.success("Department branch successfully established.");
    },
    onError: (error) => toast.error(error.message),
  });

  const setStatus = trpc.admin.setDepartmentStatus.useMutation({
    onSuccess: () => {
      utils.admin.departments.invalidate();
      utils.public.catalog.invalidate();
      toast.success("Department status updated.");
    },
  });

  const updateSla = trpc.admin.updateDepartmentSla.useMutation({
    onSuccess: () => {
      utils.admin.departments.invalidate();
      toast.success("Statutory SLA threshold updated.");
    },
  });

  if (user?.role && user.role !== "admin") {
    return (
      <EmptyNotice title="Administrator Access Required">
        This executive department management console is reserved exclusively for system administrators.
      </EmptyNotice>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      slaHours: Number(slaHours),
    });
  };

  return (
    <div className="space-y-10 font-sans">
      <PageHeader
        eyebrow="Administrative Infrastructure"
        title="Municipal Departments"
        description="Maintain the active service branches that receive civic grievances and configure their statutory resolution SLA limits."
      />

      <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Left: Create Department Form */}
        <div className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 sm:p-8 shadow-xs h-fit">
          <div className="pb-4 border-b border-[#f0f2f5] dark:border-[#20242f]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb] dark:text-[#60a5fa]">
              New Service Area
            </p>
            <h2 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white mt-1">
              Add Department Branch
            </h2>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa] block mb-1.5">
                Department Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Roads & Infrastructure"
                className="rounded-xl border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] px-3.5 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa] block mb-1.5">
                Jurisdiction & Responsibility Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the scope of complaints this department handles..."
                className="rounded-xl border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] px-3.5 py-2.5 text-sm min-h-24"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa] block mb-1.5">
                Statutory SLA Target (Hours)
              </label>
              <Input
                id="sla-hours"
                type="number"
                min="1"
                max="720"
                value={slaHours}
                onChange={(e) => setSlaHours(e.target.value)}
                className="rounded-xl border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] px-3.5 py-2.5 text-sm"
              />
            </div>

            <MutationAlert message={create.error?.message || setStatus.error?.message} />

            <div className="pt-2">
              <PillButton
                type="submit"
                variant="primary"
                size="md"
                disabled={create.isPending || name.trim().length < 3}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span>{create.isPending ? "Creating Branch…" : "Establish Department"}</span>
              </PillButton>
            </div>
          </form>
        </div>

        {/* Right: Department List Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                Registered Service Branches
              </p>
              <h3 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white">
                Active Departments ({departments.data?.length || 0})
              </h3>
            </div>
          </div>

          {departments.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-48 animate-pulse rounded-3xl bg-neutral-100 dark:bg-neutral-800" />
              ))}
            </div>
          ) : departments.data?.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {departments.data.map((dept) => {
                const isActive = dept.status === "active";
                return (
                  <article
                    key={dept.id}
                    className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 shadow-xs flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#f0f2f5] dark:border-[#20242f]">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563eb] dark:text-[#60a5fa] shrink-0">
                          <Building2 className="h-5 w-5" />
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setStatus.mutate({
                              departmentId: dept.id,
                              status: isActive ? "inactive" : "active",
                            })
                          }
                          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100"
                              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200"
                          }`}
                        >
                          {isActive ? "Active Duty" : "Deactivated"}
                        </button>
                      </div>

                      <h3 className="font-editorial text-xl font-bold text-[#0a0a0a] dark:text-white mt-4">
                        {dept.name}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-[#52525b] dark:text-[#a1a1aa] min-h-10">
                        {dept.description || "No departmental charter description recorded."}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#f0f2f5] dark:border-[#20242f]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] block mb-1">
                            Statutory SLA Window
                          </label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              max="720"
                              value={slaEdits[dept.id] ?? String(dept.slaHours)}
                              onChange={(e) =>
                                setSlaEdits((current) => ({
                                  ...current,
                                  [dept.id]: e.target.value,
                                }))
                              }
                              className="h-8 rounded-lg border-[#e4e4e7] dark:border-[#20242f] bg-[#fafcfe] dark:bg-[#181d26] text-xs font-bold"
                            />
                            <span className="text-xs text-[#71717a]">hrs</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={updateSla.isPending}
                          onClick={() =>
                            updateSla.mutate({
                              departmentId: dept.id,
                              slaHours: Number(slaEdits[dept.id] ?? dept.slaHours),
                            })
                          }
                          className="self-end rounded-lg bg-[#0a0a0a] dark:bg-white text-white dark:text-black px-3 py-1.5 text-xs font-bold hover:bg-[#27272a] dark:hover:bg-neutral-200 transition"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyNotice title="No Departments Established">
              Create your first department to initiate citizen routing and category governance.
            </EmptyNotice>
          )}
        </div>
      </section>
    </div>
  );
}

