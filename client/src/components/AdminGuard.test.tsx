// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { AdminGuard } from "./AdminGuard";

let mockAuth = {
  user: null as any,
  loading: false,
};

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => mockAuth,
}));

vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AdminGuard authorization boundary", () => {
  beforeEach(() => {
    cleanup();
    mockAuth = { user: null, loading: false };
  });

  afterEach(() => {
    cleanup();
  });

  it("blocks anonymous visitors and renders administrator access notice with staff login link", () => {
    mockAuth = { user: null, loading: false };

    render(
      <AdminGuard>
        <div data-testid="protected-admin-content">Secret Admin Console</div>
      </AdminGuard>
    );

    expect(screen.queryByTestId("protected-admin-content")).not.toBeInTheDocument();
    expect(screen.getByText("Administrator Access Required")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sign In to Staff Workspace/i })).toHaveAttribute("href", "/staff/login");
  });

  it("blocks non-admin authenticated users (e.g. officers) and renders administrator access notice", () => {
    mockAuth = { user: { id: 42, role: "officer", name: "Officer John" }, loading: false };

    render(
      <AdminGuard>
        <div data-testid="protected-admin-content">Secret Admin Console</div>
      </AdminGuard>
    );

    expect(screen.queryByTestId("protected-admin-content")).not.toBeInTheDocument();
    expect(screen.getByText("Administrator Access Required")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sign In to Staff Workspace/i })).toHaveAttribute("href", "/staff/login");
  });

  it("shows authorization loading spinner and hides protected content while auth state is resolving", () => {
    mockAuth = { user: null, loading: true };

    render(
      <AdminGuard>
        <div data-testid="protected-admin-content">Secret Admin Console</div>
      </AdminGuard>
    );

    expect(screen.queryByTestId("protected-admin-content")).not.toBeInTheDocument();
    expect(screen.getByText(/Verifying administrator authorization/i)).toBeInTheDocument();
  });

  it("allows authenticated administrators to access protected content", () => {
    mockAuth = { user: { id: 1, role: "admin", name: "Executive Admin" }, loading: false };

    render(
      <AdminGuard>
        <div data-testid="protected-admin-content">Secret Admin Console</div>
      </AdminGuard>
    );

    expect(screen.getByTestId("protected-admin-content")).toBeInTheDocument();
    expect(screen.queryByText("Administrator Access Required")).not.toBeInTheDocument();
  });
});
