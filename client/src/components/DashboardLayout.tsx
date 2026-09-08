import { CivicMark } from "@/components/CivicPrimitives";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  Building2,
  CheckSquare,
  FilePlus2,
  FolderKanban,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Zap,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";

type NavigationItem = {
  label: string;
  path: string;
  icon: typeof LayoutGrid;
};

const defaultNav: NavigationItem[] = [
  { label: "Dashboard & Board", path: "/", icon: FolderKanban },
  { label: "Executive Analytics", path: "/admin", icon: LayoutGrid },
  { label: "Track a Case", path: "/track", icon: Activity },
  { label: "Submit Case", path: "/cases/new", icon: FilePlus2 },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const session = trpc.auth.me.useQuery();
  const catalog = trpc.public.catalog.useQuery();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => setLocation("/staff/login"),
  });

  const internalUser =
    session.data?.role === "officer" || session.data?.role === "admin"
      ? session.data
      : null;

  // Filter navigation depending on user role
  const navigationItems = internalUser
    ? defaultNav
    : [
        { label: "Dashboard & Board", path: "/", icon: LayoutGrid },
        { label: "Track a Case", path: "/track", icon: Activity },
        { label: "Submit Grievance", path: "/cases/new", icon: FilePlus2 },
        { label: "Staff Sign-in", path: "/staff/login", icon: ShieldCheck },
      ];

  const departments = catalog.data?.departments || [
    { id: 1, name: "Public Works" },
    { id: 2, name: "Electrical & Power" },
    { id: 3, name: "Campus Sanitation" },
    { id: 4, name: "Student Welfare" },
  ];

  const officers = [
    {
      name: "Asha Sharma",
      status: "3 active cases",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      online: true,
    },
    {
      name: "Rajesh Varma",
      status: "5 active cases",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      online: true,
    },
    {
      name: "Kacie Velasquez",
      status: "12:05 active today",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
      online: false,
    },
  ];

  return (
    <SidebarProvider>
      <Sidebar
        collapsible="icon"
        className="border-r border-[#ece6dc] bg-white font-sans text-stone-800"
      >
        <SidebarHeader className="h-18 px-5 pt-5 pb-2">
          <CivicMark />
        </SidebarHeader>

        <SidebarContent className="px-3 py-2 space-y-6">
          {/* Main Navigation */}
          <div>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => {
                const isActive =
                  location === item.path ||
                  (item.path !== "/" && location.startsWith(`${item.path}/`));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-9.5 rounded-xl px-3 text-[13px] font-medium text-stone-600 transition-all hover:bg-[#f6f2ea] hover:text-stone-900 data-[active=true]:bg-stone-900 data-[active=true]:text-white data-[active=true]:font-semibold data-[active=true]:shadow-sm"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </div>

          {/* Projects / Departments Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between px-3 pb-2">
              <span className="text-xs font-semibold tracking-tight text-stone-500">
                Departments
              </span>
              <button
                type="button"
                onClick={() => setLocation("/manage")}
                className="grid h-4.5 w-4.5 place-items-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                title="View departments"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-0.5">
              {departments.slice(0, 4).map((dept, idx) => {
                const icons = [Building2, Zap, Sparkles, FolderKanban];
                const IconComponent = icons[idx % icons.length];
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => setLocation("/manage")}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left text-[12.5px] font-medium text-stone-600 transition hover:bg-[#f6f2ea] hover:text-stone-900"
                  >
                    <IconComponent className="h-3.5 w-3.5 text-stone-400" />
                    <span className="truncate">{dept.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Members / Officers Section */}
          <div className="pt-1">
            <div className="flex items-center justify-between px-3 pb-2">
              <span className="text-xs font-semibold tracking-tight text-stone-500">
                Active Staff
              </span>
              <button
                type="button"
                onClick={() => setLocation("/manage")}
                className="grid h-4.5 w-4.5 place-items-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                title="All members"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2 px-1">
              {officers.map((officer) => (
                <div
                  key={officer.name}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1 transition hover:bg-[#f6f2ea]"
                >
                  <div className="relative shrink-0">
                    <img
                      src={officer.avatar}
                      alt={officer.name}
                      className="h-7 w-7 rounded-full object-cover ring-1 ring-stone-200"
                    />
                    {officer.online ? (
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-stone-800">
                      {officer.name}
                    </p>
                    <p className="truncate text-[10px] text-stone-400">
                      {officer.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SidebarContent>

        <SidebarFooter className="border-t border-[#ece6dc] p-3">
          {internalUser ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 px-2 py-1.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-stone-900 text-[11px] font-bold text-white">
                  {(internalUser.name || internalUser.email || "S")
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-stone-800">
                    {internalUser.name || internalUser.email}
                  </p>
                  <p className="truncate text-[10px] uppercase tracking-wider text-stone-400 font-bold">
                    {internalUser.role}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium text-stone-500 transition hover:bg-rose-50 hover:text-rose-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{logout.isPending ? "Signing out…" : "Log out"}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-2 py-1 text-xs text-stone-500">
              <Link
                href="/staff/login"
                className="flex items-center gap-1.5 text-stone-600 hover:text-stone-900 font-medium"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-stone-400" />
                <span>Staff Sign-in</span>
              </Link>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-screen bg-[#f6f3ec]">
        {/* Minimal Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#eae4d8]/80 bg-[#f6f3ec]/90 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="rounded-xl border border-[#eae4d8] bg-white text-stone-700 shadow-sm md:hidden" />
            <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
              <span className="hidden sm:inline">CivicResolve</span>
              <span className="hidden sm:inline text-stone-300">/</span>
              <span className="font-semibold text-stone-800">
                {location === "/" || location === "/manage"
                  ? "Publications & Cases"
                  : location === "/admin"
                    ? "Executive Analytics"
                    : location === "/cases/new"
                      ? "Submit Grievance"
                      : location.startsWith("/track")
                        ? "Case Tracking"
                        : location.startsWith("/cases/") ||
                          location.startsWith("/officer/cases/")
                          ? "Case Details"
                          : "Workspace"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {internalUser ? (
              <span className="hidden rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 sm:inline shadow-2xs">
                {internalUser.role === "admin" ? "Administrator" : "Officer"}
              </span>
            ) : null}
            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle rounded-xl border border-[#eae4d8] bg-white p-2 text-stone-600 shadow-2xs hover:bg-[#f6f2ea]"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
