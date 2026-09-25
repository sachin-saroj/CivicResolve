import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyNotice, PageHeader, pretty } from "@/components/CivicPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, Shield, User, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

export default function AdminUsers() {
  const { user, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const queryParams = useMemo(
    () => ({
      search: search.trim() || undefined,
      limit: pageSize,
      offset: page * pageSize,
      paginate: true,
    }),
    [search, page, pageSize]
  );

  const people = trpc.admin.users.useQuery(queryParams, { enabled: user?.role === "admin" });

  const items = useMemo(() => {
    if (!people.data) return [];
    return Array.isArray(people.data) ? people.data : people.data.items;
  }, [people.data]);

  const total = useMemo(() => {
    if (!people.data) return 0;
    return Array.isArray(people.data) ? people.data.length : people.data.total;
  }, [people.data]);

  const hasMore = useMemo(() => {
    if (!people.data) return false;
    return Array.isArray(people.data) ? false : people.data.hasMore;
  }, [people.data]);

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
          <p>This user directory is reserved exclusively for system administrators.</p>
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
        eyebrow="Access & Identity Directory"
        title="User & Account Registry"
        description="Inspect authenticated user accounts across citizen and staff roles, audit sign-in mechanisms, and verify authorized identities."
      />

      <section className="rounded-3xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] overflow-hidden shadow-xs">
        {/* Search Bar */}
        <div className="p-4 sm:p-6 border-b border-[#f0f2f5] dark:border-[#20242f]">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717a] dark:text-[#a1a1aa]" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search user by name or email address..."
              className="pl-10 rounded-full border-[#e4e4e7] dark:border-[#20242f] bg-[#fafcfe] dark:bg-[#181d26] text-xs sm:text-sm"
            />
          </div>
        </div>

        {people.isLoading ? (
          <div className="p-8">
            <div className="h-40 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
          </div>
        ) : items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#f0f2f5] dark:border-[#20242f] bg-[#fafcfe]/50 dark:bg-[#181d26]/50 text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                  <th className="py-3.5 px-6">User Account</th>
                  <th className="py-3.5 px-4">System Role</th>
                  <th className="py-3.5 px-4">Authentication Source</th>
                  <th className="py-3.5 px-6">Registered On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f5] dark:divide-[#20242f]">
                {items.map((person) => {
                  const roleBadgeClass =
                    person.role === "admin"
                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60"
                      : person.role === "officer"
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60"
                      : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-[#e4e4e7] dark:border-[#20242f]";

                  return (
                    <tr
                      key={person.id}
                      className="hover:bg-[#fafcfe] dark:hover:bg-[#181d26]/50 transition"
                    >
                      <td className="py-4 px-6">
                        <p className="font-editorial text-base font-bold text-[#0a0a0a] dark:text-white">
                          {person.name || "Unnamed Account"}
                        </p>
                        <p className="text-[11px] text-[#71717a] dark:text-[#a1a1aa] mt-0.5">
                          {person.email || "No email on record"}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${roleBadgeClass}`}>
                          {pretty(person.role)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-[#52525b] dark:text-[#a1a1aa] font-medium">
                        {person.loginMethod || "Internal Auth / Managed"}
                      </td>
                      <td className="py-4 px-6 text-[#71717a] dark:text-[#a1a1aa]">
                        {new Date(person.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10">
            <EmptyNotice title="No Users Match Query" icon={<UsersRound className="h-6 w-6" />}>
              Try searching with another query or clear the search filter.
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
              of <span className="font-semibold text-[#0a0a0a] dark:text-white">{total}</span> users
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0 || people.isLoading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-8 rounded-lg text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore || people.isLoading}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 rounded-lg text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

