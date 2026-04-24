import { Link } from "wouter";
import { useTags } from "@/hooks/use-articles";
import { Sidebar } from "@/components/Sidebar";
import { Loader2, Tag as TagIcon, Hash } from "lucide-react";

export default function TagsPage() {
  const { data: tags, isLoading } = useTags();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 px-4 pt-16 pb-4 md:p-8 overflow-y-auto max-h-screen">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground">Tags</h2>
            <p className="text-muted-foreground mt-1">Browse articles by topic</p>
          </div>

          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p>Loading tags...</p>
            </div>
          ) : !tags || tags.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-4 border-2 border-dashed border-border rounded-2xl bg-secondary/20">
              <Hash className="w-8 h-8 opacity-20" />
              <p>No tags yet. Add tags to your articles to organize them.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {tags.map((t) => (
                <Link
                  key={t.tag}
                  href={`/?tag=${encodeURIComponent(t.tag)}`}
                  className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all"
                >
                  <TagIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="font-medium text-foreground">{t.tag}</span>
                  <span className="ml-1 text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {t.count}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
