import { CivicMark, PillButton } from "@/components/CivicPrimitives";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Menu, Moon, ShieldCheck, Sun, UserCheck, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function EditorialNavbar() {
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const session = trpc.auth.me.useQuery();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      setMobileOpen(false);
      setLocation("/staff/login");
    },
  });

  const isStaff = session.data?.role === "officer" || session.data?.role === "admin";
  const isAdmin = session.data?.role === "admin";

  const publicNavLinks = [
    { label: "Home", href: "/" },
    { label: "Track Case", href: "/track" },
    { label: "Submit Grievance", href: "/cases/new" },
    { label: "Help & Standards", href: "/#standards" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#e8eaed] dark:border-[#1e232e] bg-[#fafcfe]/95 dark:bg-[#090a0d]/95 backdrop-blur-xs transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Mark */}
        <CivicMark />

        {/* Center Desktop Links */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex items-center gap-0.5 lg:gap-1 rounded-full bg-black/[0.03] dark:bg-white/[0.04] p-1 border border-black/[0.04] dark:border-white/[0.06] shrink-0"
        >
          {publicNavLinks.map((link) => {
            const isActive = location === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-2.5 lg:px-4 py-1.5 text-xs font-semibold tracking-tight transition-all shrink-0 ${
                  isActive
                    ? "bg-white dark:bg-[#181d26] text-[#0a0a0a] dark:text-white shadow-xs"
                    : "text-[#52525b] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 lg:gap-3 shrink-0">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#e4e4e7] dark:border-[#272f3d] bg-white dark:bg-[#12151b] text-[#52525b] dark:text-[#a1a1aa] shadow-2xs transition hover:bg-[#f4f4f6] dark:hover:bg-[#181d26] hover:text-[#0a0a0a] dark:hover:text-white"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-stone-600" />}
          </button>

          {/* Authenticated Staff Links */}
          {isStaff ? (
            <div className="hidden sm:flex items-center gap-1.5 lg:gap-2">
              <Link
                href="/manage"
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 px-3 py-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 transition hover:bg-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
              >
                <UserCheck className="h-3.5 w-3.5 text-[#2563eb]" />
                <span className="capitalize">{session.data?.role} Workspace</span>
              </Link>
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="inline-flex items-center rounded-full px-2.5 lg:px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white shrink-0"
                >
                  Analytics
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="text-xs font-medium text-[#71717a] hover:text-rose-600 px-2 py-1 shrink-0"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 lg:gap-3">
              <Link
                href="/staff/login"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#71717a] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-white shrink-0 whitespace-nowrap"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">Staff Sign-in</span>
                <span className="xl:hidden">Staff</span>
              </Link>
              <Link href="/cases/new" className="shrink-0">
                <PillButton variant="blue" size="sm" className="whitespace-nowrap">
                  <span>File Grievance</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 hidden sm:inline" />
                </PillButton>
              </Link>
            </div>
          )}

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="grid h-9 w-9 place-items-center rounded-full border border-[#e4e4e7] dark:border-[#272f3d] bg-white dark:bg-[#12151b] text-[#52525b] dark:text-[#a1a1aa] md:hidden shadow-2xs"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileOpen && (
        <div className="border-b border-[#e8eaed] dark:border-[#1e232e] bg-[#fafcfe] dark:bg-[#090a0d] px-5 py-4 md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-2">
            {publicNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[#0a0a0a] dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                {link.label}
              </Link>
            ))}

            <div className="my-2 border-t border-neutral-200 dark:border-neutral-800" />

            {isStaff ? (
              <div className="flex flex-col gap-2">
                <Link
                  href="/manage"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-[#2563eb] hover:bg-blue-50 dark:hover:bg-blue-950/40"
                >
                  Go to {session.data?.role} Workspace
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-3 py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  >
                    Executive Analytics
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => logout.mutate()}
                  className="text-left rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  href="/staff/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                >
                  Staff Sign-in
                </Link>
                <Link
                  href="/cases/new"
                  onClick={() => setMobileOpen(false)}
                  className="mt-1"
                >
                  <PillButton variant="blue" size="md" className="w-full justify-center">
                    <span>File Grievance</span>
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </PillButton>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
