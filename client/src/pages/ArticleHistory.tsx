import { useState, useMemo } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useArticle, useArticleVersions, useRestoreVersion } from "@/hooks/use-articles";
import { useUser } from "@/hooks/use-auth";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Clock, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/MarkdownContent";
import * as diff from "diff";

function formatActionLabel(action?: string) {
  if (action === "CREATED") return "Created";
  if (action === "RESTORED") return "Restored";
  return "Updated";
}

function DiffViewer({ oldText, newText }: { oldText: string; newText: string }) {
  const mergedMarkdown = useMemo(() => {
    const changes = diff.diffWordsWithSpace(oldText, newText);
    return changes.map(part => {
      if (part.added) {
        return `<ins>${part.value}</ins>`;
      }
      if (part.removed) {
        return `<del>${part.value}</del>`;
      }
      return part.value;
    }).join("");
  }, [oldText, newText]);
  
  return (
    <div className="p-4 bg-secondary/30 rounded-lg border border-border/50">
      <MarkdownContent content={mergedMarkdown} />
    </div>
  );
}

export default function ArticleHistory() {
  const [, params] = useRoute("/article/:id/versions");
  const [, setLocation] = useLocation();
  const id = params?.id || "";
  
  const { data: article } = useArticle(id);
  const { data: versions, isLoading, error } = useArticleVersions(id);
  const restoreMutation = useRestoreVersion();
  const { data: user } = useUser();
  const { toast } = useToast();

  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);

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

  if (error) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center px-4 pt-16 md:pt-0">
          <div className="max-w-lg rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <h2 className="text-xl font-semibold text-foreground">Failed to load version history</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The history request did not complete successfully. Try refreshing the page after saving another article update.
            </p>
          </div>
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
              Review changes and restore previous states for <span className="font-semibold text-foreground">{article?.title}</span>
            </p>
          </div>

          <div className="relative border-l-2 border-border ml-4 space-y-8 pb-10">
            {versions?.map((version, index) => {
              const isExpanded = expandedVersionId === version.id;
              // Compare with the version that came AFTER it in the list (which is older)
              const previousVersion = versions[index + 1];
              const oldContent = previousVersion?.content || "";
              
              return (
                <div key={version.id} className="relative pl-8 group">
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-background border-2 transition-all z-10",
                    index === 0 ? "border-primary bg-primary/20" : "border-muted-foreground group-hover:border-primary"
                  )} />
                  
                  <div className={cn(
                    "bg-card p-6 rounded-2xl border transition-all duration-300",
                    isExpanded ? "border-primary/50 shadow-lg shadow-primary/5" : "border-border shadow-sm hover:shadow-md"
                  )}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-foreground font-bold">
                          <Clock className="w-4 h-4 text-primary" />
                          {format(new Date(version.updatedAt), 'MMMM d, yyyy')}
                          <span className="text-muted-foreground font-normal">at {format(new Date(version.updatedAt), 'h:mm a')}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground/80">
                            {formatActionLabel(version.action)}
                          </span>
                          <span>by {version.editedByName || "Unknown user"}</span>
                        </div>
                        {index === 0 && (
                          <div className="flex items-center gap-2">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border border-primary/20">
                              Current Version
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={() => setExpandedVersionId(isExpanded ? null : version.id)}
                      >
                        {isExpanded ? (
                          <>Hide Changes <ChevronUp className="w-3.5 h-3.5" /></>
                        ) : (
                          <>View Changes <ChevronDown className="w-3.5 h-3.5" /></>
                        )}
                      </Button>
                    </div>
                    
                    {isExpanded ? (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <DiffViewer oldText={oldContent} newText={version.content} />
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground/70 bg-secondary/20 p-3 rounded-lg line-clamp-2 italic">
                        {version.content.substring(0, 150)}...
                      </div>
                    )}
                    
                    {(index !== 0 || isExpanded) && user && (
                      <div className="mt-6 pt-4 border-t border-border/50 flex justify-between items-center">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                          {isExpanded ? "Full Comparison View" : "Summary View"}
                        </div>
                        {index !== 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-2 bg-primary/5 text-primary hover:bg-primary/10 border border-primary/10 font-bold"
                            onClick={() => handleRestore(version.id)}
                            disabled={restoreMutation.isPending}
                          >
                            {restoringVersionId === version.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            Restore this version
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {(!versions || versions.length === 0) && (
              <div className="pl-8 text-muted-foreground italic bg-secondary/20 p-8 rounded-2xl border-2 border-dashed border-border">
                No history available for this article yet. Changes will appear here as you save updates.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
