// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

const progressMutate = vi.fn();
const detailInvalidate = vi.fn();
const trackingInvalidate = vi.fn();
let progressSuccess: (() => void) | undefined;
const record = { grievance: { id: 17, trackingNumber: "GRV-2026-00017", title: "Streetlight outage", location: "Maple Square", description: "A light is out", status: "in_progress", priority: "medium", assignedOfficerId: 21, createdAt: new Date(), updatedAt: new Date(), resolutionDetails: null }, citizen: { name: "Asha Citizen", email: "asha@example.org" }, department: { name: "Public Works" }, category: { name: "Street lighting" }, officer: { name: "Queue Officer" }, attachments: [], history: [], feedback: null };

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 21, role: "officer", departmentId: 3 } }) }));
vi.mock("wouter", () => ({ Link: ({ children }: any) => <div>{children}</div>, useRoute: (pattern: string) => pattern === "/officer/cases/:trackingNumber" ? [true, { trackingNumber: "GRV-2026-00017" }] : [false, undefined] }));
vi.mock("@/components/CivicPrimitives", () => ({ CaseTitle: ({ title }: any) => <h1>{title}</h1>, DetailLine: ({ label, children }: any) => <div><span>{label}</span>{children}</div>, EmptyNotice: ({ children }: any) => <div>{children}</div>, PageHeader: () => <div />, PriorityDot: () => <span />, StatusBadge: () => <span />, WorkflowStep: ({ label }: any) => <div>{label}</div>, pretty: (value: string) => value }));
vi.mock("@/components/MutationAlert", () => ({ MutationAlert: () => null }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: any) => <input {...props} /> }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children, ...props }: any) => <label {...props}>{children}</label> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (props: any) => <textarea {...props} /> }));
vi.mock("lucide-react", () => ({ ArrowLeft: () => <span />, CheckCircle2: () => <span />, Clock3: () => <span />, FileText: () => <span />, MapPin: () => <span />, MessageSquareText: () => <span />, Send: () => <span />, UserRound: () => <span /> }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ grievances: { detail: { invalidate: detailInvalidate }, detailByTracking: { invalidate: trackingInvalidate } } }), grievances: { detailByTracking: { useQuery: () => ({ data: record, isLoading: false, error: null }) }, detail: { useQuery: () => ({ data: undefined, isLoading: false, error: null }) } }, officer: { addProgress: { useMutation: (options: any) => { progressSuccess = options.onSuccess; return { mutate: progressMutate, isPending: false, error: null }; } }, updateCase: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) } }, citizen: { reopen: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, feedback: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } } }));

let GrievanceDetail: any;

describe("staff tracking-reference detail component", () => {
  beforeAll(async () => { GrievanceDetail = (await import("./GrievanceDetail")).default; });
  beforeEach(() => { progressMutate.mockReset(); detailInvalidate.mockReset(); trackingInvalidate.mockReset(); progressSuccess = undefined; });
  it("submits progress for the resolved case and refreshes the active tracking query", () => {
    render(<GrievanceDetail />);
    fireEvent.change(screen.getByLabelText("Progress note"), { target: { value: "Inspection scheduled" } });
    fireEvent.submit(screen.getByLabelText("Progress note").closest("form")!);
    expect(progressMutate).toHaveBeenCalledWith({ grievanceId: 17, remarks: "Inspection scheduled", actionTaken: undefined });
    progressSuccess?.();
    expect(detailInvalidate).toHaveBeenCalledWith({ grievanceId: 17 });
    expect(trackingInvalidate).toHaveBeenCalledWith({ trackingNumber: "GRV-2026-00017" });
  });
});
