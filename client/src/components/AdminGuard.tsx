import React, { ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyNotice } from "@/components/CivicPrimitives";

interface AdminGuardProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

export function AdminGuard({
  children,
  fallbackTitle = "Administrator Access Required",
  fallbackDescription = "This executive workspace is reserved exclusively for system administrators.",
}: AdminGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2563eb] border-t-transparent" />
          <p className="text-xs font-medium text-[#71717a] dark:text-[#a1a1aa]">
            Verifying administrator authorization…
          </p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <EmptyNotice title={fallbackTitle}>
        <div className="space-y-3">
          <p>{fallbackDescription}</p>
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

  return <>{children}</>;
}
