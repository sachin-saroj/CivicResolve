// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

const feedbackMutate = vi.fn();
let feedbackSuccess: (() => void) | undefined;
const resolvedRecord = { grievance: { trackingNumber: "GRV-2026-00008", title: "Resolved case", location: "Maple Square", description: "Resolved issue details", status: "resolved", priority: "medium", createdAt: new Date(), updatedAt: new Date(), resolutionDetails: "Fixed" }, department: { name: "Public Works" }, category: { name: "Street lighting" }, attachments: [], history: [], feedback: null };

vi.mock("wouter", () => ({ Link: ({ children }: any) => <div>{children}</div>, useRoute: () => [true, { trackingNumber: "GRV-2026-00008" }] }));
vi.mock("@/components/CivicPrimitives", () => ({ CaseTitle: ({ title }: any) => <h1>{title}</h1>, DetailLine: ({ label, children }: any) => <div><span>{label}</span>{children}</div>, EmptyNotice: ({ children }: any) => <div>{children}</div>, PageHeader: ({ title }: any) => <h2>{title}</h2>, PriorityDot: () => <span />, StatusBadge: () => <span />, WorkflowStep: ({ label }: any) => <div>{label}</div>, MetricCard: ({ label, value }: any) => <div data-testid={`metric-${label}`}>{label}:{value}</div>, pretty: (value: string) => value }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: any) => <textarea {...props} /> }));
vi.mock("lucide-react", () => ({ ArrowLeft: () => <span />, CheckCircle2: () => <span />, Clock3: () => <span />, FileText: () => <span />, MapPin: () => <span />, MessageSquareText: () => <span />, ShieldCheck: () => <span />, Activity: () => <span />, Building2: () => <span />, ClipboardList: () => <span />, UsersRound: () => <span /> }));
vi.mock("recharts", () => ({ Bar: () => <span />, BarChart: ({ children }: any) => <div>{children}</div>, Cell: () => <span />, Pie: () => <span />, PieChart: ({ children }: any) => <div>{children}</div>, ResponsiveContainer: ({ children }: any) => <div>{children}</div>, Tooltip: () => <span />, XAxis: () => <span />, YAxis: () => <span /> }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 99, role: "admin" } }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { portal: { detail: { useQuery: () => ({ data: resolvedRecord, isLoading: false, error: null, refetch: vi.fn() }) }, feedback: { useMutation: (options: any) => { feedbackSuccess = options.onSuccess; return { mutate: feedbackMutate, isPending: false }; } } }, admin: { dashboard: { useQuery: () => ({ data: { total: 8, openTotal: 5, statusCounts: [], byDepartment: [], byCategory: [{ label: "Street lighting", total: 3 }], workload: [], feedback: { responses: 2, averageRating: 4.5 }, sla: { overdue: 1, escalated: 2 }, averageResolutionHours: 18 }, isLoading: false }) } } } }));

let PublicCaseDetail: any;
let AdminDashboard: any;

describe("Phase 2 analytics components", () => {
  beforeAll(async () => { PublicCaseDetail = (await import("./PublicCaseDetail")).default; AdminDashboard = (await import("./AdminDashboard")).default; });
  beforeEach(() => { feedbackMutate.mockReset(); feedbackSuccess = undefined; });

  it("submits public feedback by tracking reference and displays the received state", () => {
    render(<PublicCaseDetail />);
    fireEvent.submit(screen.getByLabelText("Feedback comment").closest("form")!);
    expect(feedbackMutate).toHaveBeenCalledWith({ trackingNumber: "GRV-2026-00008", rating: 5, comment: undefined });
    expect(feedbackSuccess).toBeTypeOf("function");
    expect(screen.getByText("How did we do?")).toBeInTheDocument();
  });

  it("renders open, feedback, and category analytics for administrators", () => {
    render(<AdminDashboard />);
    expect(screen.getByTestId("metric-Open cases")).toHaveTextContent("Open cases:5");
    expect(screen.getByText("Category volume")).toBeInTheDocument();
    expect(screen.getByText("What citizens are reporting")).toBeInTheDocument();
  });
});
