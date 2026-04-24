import { useState, useEffect } from "react";
import { useArticles } from "@/hooks/use-articles";
import { useUser } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";
import { Sidebar } from "@/components/Sidebar";
import { ArticleCard } from "@/components/ArticleCard";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Frown, Plus } from "lucide-react";
import { useRoute, useLocation, Link } from "wouter";

export default function Home() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [, setLocation] = useLocation();
  
  // Detect if we're on /favorites route
  const [isFavoritesPage] = useRoute("/favorites");
  const { data: user, isLoading: authLoading } = useUser();

  // Read tag filter from URL query string
  const urlParams = new URLSearchParams(window.location.search);
  const tagFilter = urlParams.get("tag") || undefined;

  // Redirect to auth if on /favorites without login
  useEffect(() => {
    if (isFavoritesPage && !authLoading && !user) {
      setLocation("/auth");
    }
  }, [isFavoritesPage, authLoading, user, setLocation]);
  
  const { data: articles, isLoading, error } = useArticles({
    page: 1,
    limit: 50,
    q: debouncedSearch,
    tag: tagFilter,
    ...(isFavoritesPage ? { favorite: "true" } : {}),
  });

  const pageTitle = tagFilter
    ? `Tag: ${tagFilter}`
    : isFavoritesPage ? "Favorites" : "Library";
  const pageDescription = tagFilter
    ? `Articles tagged with "${tagFilter}"`
    : isFavoritesPage
      ? "Your bookmarked articles"
      : "Manage your personal knowledge base";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 px-4 pt-16 pb-4 md:p-8 overflow-y-auto max-h-screen">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-display font-bold text-foreground">{pageTitle}</h2>
              <p className="text-muted-foreground mt-1">{pageDescription}</p>
            </div>

            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search articles..."
                className="pl-10 bg-white/40 dark:bg-white/10 backdrop-blur-md border border-white/60 dark:border-white/10 focus:border-primary/50 transition-all shadow-premium rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p>Loading your knowledge...</p>
            </div>
          ) : error ? (
             <div className="h-64 flex flex-col items-center justify-center text-destructive gap-4 bg-destructive/5 rounded-2xl border border-destructive/20">
              <Frown className="w-8 h-8" />
              <p>Failed to load articles. Please try again.</p>
            </div>
          ) : articles?.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-4 border-2 border-dashed border-border rounded-2xl bg-secondary/20">
              <Search className="w-8 h-8 opacity-20" />
              <p>{isFavoritesPage ? "No favorite articles yet. Star some articles to see them here." : "No articles found matching your criteria."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles?.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>

        {/* Mobile Floating Action Button (Lower z-index to stay behind sidebar) */}
        {user && (
          <Link href="/new">
            <button className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center z-30 hover:scale-110 active:scale-95 transition-all">
              <Plus className="w-6 h-6" />
            </button>
          </Link>
        )}
      </main>
    </div>
  );
}
