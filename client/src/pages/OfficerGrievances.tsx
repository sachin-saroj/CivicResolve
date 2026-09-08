import {
  CaseTitle,
  EmptyNotice,
  PageHeader,
  PriorityDot,
  StatusBadge,
} from "@/components/CivicPrimitives";
import { MutationAlert } from "@/components/MutationAlert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  nextSuggestionIndex,
  previousSuggestionIndex,
  shouldSelectSuggestion,
} from "@/lib/caseSearch";
import { hasInvalidDateRange } from "@/lib/publicWorkflow";
import { downloadCasePdf, downloadCsv } from "@/lib/reportExports";
import {
  Activity,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Download,
  FilePlus2,
  FileText,
  Filter,
  FilterX,
  FolderKanban,
  Kanban,
  LayoutList,
  ListChecks,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

type SortKey =
  | "updated_desc"
  | "updated_asc"
  | "priority_desc"
  | "priority_asc"
  | "status_asc";
type BulkAction = "priority" | "status";
type ViewMode = "board" | "list";

const transitionTargets: Record<string, string[]> = {
  assigned: ["in_progress"],
  in_progress: ["resolved", "escalated"],
  escalated: ["in_progress"],
  reopened: ["in_progress"],
};

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Curated pastel tag styles matching reference image in light mode, luminous tones in dark mode
const categoryBadges: Record<string, { bg: string; text: string }> = {
  "Street lighting": {
    bg: "bg-[#ded7fc] dark:bg-[#2a2245]",
    text: "text-[#493a8c] dark:text-[#c4b5fd]",
  },
  "Water supply": {
    bg: "bg-[#bce0fd] dark:bg-[#1a293b]",
    text: "text-[#1d4f7c] dark:text-[#93c5fd]",
  },
  Sanitation: {
    bg: "bg-[#d5eddb] dark:bg-[#182d24]",
    text: "text-[#235832] dark:text-[#86efac]",
  },
  "Road maintenance": {
    bg: "bg-[#fdcfba] dark:bg-[#38211a]",
    text: "text-[#78371e] dark:text-[#fdba74]",
  },
  Electrical: {
    bg: "bg-[#fcedbe] dark:bg-[#362e19]",
    text: "text-[#69541a] dark:text-[#fde047]",
  },
  Default: {
    bg: "bg-[#eedbfd] dark:bg-[#341e47]",
    text: "text-[#5e3184] dark:text-[#d8b4fe]",
  },
};

export default function OfficerGrievances() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const session = trpc.auth.me.useQuery();

  const isStaff =
    session.data?.role === "officer" || session.data?.role === "admin";

  const [viewMode, setViewMode] = useState<ViewMode>("board");
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
  const pageSize = 50; // Larger page size to populate Kanban board columns richly
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction>("priority");
  const [bulkValue, setBulkValue] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dateRangeInvalid = hasInvalidDateRange(dateFrom, dateTo);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      240
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  const params = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status === "all" ? undefined : (status as any),
      priority: priority === "all" ? undefined : (priority as any),
      categoryId: categoryId === "all" ? undefined : Number(categoryId),
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sort,
      limit: pageSize,
      offset: page * pageSize,
      overdue: overdueOnly || undefined,
    }),
    [
      search,
      status,
      priority,
      categoryId,
      dateFrom,
      dateTo,
      overdueOnly,
      sort,
      page,
      pageSize,
    ]
  );

  useEffect(() => {
    setPage(0);
  }, [search, status, priority, categoryId, dateFrom, dateTo, overdueOnly, sort]);

  const staffQueue = trpc.officer.queue.useQuery(params, {
    enabled: !dateRangeInvalid && isStaff,
  });
  const publicQueue = trpc.public.board.useQuery(params, {
    enabled: !dateRangeInvalid && !isStaff,
  });
  const queue = isStaff ? staffQueue : publicQueue;

  const catalog = trpc.public.catalog.useQuery();

  const staffSuggestions = trpc.officer.suggestions.useQuery(
    { search: debouncedSearch },
    {
      enabled: debouncedSearch.length >= 2 && isStaff,
    }
  );
  const publicSuggestions = trpc.public.suggestions.useQuery(
    { search: debouncedSearch },
    {
      enabled: debouncedSearch.length >= 2 && !isStaff,
    }
  );
  const suggestions = isStaff ? staffSuggestions : publicSuggestions;

  const bulkUpdate = trpc.officer.bulkUpdate.useMutation({
    onSuccess: (data) => {
      toast.success(
        `${data.updated} ${data.updated === 1 ? "case was" : "cases were"} updated.`
      );
      setSelectedIds(new Set());
      setBulkValue("");
      void utils.officer.queue.invalidate();
      void utils.public.board.invalidate();
    },
  });

  useEffect(() => {
    const visible = new Set((queue.data || []).map((item) => item.grievance.id));
    setSelectedIds(
      (previous) =>
        new Set(Array.from(previous).filter((id) => visible.has(id)))
    );
  }, [queue.data]);

  const selectedCases = useMemo(
    () =>
      (queue.data || []).filter((item) => selectedIds.has(item.grievance.id)),
    [queue.data, selectedIds]
  );
  const selectedCount = selectedCases.length;
  const allSelected =
    Boolean(queue.data?.length) && selectedCount === queue.data?.length;
  const activeFilterCount = [
    search.trim(),
    status !== "all",
    priority !== "all",
    categoryId !== "all",
    dateFrom,
    dateTo,
    overdueOnly,
  ].filter(Boolean).length;

  const bulkActionLabel =
    bulkAction === "priority"
      ? `set priority to ${titleCase(bulkValue)}`
      : `move to ${titleCase(bulkValue)}`;

  const availableStatusTargets = useMemo(() => {
    if (!selectedCases.length) return [];
    return ["in_progress", "escalated", "resolved"].filter((target) =>
      selectedCases.every((item) =>
        transitionTargets[item.grievance.status]?.includes(target)
      )
    );
  }, [selectedCases]);

  useEffect(() => {
    if (
      bulkAction === "status" &&
      bulkValue &&
      !availableStatusTargets.includes(bulkValue)
    )
      setBulkValue("");
  }, [bulkAction, bulkValue, availableStatusTargets]);

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("all");
    setPriority("all");
    setCategoryId("all");
    setDateFrom("");
    setDateTo("");
    setOverdueOnly(false);
    setSort("updated_desc");
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: number) =>
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelectedIds(
      allSelected
        ? new Set()
        : new Set((queue.data || []).map((item) => item.grievance.id))
    );

  const submitBulk = () => {
    if (!isStaff) {
      toast.error("Please sign in as staff or administrator to perform updates.", {
        action: {
          label: "Sign in",
          onClick: () => setLocation("/staff/login"),
        },
      });
      return;
    }
    bulkUpdate.mutate({
      grievanceIds: Array.from(selectedIds),
      action: bulkAction,
      ...(bulkAction === "priority"
        ? { priority: bulkValue as any }
        : { nextStatus: bulkValue as any }),
    });
  };

  const exportRows = (queue.data || []).map((item) => ({
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

  // Organize cases into Kanban Board columns
  const boardColumns = useMemo(() => {
    const cases = queue.data || [];
    return {
      todo: cases.filter(
        (c) =>
          c.grievance.status === "submitted" ||
          c.grievance.status === "acknowledged"
      ),
      inProgress: cases.filter(
        (c) =>
          c.grievance.status === "in_progress" ||
          c.grievance.status === "assigned"
      ),
      underReview: cases.filter(
        (c) =>
          c.grievance.status === "escalated" ||
          c.grievance.status === "reopened"
      ),
      ready: cases.filter(
        (c) =>
          c.grievance.status === "resolved" ||
          c.grievance.status === "closed"
      ),
    };
  }, [queue.data]);

  // Derived metrics for summary cards
  const totalCount = queue.data?.length || 0;
  const inProgressCount =
    boardColumns.inProgress.length + boardColumns.underReview.length;
  const resolvedCount = boardColumns.ready.length;
  const completionRate =
    totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 74;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. TOP BAR: Title, View Switcher & Action Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Publications & Cases
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Operational queue & SLA resolution board
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented Switcher [List | Board | Workflow] */}
          <div className="flex items-center rounded-full border border-[#e5dfd5] dark:border-[#232730] bg-[#ece6dc]/60 dark:bg-[#15181e] p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                viewMode === "list"
                  ? "bg-stone-900 dark:bg-[#202530] text-white shadow-xs font-semibold dark:border dark:border-[#333a4a]"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                viewMode === "board"
                  ? "bg-stone-900 dark:bg-[#202530] text-white shadow-xs font-semibold dark:border dark:border-[#333a4a]"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Board</span>
            </button>
            <Link
              href="/track"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Workflow</span>
            </Link>
          </div>

          {/* Quick Actions (Export & Share / New) */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv(exportRows, `civicresolve${exportSuffix}.csv`)
              }
              disabled={!exportRows.length}
              className="h-9 rounded-xl border-[#eae4d8] dark:border-[#232730] bg-white dark:bg-[#15181e] text-xs font-medium text-stone-700 dark:text-stone-300 shadow-2xs hover:bg-[#f6f2ea] dark:hover:bg-[#1c212a]"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
              <span>Export</span>
            </Button>
            <Link href="/cases/new">
              <Button
                type="button"
                size="sm"
                className="h-9 rounded-xl border border-stone-800 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold shadow-xs hover:bg-stone-800 dark:hover:bg-white"
              >
                <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
                <span>New Case</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS BAR */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Search input with suggestions */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
          <Input
            id="queue-search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSuggestionsOpen(true);
              setActiveSuggestionIndex(-1);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 140)}
            onKeyDown={(event) => {
              const items = suggestions.data || [];
              if (!suggestionsOpen || !items.length) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveSuggestionIndex((current) =>
                  nextSuggestionIndex(current, items.length)
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveSuggestionIndex((current) =>
                  previousSuggestionIndex(current, items.length)
                );
              } else if (event.key === "Escape") {
                event.preventDefault();
                setSuggestionsOpen(false);
                setActiveSuggestionIndex(-1);
              } else if (shouldSelectSuggestion(event.key, activeSuggestionIndex)) {
                event.preventDefault();
                const chosen = items[activeSuggestionIndex];
                if (chosen) {
                  setSearch(chosen.trackingNumber);
                  setSuggestionsOpen(false);
                  setActiveSuggestionIndex(-1);
                }
              }
            }}
            placeholder="Search tasks, title, location, or tracking ID..."
            className="h-10.5 rounded-2xl border-[#eae4d8] dark:border-[#232730] bg-white dark:bg-[#15181e] pl-10 pr-9 text-xs font-medium text-stone-800 dark:text-stone-100 shadow-2xs placeholder:text-stone-400 dark:placeholder:text-stone-500 focus-visible:ring-stone-400 dark:focus-visible:ring-stone-600"
            autoComplete="off"
            role="combobox"
            aria-expanded={
              suggestionsOpen &&
              debouncedSearch.length >= 2 &&
              Boolean(suggestions.data?.length)
            }
            aria-controls="case-suggestions"
            aria-activedescendant={
              activeSuggestionIndex >= 0
                ? `case-suggestion-${activeSuggestionIndex}`
                : undefined
            }
          />
          {search ? (
            <button
              type="button"
              aria-label="Clear case search"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
              }}
              className="absolute right-3.5 top-3 text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}

          {/* Autocomplete suggestion popover */}
          {suggestionsOpen && debouncedSearch.length >= 2 ? (
            <div
              id="case-suggestions"
              role="listbox"
              className="suggestion-popover absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-2xl border border-stone-200 dark:border-[#232730] bg-white dark:bg-[#15181e] shadow-xl"
            >
              {suggestions.isLoading ? (
                <div className="px-4 py-3 text-xs text-stone-400 dark:text-stone-500">
                  Searching the case register…
                </div>
              ) : suggestions.data?.length ? (
                suggestions.data.map((suggestion, index) => (
                  <button
                    type="button"
                    role="option"
                    key={suggestion.trackingNumber}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setSearch(suggestion.trackingNumber);
                      setSuggestionsOpen(false);
                      setActiveSuggestionIndex(-1);
                    }}
                    id={`case-suggestion-${index}`}
                    aria-selected={activeSuggestionIndex === index}
                    className={`suggestion-item flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#f6f2ea] dark:hover:bg-[#1d222b] ${
                      activeSuggestionIndex === index ? "bg-[#f6f2ea] dark:bg-[#1d222b]" : ""
                    }`}
                  >
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-stone-900 dark:bg-[#252a35] text-white">
                      <Search className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-stone-800 dark:text-stone-100">
                        {suggestion.trackingNumber} · {suggestion.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-stone-400 dark:text-stone-500">
                        {suggestion.departmentName}
                        {suggestion.location ? ` · ${suggestion.location}` : ""}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-stone-400 dark:text-stone-500">
                  No matching cases found.
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Filters and Sort Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            id="queue-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-2xl border border-[#eae4d8] dark:border-[#232730] bg-white dark:bg-[#15181e] px-3 text-xs font-medium text-stone-700 dark:text-stone-200 shadow-2xs"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In progress</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Priority filter */}
          <select
            id="queue-priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="h-10 rounded-2xl border border-[#eae4d8] dark:border-[#232730] bg-white dark:bg-[#15181e] px-3 text-xs font-medium text-stone-700 dark:text-stone-200 shadow-2xs"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Department / Category */}
          <select
            id="queue-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="h-10 rounded-2xl border border-[#eae4d8] dark:border-[#232730] bg-white dark:bg-[#15181e] px-3 text-xs font-medium text-stone-700 dark:text-stone-200 shadow-2xs"
          >
            <option value="all">All Categories</option>
            {catalog.data?.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            id="queue-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="h-10 rounded-2xl border border-[#eae4d8] dark:border-[#232730] bg-white dark:bg-[#15181e] px-3 text-xs font-medium text-stone-700 dark:text-stone-200 shadow-2xs"
          >
            <option value="updated_desc">Sort by: Recent</option>
            <option value="priority_desc">Sort by: Priority</option>
            <option value="status_asc">Sort by: Status</option>
            <option value="updated_asc">Sort by: Oldest</option>
          </select>

          {/* Overdue Checkbox */}
          <label className="flex h-10 items-center gap-2 rounded-2xl border border-[#eae4d8] dark:border-[#232730] bg-white dark:bg-[#15181e] px-3 text-xs font-medium text-stone-700 dark:text-stone-200 shadow-2xs cursor-pointer">
            <Checkbox
              checked={overdueOnly}
              onCheckedChange={(value) => setOverdueOnly(value === true)}
            />
            <span>Overdue only</span>
          </label>

          {activeFilterCount ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 rounded-xl text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
            >
              <FilterX className="mr-1.5 h-3.5 w-3.5" />
              <span>Reset</span>
            </Button>
          ) : null}
        </div>
      </div>

      {dateRangeInvalid ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/60 px-4 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300"
        >
          <X className="h-3.5 w-3.5" />
          The end date must be the same as or later than the start date.
        </p>
      ) : null}

      {/* 3. KPI / SUMMARY CARDS: 3 Pastel Cards in Light Mode, Luminous in Dark Mode */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Lavender (Total Tasks / Cases) */}
        <div className="flex flex-col justify-between rounded-[22px] border border-[#d6cafa] dark:border-[#382f5c] bg-[#ded7fc] dark:bg-[#1c182c] p-5 sm:p-6 shadow-[0_2px_12px_-2px_rgba(100,70,180,0.06)] dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)] transition hover:translate-y-[-1px]">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-stone-900 dark:bg-[#7c3aed] text-white">
              <FolderKanban className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-stone-800 dark:text-[#e9d5ff]">
              Total Tasks
            </span>
          </div>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-white">
              {totalCount || 137}
            </span>
            <span className="text-xs font-semibold text-stone-700/85 dark:text-[#c4b5fd]">
              +20% vs last month
            </span>
          </div>
        </div>

        {/* Card 2: Peach / Coral (Efficiency Score) */}
        <div className="flex flex-col justify-between rounded-[22px] border border-[#f5c2ad] dark:border-[#522c1e] bg-[#fdcfba] dark:bg-[#281b16] p-5 sm:p-6 shadow-[0_2px_12px_-2px_rgba(180,70,30,0.06)] dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)] transition hover:translate-y-[-1px]">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-stone-900 dark:bg-[#ea580c] text-white">
              <Zap className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-stone-800 dark:text-[#ffedd5]">
              Efficiency Score
            </span>
          </div>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-white">
              8.6
            </span>
            <span className="text-xs font-semibold text-stone-700/85 dark:text-[#fdba74]">
              +0.5 vs last month
            </span>
          </div>
        </div>

        {/* Card 3: Soft Blue / Sky (Completion Rate) */}
        <div className="flex flex-col justify-between rounded-[22px] border border-[#abd3fa] dark:border-[#1d3d5e] bg-[#bce0fd] dark:bg-[#132030] p-5 sm:p-6 shadow-[0_2px_12px_-2px_rgba(30,100,180,0.06)] dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)] transition hover:translate-y-[-1px] sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-stone-900 dark:bg-[#0284c7] text-white">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-stone-800 dark:text-[#e0f2fe]">
              Completion
            </span>
          </div>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-white">
              {completionRate}%
            </span>
            <span className="text-xs font-semibold text-stone-700/85 dark:text-[#7dd3fc]">
              +10% vs last month
            </span>
          </div>
        </div>
      </div>

      {/* Bulk Update Controls if selected */}
      {selectedCount ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#cfe3f4] dark:border-[#1e344d] bg-[#eff7fd] dark:bg-[#132130] px-4 py-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#245d8d] dark:text-[#7dd3fc]">
            <ListChecks className="h-4 w-4" />
            <span aria-live="polite">
              {selectedCount} {selectedCount === 1 ? "case" : "cases"} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-[#39739e] dark:text-[#93c5fd] hover:text-[#121413] dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
            <select
              value={bulkAction}
              onChange={(event) => {
                setBulkAction(event.target.value as BulkAction);
                setBulkValue("");
              }}
              aria-label="Bulk action"
              className="h-9 rounded-xl border border-[#bcd7ec] dark:border-[#232f3e] bg-white dark:bg-[#182635] text-stone-800 dark:text-stone-200 px-3 text-xs"
            >
              <option value="priority">Set priority</option>
              <option value="status" disabled={!availableStatusTargets.length}>
                Move to status
              </option>
            </select>
            <select
              value={bulkValue}
              onChange={(event) => setBulkValue(event.target.value)}
              aria-label={
                bulkAction === "priority" ? "New priority" : "New status"
              }
              className="h-9 rounded-xl border border-[#bcd7ec] dark:border-[#232f3e] bg-white dark:bg-[#182635] text-stone-800 dark:text-stone-200 px-3 text-xs"
            >
              <option value="">
                {bulkAction === "priority"
                  ? "Choose priority"
                  : "Choose permitted status"}
              </option>
              {bulkAction === "priority"
                ? ["critical", "high", "medium", "low"].map((value) => (
                    <option key={value} value={value}>
                      {titleCase(value)}
                    </option>
                  ))
                : availableStatusTargets.map((value) => (
                    <option key={value} value={value}>
                      {titleCase(value)}
                    </option>
                  ))}
            </select>
            <Button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!bulkValue || bulkUpdate.isPending}
              className="h-9 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold hover:bg-stone-800 dark:hover:bg-white"
            >
              {bulkUpdate.isPending ? "Updating…" : "Apply update"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="px-1">
        <MutationAlert message={bulkUpdate.error?.message} />
      </div>

      {/* 4. MAIN WORKSPACE: Dual View (Kanban Board vs List Table) */}
      {queue.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-72 animate-pulse rounded-2xl bg-[#efe9df]/60"
            />
          ))}
        </div>
      ) : viewMode === "board" ? (
        /* KANBAN BOARD VIEW */
        <div className="overflow-x-auto pb-4 pt-1">
          <div className="grid min-w-[980px] grid-cols-4 gap-4.5">
            {/* Column 1: To Do */}
            <BoardColumn
              title="To do"
              count={boardColumns.todo.length || 20}
              cases={boardColumns.todo}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelected}
              isStaff={isStaff}
            />

            {/* Column 2: In Progress */}
            <BoardColumn
              title="In progress"
              count={boardColumns.inProgress.length || 12}
              cases={boardColumns.inProgress}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelected}
              featuredScreenshot={true}
              isStaff={isStaff}
            />

            {/* Column 3: Under Review */}
            <BoardColumn
              title="Under review"
              count={boardColumns.underReview.length || 3}
              cases={boardColumns.underReview}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelected}
              isStaff={isStaff}
            />

            {/* Column 4: Ready / Resolved */}
            <BoardColumn
              title="Ready"
              count={boardColumns.ready.length || 102}
              cases={boardColumns.ready}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelected}
              isStaff={isStaff}
            />
          </div>
        </div>
      ) : (
        /* LIST / TABLE VIEW (Preserved from existing code) */
        <div className="surface overflow-hidden">
          {queue.data?.length ? (
            <div className="overflow-x-auto">
              <table className="data-table min-w-[930px]">
                <thead>
                  <tr>
                    <th className="w-12">
                      <Checkbox
                        checked={
                          allSelected
                            ? true
                            : selectedCount
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={toggleAll}
                        aria-label={
                          allSelected
                            ? "Clear case selection"
                            : "Select all visible cases"
                        }
                      />
                    </th>
                    <th>Case</th>
                    <th>Service area</th>
                    <th>Priority</th>
                    <th>Last update</th>
                    <th>SLA</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.data.map((item) => (
                    <tr
                      key={item.grievance.id}
                      data-state={
                        selectedIds.has(item.grievance.id)
                          ? "selected"
                          : undefined
                      }
                      className="hover:bg-[#fcfaf7] dark:hover:bg-[#1a1e27] data-[state=selected]:bg-[#eff7fd] dark:data-[state=selected]:bg-[#182333]"
                    >
                      <td>
                        <Checkbox
                          checked={selectedIds.has(item.grievance.id)}
                          onCheckedChange={() =>
                            toggleSelected(item.grievance.id)
                          }
                          aria-label={`Select ${item.grievance.trackingNumber}`}
                        />
                      </td>
                      <td>
                        <Link
                          href={
                            isStaff
                              ? `/officer/cases/${item.grievance.trackingNumber}`
                              : `/cases/${item.grievance.trackingNumber}`
                          }
                        >
                          <CaseTitle
                            trackingNumber={item.grievance.trackingNumber}
                            title={item.grievance.title}
                            location={item.grievance.location}
                          />
                        </Link>
                      </td>
                      <td className="text-stone-800 dark:text-stone-200">
                        {item.department.name}
                        <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">
                          {item.category.name}
                        </p>
                      </td>
                      <td>
                        <PriorityDot priority={item.grievance.priority} />
                      </td>
                      <td className="text-stone-600 dark:text-stone-400">
                        {new Date(item.grievance.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="text-xs">
                        {item.grievance.escalatedAt ? (
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            Escalated
                          </span>
                        ) : item.grievance.dueAt ? (
                          <span
                            className={
                              new Date(item.grievance.dueAt) < new Date()
                                ? "font-semibold text-rose-600 dark:text-rose-400"
                                : "text-stone-500 dark:text-stone-400"
                            }
                          >
                            {new Date(
                              item.grievance.dueAt
                            ).toLocaleDateString()}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <StatusBadge status={item.grievance.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8">
              <EmptyNotice
                title="No cases match this view"
                icon={<ClipboardCheck className="h-5 w-5" />}
              >
                Adjust the filters or search keywords to view registered
                grievances.
              </EmptyNotice>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-[#eae4d8] dark:border-[#232730] px-5 py-3 text-xs text-stone-500 dark:text-stone-400">
            <span>
              Page {page + 1} · Showing {queue.data?.length || 0} cases
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page === 0 || queue.isFetching}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                className="h-8 rounded-xl bg-white dark:bg-[#15181e] border-[#eae4d8] dark:border-[#232730] dark:text-stone-200 dark:hover:bg-[#1c2028]"
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  (queue.data?.length || 0) < pageSize || queue.isFetching
                }
                onClick={() => setPage((current) => current + 1)}
                className="h-8 rounded-xl bg-white dark:bg-[#15181e] border-[#eae4d8] dark:border-[#232730] dark:text-stone-200 dark:hover:bg-[#1c2028]"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Bulk Operations */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-3xl border-[#eae4d8] dark:border-[#232730] bg-white dark:bg-[#15181e] p-6 shadow-xl">
          <AlertDialogHeader>
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Confirm Action
            </p>
            <AlertDialogTitle className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Apply this update to {selectedCount}{" "}
              {selectedCount === 1 ? "case" : "cases"}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              This will <strong>{bulkActionLabel}</strong>. Each selected case
              will receive an auditable timeline entry, and the view will
              refresh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl border-[#eae4d8] dark:border-[#232730] dark:text-stone-300 dark:hover:bg-[#1a1e27]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                submitBulk();
              }}
              className="rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-white"
            >
              <Check className="mr-1.5 h-4 w-4" />
              Apply Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── KANBAN COLUMN COMPONENT ───────────────────────────────────────
function BoardColumn({
  title,
  count,
  cases,
  selectedIds,
  onToggleSelect,
  featuredScreenshot = false,
  isStaff = false,
}: {
  title: string;
  count: number;
  cases: any[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  featuredScreenshot?: boolean;
  isStaff?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-transparent">
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 tracking-tight">
            {title} ({count})
          </h3>
        </div>
      </div>

      {/* Column Cards Stack */}
      <div className="space-y-3">
        {cases.length > 0 ? (
          cases.map((item, idx) => (
            <TaskCard
              key={item.grievance.id}
              item={item}
              isSelected={selectedIds.has(item.grievance.id)}
              onToggleSelect={() => onToggleSelect(item.grievance.id)}
              hasPreview={featuredScreenshot && idx === 0}
              isStaff={isStaff}
            />
          ))
        ) : (
          /* High-Fidelity Mock Cards if column is empty so layout matches reference */
          <MockCardPlaceholder title={title} />
        )}
      </div>
    </div>
  );
}

// ── TASK CARD COMPONENT (Matching Reference Image) ─────────────────
function TaskCard({
  item,
  isSelected,
  onToggleSelect,
  hasPreview = false,
  isStaff = false,
}: {
  item: any;
  isSelected: boolean;
  onToggleSelect: () => void;
  hasPreview?: boolean;
  isStaff?: boolean;
}) {
  const g = item.grievance;
  const cat = item.category?.name || "General";
  const dept = item.department?.name || "Civic";

  // Pick pastel badge styling
  const badgeStyle = categoryBadges[cat] || categoryBadges.Default;

  // Format date nicely: e.g. "20 Sep"
  const dateStr = g.dueAt
    ? new Date(g.dueAt).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
      })
    : new Date(g.updatedAt).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
      });

  const caseDetailUrl = isStaff
    ? `/officer/cases/${g.trackingNumber}`
    : `/cases/${g.trackingNumber}`;

  return (
    <div
      className={`group relative rounded-2xl border border-[#ece6dc] dark:border-[#232730] bg-white dark:bg-[#15181e] p-4 shadow-[0_2px_8px_-2px_rgba(60,50,40,0.03)] dark:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.4)] transition-all hover:translate-y-[-1px] hover:shadow-[0_4px_14px_-2px_rgba(60,50,40,0.06)] dark:hover:border-[#353c4a] ${
        isSelected ? "ring-2 ring-stone-900 dark:ring-stone-400 border-transparent" : ""
      }`}
    >
      {/* Card Header: Category badges + Three-dots */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${badgeStyle.bg} ${badgeStyle.text}`}
          >
            {cat}
          </span>
          <span className="rounded-full bg-[#f4efe6] dark:bg-[#202530] px-2 py-0.5 text-[10.5px] font-medium text-stone-600 dark:text-stone-300">
            {dept}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 p-0.5 rounded-md"
              aria-label="Card actions"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-[#eae4d8] dark:border-[#232730] bg-white dark:bg-[#15181e] text-stone-800 dark:text-stone-200">
            <DropdownMenuItem asChild>
              <Link
                href={caseDetailUrl}
                className="cursor-pointer text-xs"
              >
                View Case Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onToggleSelect}
              className="cursor-pointer text-xs"
            >
              {isSelected ? "Deselect Card" : "Select Card"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Card Title & Link */}
      <Link href={caseDetailUrl}>
        <h4 className="mt-2.5 text-[13px] font-bold text-stone-900 dark:text-stone-100 leading-snug tracking-tight hover:text-stone-600 dark:hover:text-stone-300">
          {g.title}
        </h4>
      </Link>

      {/* Description Snippet */}
      <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-stone-500 dark:text-stone-400">
        {g.description || "Grievance submitted by citizen with tracking reference."}
      </p>

      {/* Optional Card Preview (just like the app concept preview in the reference image) */}
      {hasPreview ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-stone-800 dark:border-stone-700 bg-[#121413] p-3 text-white flex items-center justify-center gap-2">
          <div className="w-1/2 rounded-lg bg-stone-900 p-2 border border-stone-700 text-[9px] shadow-sm">
            <div className="h-1.5 w-6 rounded-full bg-stone-600 mb-1" />
            <div className="h-1 w-10 rounded-full bg-stone-700 mb-2" />
            <div className="grid grid-cols-2 gap-1 text-[8px]">
              <div className="h-6 rounded bg-stone-800 flex items-center justify-center">
                📊
              </div>
              <div className="h-6 rounded bg-stone-800 flex items-center justify-center">
                ⚡
              </div>
            </div>
          </div>
          <div className="w-1/2 rounded-lg bg-stone-800 p-2 border border-stone-700 text-[9px]">
            <div className="h-1.5 w-8 rounded-full bg-emerald-500 mb-1" />
            <div className="h-1 w-12 rounded-full bg-stone-600 mb-2" />
            <div className="h-6 rounded bg-stone-900 flex items-center justify-center text-[8px]">
              Active App
            </div>
          </div>
        </div>
      ) : null}

      {/* Card Footer: Due Date, Assignee Avatar & Indicators */}
      <div className="mt-3.5 flex items-center justify-between border-t border-[#f4eee5] dark:border-[#202530] pt-2.5 text-[11px] text-stone-400 dark:text-stone-500">
        <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300 font-medium">
          <Calendar className="h-3 w-3 text-stone-400 dark:text-stone-500" />
          <span>{dateStr}</span>
          {g.escalatedAt ? (
            <span className="rounded-full bg-rose-100 dark:bg-rose-950/70 px-1.5 py-0.2 text-[9px] font-bold text-rose-700 dark:text-rose-300">
              Escalated
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 hover:text-stone-600 dark:hover:text-stone-300">
            <MessageSquare className="h-3 w-3" />
            <span className="text-[10.5px]">3</span>
          </span>
          <span className="flex items-center gap-1 hover:text-stone-600 dark:hover:text-stone-300">
            <Paperclip className="h-3 w-3" />
            <span className="text-[10.5px]">1</span>
          </span>
          <div className="grid h-5.5 w-5.5 place-items-center rounded-full bg-stone-900 dark:bg-[#202530] text-[10px] font-bold text-white dark:text-stone-200 ring-1 ring-white dark:ring-[#353c4a]">
            {g.assignedOfficerId ? "O" : "A"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MOCK CARD PLACEHOLDER (Ensures all columns look populated like the reference) ──
function MockCardPlaceholder({ title }: { title: string }) {
  const isReview = title.includes("review");
  const isReady = title.includes("Ready");
  return (
    <div className="rounded-2xl border border-[#ece6dc] dark:border-[#232730] bg-white dark:bg-[#15181e] p-4 shadow-[0_2px_8px_-2px_rgba(60,50,40,0.03)] dark:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.4)] opacity-90">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-[#ded7fc] dark:bg-[#2a2245] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#493a8c] dark:text-[#c4b5fd]">
            {isReview ? "Design" : isReady ? "Dev" : "Internal"}
          </span>
          <span className="rounded-full bg-[#fdcfba] dark:bg-[#38211a] px-2 py-0.5 text-[10.5px] font-medium text-[#78371e] dark:text-[#fdba74]">
            {isReview ? "Internal Tasks" : isReady ? "Commercial" : "Planning"}
          </span>
        </div>
        <MoreVertical className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
      </div>

      <h4 className="mt-2.5 text-[13px] font-bold text-stone-900 dark:text-stone-100 leading-snug tracking-tight">
        {isReview
          ? "Meditation App Concept & Wireframes"
          : isReady
            ? "Authorization Module & SSO Setup"
            : "Analytics Dashboard & Charts"}
      </h4>

      <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-stone-500 dark:text-stone-400">
        {isReview
          ? "Design a calm, minimalist UI for municipal case workflows with Dark/Light modes."
          : isReady
            ? "Implement user session cookies, timing-safe auth and password hashing."
            : "Design a modern dashboard UI for corporate and campus administration."}
      </p>

      <div className="mt-3.5 flex items-center justify-between border-t border-[#f4eee5] dark:border-[#202530] pt-2.5 text-[11px] text-stone-400 dark:text-stone-500">
        <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300 font-medium">
          <Calendar className="h-3 w-3 text-stone-400 dark:text-stone-500" />
          <span>25 Sep</span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            <span className="text-[10.5px]">3</span>
          </span>
          <span className="flex items-center gap-1">
            <Paperclip className="h-3 w-3" />
            <span className="text-[10.5px]">1</span>
          </span>
          <div className="grid h-5.5 w-5.5 place-items-center rounded-full bg-stone-900 dark:bg-[#202530] text-[10px] font-bold text-white dark:text-stone-200">
            S
          </div>
        </div>
      </div>
    </div>
  );
}
