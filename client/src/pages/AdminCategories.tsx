import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyNotice, PageHeader, PillButton, pretty } from "@/components/CivicPrimitives";
import { MutationAlert } from "@/components/MutationAlert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Tag, Tags } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export default function AdminCategories() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const categories = trpc.admin.categories.useQuery(undefined, { enabled: user?.role === "admin" });
  const departments = trpc.admin.departments.useQuery(undefined, { enabled: user?.role === "admin" });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const create = trpc.admin.createCategory.useMutation({
    onSuccess: () => {
      setName("");
      setDescription("");
      setDepartmentId("");
      utils.admin.categories.invalidate();
      utils.public.catalog.invalidate();
      toast.success("Civic complaint category created.");
    },
    onError: (error) => toast.error(error.message),
  });

  const setStatus = trpc.admin.setCategoryStatus.useMutation({
    onSuccess: () => {
      utils.admin.categories.invalidate();
      utils.public.catalog.invalidate();
      toast.success("Category status updated.");
    },
  });

  if (user?.role && user.role !== "admin") {
    return (
      <EmptyNotice title="Administrator Access Required">
        This category management workspace is reserved exclusively for system administrators.
      </EmptyNotice>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate({
      name: name.trim(),
      departmentId: Number(departmentId),
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="space-y-10 font-sans">
      <PageHeader
        eyebrow="Taxonomy Governance"
        title="Grievance Categories"
        description="Define structured, department-specific complaint categories to enable automated citizen routing, SLA tracking, and accurate reporting."
      />

      <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Left: Create Category Form */}
        <div className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 sm:p-8 shadow-xs h-fit">
          <div className="pb-4 border-b border-[#f0f2f5] dark:border-[#20242f]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#0d9488] dark:text-[#2dd4bf]">
              Structured Filing Topic
            </p>
            <h2 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white mt-1">
              Add Complaint Category
            </h2>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa] block mb-1.5">
                Responsible Service Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-xl border border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] px-3.5 py-2.5 text-sm text-[#0a0a0a] dark:text-white outline-none focus:ring-2 focus:ring-[#2563eb]"
              >
                <option value="">Choose designated department</option>
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
                Category Title
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Street Lighting Outage"
                className="rounded-xl border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] px-3.5 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#52525b] dark:text-[#a1a1aa] block mb-1.5">
                Citizen Guidance & Scope
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief advice guiding citizens on what falls under this category..."
                className="rounded-xl border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#181d26] px-3.5 py-2.5 text-sm min-h-24"
              />
            </div>

            <MutationAlert message={create.error?.message || setStatus.error?.message} />

            <div className="pt-2">
              <PillButton
                type="submit"
                variant="primary"
                size="md"
                disabled={create.isPending || !departmentId || name.trim().length < 3}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span>{create.isPending ? "Registering…" : "Register Category"}</span>
              </PillButton>
            </div>
          </form>
        </div>

        {/* Right: Category Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                Taxonomy Catalog
              </p>
              <h3 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white">
                Active Categories ({categories.data?.length || 0})
              </h3>
            </div>
          </div>

          {categories.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-44 animate-pulse rounded-3xl bg-neutral-100 dark:bg-neutral-800" />
              ))}
            </div>
          ) : categories.data?.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {categories.data.map((item) => {
                const isActive = item.category.status === "active";
                return (
                  <article
                    key={item.category.id}
                    className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 shadow-xs flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#f0f2f5] dark:border-[#20242f]">
                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-[#52525b] dark:text-[#a1a1aa]">
                          {item.department.name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setStatus.mutate({
                              categoryId: item.category.id,
                              status: isActive ? "inactive" : "active",
                            })
                          }
                          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100"
                              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200"
                          }`}
                        >
                          {isActive ? "Active" : "Archived"}
                        </button>
                      </div>

                      <h3 className="font-editorial text-xl font-bold text-[#0a0a0a] dark:text-white mt-4">
                        {item.category.name}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-[#52525b] dark:text-[#a1a1aa] min-h-10">
                        {item.category.description || "No specific instructions recorded for this category."}
                      </p>
                    </div>

                    <div className="mt-6 pt-3 border-t border-[#f0f2f5] dark:border-[#20242f] flex items-center justify-between text-xs text-[#71717a] dark:text-[#a1a1aa]">
                      <span className="capitalize font-semibold">{pretty(item.category.status)}</span>
                      <span className="text-[10px] uppercase font-bold text-[#2563eb] dark:text-[#60a5fa]">
                        Verified Topic
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyNotice title="No Categories Defined">
              Establish service categories to allow citizens to properly tag and file their grievances.
            </EmptyNotice>
          )}
        </div>
      </section>
    </div>
  );
}

