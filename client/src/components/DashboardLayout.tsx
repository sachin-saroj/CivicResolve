import { CivicMark } from "@/components/CivicPrimitives";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { ClipboardList, FilePlus2, LayoutDashboard, LogOut, Moon, ShieldCheck, Sun } from "lucide-react";
import { type ReactNode } from "react";
import { useLocation } from "wouter";

type NavigationItem = { label: string; path: string; icon: typeof LayoutDashboard };

const navigation: NavigationItem[] = [
  { label: "Track a case", path: "/track", icon: ClipboardList },
  { label: "Submit grievance", path: "/cases/new", icon: FilePlus2 },
  { label: "Case manager", path: "/manage", icon: LayoutDashboard },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const session = trpc.auth.me.useQuery();
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => setLocation("/staff/login") });
  const internalUser = session.data?.role === "officer" || session.data?.role === "admin" ? session.data : null;
  const visibleNavigation = internalUser?.role === "admin" ? [...navigation, { label: "Admin dashboard", path: "/admin", icon: LayoutDashboard }] : navigation;

  return <SidebarProvider>
    <Sidebar collapsible="icon" className="border-r border-slate-200 bg-[#fbfcfc]">
      <SidebarHeader className="h-[76px] px-4 pt-5"><CivicMark /></SidebarHeader>
      <SidebarContent className="px-3 py-4"><p className="micro-label px-2 pb-2">{internalUser ? "Staff service tools" : "Public service tools"}</p><SidebarMenu>{visibleNavigation.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path || (item.path !== "/track" && location.startsWith(`${item.path}/`))} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-10 rounded-xl px-3 text-[13px] font-medium text-slate-600 hover:bg-[#edf2f4] hover:text-[#121413] data-[active=true]:bg-[#121413] data-[active=true]:text-white"><item.icon className="h-4 w-4" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarContent>
      <SidebarFooter className="border-t border-slate-100 p-3">{internalUser ? <div className="space-y-2"><div className="flex items-center gap-2 px-2 py-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#dfeffc] text-[10px] font-bold text-[#245d8d]">{(internalUser.name || internalUser.email || "S").slice(0, 1).toUpperCase()}</span><span className="min-w-0 truncate text-xs font-semibold text-slate-600">{internalUser.name || internalUser.email}</span></div><button type="button" onClick={() => logout.mutate()} disabled={logout.isPending} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-xs font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"><LogOut className="h-3.5 w-3.5" />{logout.isPending ? "Signing out…" : "Sign out"}</button></div> : <div className="flex items-center gap-2 px-2 py-2 text-xs leading-5 text-slate-400"><ShieldCheck className="h-3.5 w-3.5 shrink-0" />Open access civic service</div>}</SidebarFooter>
    </Sidebar>
    <SidebarInset className="min-h-screen bg-[#f5f7f8]"><header className="sticky top-0 z-20 flex h-[76px] items-center border-b border-slate-200/80 bg-[#f5f7f8]/90 px-5 backdrop-blur sm:px-8"><div className="flex items-center gap-3"><SidebarTrigger className="rounded-xl bg-white shadow-sm md:hidden" /><span className="hidden text-xs font-medium uppercase tracking-[0.1em] text-slate-400 sm:inline">Civic Service Portal</span></div><div className="ml-auto flex items-center gap-2">{internalUser ? <span className="hidden rounded-full bg-[#e7f1fb] px-3 py-1.5 text-xs font-semibold text-[#39739e] sm:inline">{internalUser.role === "admin" ? "Administrator" : "Officer"}</span> : null}<span className="hidden text-xs text-slate-400 sm:inline">{theme === "dark" ? "Low-light mode" : "Light mode"}</span><button type="button" onClick={toggleTheme} className="theme-toggle rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button></div></header><main className="p-5 sm:p-8 lg:p-10">{children}</main></SidebarInset>
  </SidebarProvider>;
}
