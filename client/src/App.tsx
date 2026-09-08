import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import GrievanceForm from "@/pages/GrievanceForm";
import Home from "@/pages/Home";
import InternalLogin from "@/pages/InternalLogin";
import GrievanceDetail from "@/pages/GrievanceDetail";
import NotFound from "@/pages/NotFound";
import OfficerGrievances from "@/pages/OfficerGrievances";
import AdminDashboard from "@/pages/AdminDashboard";
import PublicCaseDetail from "@/pages/PublicCaseDetail";
import PublicTracker from "@/pages/PublicTracker";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Route, Switch } from "wouter";

function Workspace({ component: Component }: { component: React.ComponentType }) { return <DashboardLayout><Component /></DashboardLayout>; }

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/track" component={PublicTracker} />
    <Route path="/track/:trackingNumber" component={PublicTracker} />
    <Route path="/staff/login" component={InternalLogin} />
    <Route path="/cases/new">{() => <Workspace component={GrievanceForm} />}</Route>
    <Route path="/cases/:trackingNumber">{() => <Workspace component={PublicCaseDetail} />}</Route>
    <Route path="/manage">{() => <Workspace component={OfficerGrievances} />}</Route>
    <Route path="/admin">{() => <Workspace component={AdminDashboard} />}</Route>
    <Route path="/officer/cases/:trackingNumber">{() => <Workspace component={GrievanceDetail} />}</Route>
    <Route component={NotFound} />
  </Switch>;
}

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><TooltipProvider><Toaster richColors /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
