import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Pages
import Home from "@/pages/Home";
import ArticleView from "@/pages/ArticleView";
import CreateArticle from "@/pages/CreateArticle";
import EditArticle from "@/pages/EditArticle";
import ArticleHistory from "@/pages/ArticleHistory";
import TagsPage from "@/pages/TagsPage";
import AuthPage from "@/pages/AuthPage";
import AdminPage from "@/pages/AdminPage";

function Router() {
  const [location] = useLocation();
  return (
    <Switch location={location}>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/new" component={CreateArticle} />
      <Route path="/article/:id">{(params) => <ArticleView key={params.id} />}</Route>
      <Route path="/edit/:id" component={EditArticle} />
      <Route path="/article/:id/versions" component={ArticleHistory} />
      
      <Route path="/favorites" component={Home} />
      <Route path="/tags" component={TagsPage} />
      <Route path="/admin" component={AdminPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
