import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useArticle, useArticleVersions, useRestoreVersion } from "@/hooks/use-articles";
import { useUser } from "@/hooks/use-auth";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Clock, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { MarkdownContent } from "@/components/MarkdownContent";

export default function ArticleHistory() {
  const [, params] = useRoute("/article/:id/versions");
  const [, setLocation] = useLocation();
  const id = params?.id || "";
  
  const { data: article } = useArticle(id);
  const { data: versions, isLoading } = useArticleVersions(id);
  const restoreMutation = useRestoreVersion();
  const { data: user } = useUser();
  const { toast } = useToast();

  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);

  const handleRestore = async (versionId: string) => {
    setRestoringVersionId(versionId);
    try {
      await restoreMutation.mutateAsync({ articleId: id, versionId });
      toast({ title: "Version restored", description: "The article has been restored to the selected version." });
      setLocation(`/article/${id}`);
    } catch {
      toast({ variant: "destructive", title: "Failed to restore version" });
    } finally {
      setRestoringVersionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center pt-16 md:pt-0">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 px-4 pt-16 pb-4 md:p-12 overflow-y-auto h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link href={`/article/${id}`}>
              <Button variant="ghost" className="gap-2 pl-0 mb-4 text-muted-foreground hover:text-primary">
                <ArrowLeft className="w-4 h-4" /> Back to Article
              </Button>
            </Link>
            
            <h1 className="text-3xl font-display font-bold text-foreground">
              Version History
            </h1>
            <p className="text-muted-foreground mt-2">
              History for <span className="font-semibold text-foreground">{article?.title}</span>
            </p>
          </div>

          <div className="relative border-l-2 border-border ml-4 space-y-8 pb-10">
            {versions?.map((version, index) => (
              <div key={version.id} className="relative pl-8 group">
                {/* Timeline dot */}
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-background border-2 border-muted-foreground group-hover:border-primary group-hover:scale-110 transition-all" />
                
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm group-hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                      <Clock className="w-4 h-4" />
                      {format(new Date(version.updatedAt), 'MMM d, yyyy @ h:mm a')}
                    </div>
                    {index === 0 && (
                      <span className="bg-primary/15 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border border-primary/20">
                        Current
                      </span>
                    )}
                  </div>
                  
                  <div className="prose-content text-sm max-h-32 overflow-hidden relative bg-secondary/30 p-4 rounded-lg">
                    <MarkdownContent content={version.content.slice(0, 500)} />
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-secondary/80 to-transparent" />
                  </div>
                  
                  {index !== 0 && user && (
                    <div className="mt-4 pt-4 border-t border-border/50 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleRestore(version.id)}
                        disabled={restoreMutation.isPending}
                      >
                        {restoringVersionId === version.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        Restore this version
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {(!versions || versions.length === 0) && (
              <div className="pl-8 text-muted-foreground italic">No history available for this article yet.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
