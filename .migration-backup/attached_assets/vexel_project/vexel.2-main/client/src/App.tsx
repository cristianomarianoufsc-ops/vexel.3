import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import SocialMedia from "./pages/SocialMedia";
import Calendar from "./pages/Calendar";
import Ideas from "./pages/Ideas";
import Assets from "./pages/Assets";
import Tasks from "./pages/Tasks";
import Settings from "./pages/Settings";
import Lore from "./pages/Lore";
import Templates from "./pages/Templates";
import Migrate from "./pages/Migrate";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/social-media"} component={SocialMedia} />
      <Route path={"/calendar"} component={Calendar} />
      <Route path={"/ideas"} component={Ideas} />
      <Route path={"/assets"} component={Assets} />
      <Route path={"/tasks"} component={Tasks} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/lore"} component={Lore} />
      <Route path={"/templates"} component={Templates} />
      <Route path={"/migrate"} component={Migrate} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
