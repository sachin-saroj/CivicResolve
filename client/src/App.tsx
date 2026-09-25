import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AdminGuard } from "@/components/AdminGuard";
import { Suspense, lazy, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";

const Home = lazy(() => import("@/pages/Home"));
const GrievanceForm = lazy(() => import("@/pages/GrievanceForm"));
const InternalLogin = lazy(() => import("@/pages/InternalLogin"));
const GrievanceDetail = lazy(() => import("@/pages/GrievanceDetail"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const OfficerGrievances = lazy(() => import("@/pages/OfficerGrievances"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminDepartments = lazy(() => import("@/pages/AdminDepartments"));
const AdminCategories = lazy(() => import("@/pages/AdminCategories"));
const AdminOfficers = lazy(() => import("@/pages/AdminOfficers"));
const AdminGrievances = lazy(() => import("@/pages/AdminGrievances"));
const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const PublicCaseDetail = lazy(() => import("@/pages/PublicCaseDetail"));
const PublicTracker = lazy(() => import("@/pages/PublicTracker"));

function CivicRouteLoader() {
  return (
    <div
      role="status"
      aria-label="Loading page content"
      className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center"
    >
      <div className="relative flex items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-stone-200 border-t-[#2563eb] dark:border-stone-800 dark:border-t-blue-400" />
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Loading...
      </p>
    </div>
  );
}

function Workspace({ component: Component, params }: { component: React.ComponentType<any>; params?: any }) {
  return (
    <DashboardLayout>
      <Suspense fallback={<CivicRouteLoader />}>
        <Component params={params} />
      </Suspense>
    </DashboardLayout>
  );
}

function AdminWorkspace({ component: Component }: { component: React.ComponentType }) {
  return (
    <DashboardLayout>
      <AdminGuard>
        <Suspense fallback={<CivicRouteLoader />}>
          <Component />
        </Suspense>
      </AdminGuard>
    </DashboardLayout>
  );
}

function TitleManager() {
  const [location] = useLocation();

  useEffect(() => {
    let title = "CivicResolve — Online Grievance Redressal System";
    if (location === "/") {
      title = "CivicResolve — Online Grievance Redressal System";
    } else if (location.startsWith("/track")) {
      title = "Public Case Tracker — CivicResolve";
    } else if (location === "/cases/new") {
      title = "File Grievance — CivicResolve";
    } else if (location.startsWith("/cases/")) {
      title = "Public Case Docket — CivicResolve";
    } else if (location === "/manage" || location === "/board") {
      title = "Officer Case Board — CivicResolve";
    } else if (location === "/staff/login") {
      title = "Staff Authentication — CivicResolve";
    } else if (location === "/admin") {
      title = "Executive Overview — CivicResolve";
    } else if (location === "/admin/departments") {
      title = "Department Branches — CivicResolve";
    } else if (location === "/admin/categories") {
      title = "Taxonomy & Categories — CivicResolve";
    } else if (location === "/admin/officers") {
      title = "Personnel Registry — CivicResolve";
    } else if (location === "/admin/cases") {
      title = "Master Case Docket — CivicResolve";
    } else if (location === "/admin/users") {
      title = "Access & User Directory — CivicResolve";
    } else if (location.startsWith("/officer/cases/") || location.startsWith("/grievances/")) {
      title = "Case Dossier & Investigation — CivicResolve";
    } else {
      title = "CivicResolve — Online Grievance Redressal System";
    }
    document.title = title;
  }, [location]);

  return null;
}

function Router() {
  return (
    <>
      <TitleManager />
      <Suspense fallback={<CivicRouteLoader />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/manage">{() => <Workspace component={OfficerGrievances} />}</Route>
          <Route path="/board">{() => <Workspace component={OfficerGrievances} />}</Route>
          <Route path="/track" component={PublicTracker} />
          <Route path="/track/:trackingNumber" component={PublicTracker} />
          <Route path="/staff/login" component={InternalLogin} />
          <Route path="/cases/new">{() => <Workspace component={GrievanceForm} />}</Route>
          <Route path="/cases/:trackingNumber">{(params) => <Workspace component={PublicCaseDetail} params={params} />}</Route>
          <Route path="/admin">{() => <AdminWorkspace component={AdminDashboard} />}</Route>
          <Route path="/admin/departments">{() => <AdminWorkspace component={AdminDepartments} />}</Route>
          <Route path="/admin/categories">{() => <AdminWorkspace component={AdminCategories} />}</Route>
          <Route path="/admin/officers">{() => <AdminWorkspace component={AdminOfficers} />}</Route>
          <Route path="/admin/cases">{() => <AdminWorkspace component={AdminGrievances} />}</Route>
          <Route path="/admin/users">{() => <AdminWorkspace component={AdminUsers} />}</Route>
          <Route path="/officer/cases/:trackingNumber">{(params) => <Workspace component={GrievanceDetail} params={params} />}</Route>
          <Route path="/grievances/:id">{(params) => <Workspace component={GrievanceDetail} params={params} />}</Route>
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
