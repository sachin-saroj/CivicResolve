import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import Home from "@/pages/Home";
import GrievanceForm from "@/pages/GrievanceForm";
import InternalLogin from "@/pages/InternalLogin";
import GrievanceDetail from "@/pages/GrievanceDetail";
import NotFound from "@/pages/NotFound";
import OfficerGrievances from "@/pages/OfficerGrievances";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminDepartments from "@/pages/AdminDepartments";
import AdminCategories from "@/pages/AdminCategories";
import AdminOfficers from "@/pages/AdminOfficers";
import AdminGrievances from "@/pages/AdminGrievances";
import AdminUsers from "@/pages/AdminUsers";
import PublicCaseDetail from "@/pages/PublicCaseDetail";
import PublicTracker from "@/pages/PublicTracker";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Route, Switch } from "wouter";

function Workspace({ component: Component }: { component: React.ComponentType }) { return <DashboardLayout><Component /></DashboardLayout>; }

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/manage">{() => <Workspace component={OfficerGrievances} />}</Route>
    <Route path="/board">{() => <Workspace component={OfficerGrievances} />}</Route>
    <Route path="/track" component={PublicTracker} />
    <Route path="/track/:trackingNumber" component={PublicTracker} />
    <Route path="/staff/login" component={InternalLogin} />
    <Route path="/cases/new">{() => <Workspace component={GrievanceForm} />}</Route>
    <Route path="/cases/:trackingNumber">{() => <Workspace component={PublicCaseDetail} />}</Route>
    <Route path="/admin">{() => <Workspace component={AdminDashboard} />}</Route>
    <Route path="/admin/departments">{() => <Workspace component={AdminDepartments} />}</Route>
    <Route path="/admin/categories">{() => <Workspace component={AdminCategories} />}</Route>
    <Route path="/admin/officers">{() => <Workspace component={AdminOfficers} />}</Route>
    <Route path="/admin/cases">{() => <Workspace component={AdminGrievances} />}</Route>
    <Route path="/admin/users">{() => <Workspace component={AdminUsers} />}</Route>
    <Route path="/officer/cases/:trackingNumber">{() => <Workspace component={GrievanceDetail} />}</Route>
    <Route path="/grievances/:id">{() => <Workspace component={GrievanceDetail} />}</Route>
    <Route component={NotFound} />
  </Switch>;
}

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><TooltipProvider><Toaster richColors /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
