import { CivicMark, PillButton } from "@/components/CivicPrimitives";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Moon, ShieldCheck, Sun, UserCheck } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function EditorialNavbar() {
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const session = trpc.auth.me.useQuery();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => setLocation("/staff/login"),
  });

  const isStaff = session.data?.role === "officer" || session.data?.role === "admin";

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Track Case", href: "/track" },
    { label: "Public Board", href: "/manage" },
    { label: "Submit Grievance", href: "/cases/new" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#e8eaed]/80 dark:border-[#1e232e] bg-[#fafcfe]/90 dark:bg-[#090a0d]/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Mark */}
        <CivicMark />

        {/* Center Desktop Links */}
        <nav className="hidden md:flex items-center gap-1 rounded-full bg-black/[0.03] dark:bg-white/[0.04] p-1 border border-black/[0.04] dark:border-white/[0.06]">
          {navLinks.map((link) => {
            const isActive = location === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-tight transition-all ${
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
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="grid h-9 w-9 place-items-center rounded-full border border-[#e4e4e7] dark:border-[#272f3d] bg-white dark:bg-[#12151b] text-[#52525b] dark:text-[#a1a1aa] shadow-2xs transition hover:bg-[#f4f4f6] dark:hover:bg-[#181d26] hover:text-[#0a0a0a] dark:hover:text-white"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-stone-600" />}
          </button>

          {isStaff ? (
            <div className="flex items-center gap-2">
              <Link
                href="/manage"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 px-3 py-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200"
              >
                <UserCheck className="h-3.5 w-3.5 text-[#2563eb]" />
                <span className="capitalize">{session.data?.role} Workspace</span>
              </Link>
              {session.data?.role === "admin" ? (
                <Link
                  href="/admin"
                  className="hidden md:inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                >
                  Analytics
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="text-xs font-medium text-[#71717a] hover:text-rose-600 px-2 py-1"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/staff/login"
                className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#71717a] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-white"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Staff Sign-in
              </Link>
              <Link href="/cases/new">
                <PillButton variant="blue" size="sm">
                  <span>File Case</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </PillButton>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
