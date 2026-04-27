import { Link, useRoute, useLocation } from "wouter";
import { useArticle, useDeleteArticle, useToggleFavorite } from "@/hooks/use-articles";
import { useUser } from "@/hooks/use-auth";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, ArrowLeft, Calendar, Tag, Edit, Trash2, History, Star, Globe, Lock } from "lucide-react";
import { MarkdownContent } from "@/components/MarkdownContent";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function ArticleView() {
  const [, params] = useRoute("/article/:id");
  const [, setLocation] = useLocation();
  const id = params?.id || "";

  const { data: article, isLoading, error } = useArticle(id);
  const deleteMutation = useDeleteArticle();
  const toggleFavorite = useToggleFavorite();
  const { data: user } = useUser();
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Article deleted" });
      setLocation("/");
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to delete" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center pt-16 md:pt-0">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 pt-16 md:pt-0">
          <h2 className="text-xl font-semibold">Article not found</h2>
          <Link href="/">
            <Button variant="outline">Back to Library</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-background">
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-x-hidden px-4 pt-16 pb-4 md:max-h-screen md:overflow-y-auto md:p-12">
        <div className="mx-auto max-w-4xl min-w-0">
          {/* Header Navigation */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/">
              <Button variant="ghost" className="gap-2 pl-0 hover:pl-2 transition-all text-muted-foreground hover:text-primary">
                <ArrowLeft className="w-4 h-4" /> Back to Library
              </Button>
            </Link>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 rounded-lg hover:bg-primary/5 hover:text-primary transition-all font-semibold"
                  onClick={() => toggleFavorite.mutate({ id, isFavorite: !!article.isFavorite })}
                >
                  <Star className={`w-4 h-4 ${article.isFavorite ? "fill-accent text-accent" : ""}`} />
                  {article.isFavorite ? "Favorited" : "Favorite"}
                </Button>
              )}
              <Link href={`/article/${id}/versions`}>
                <Button variant="ghost" size="sm" className="gap-2 rounded-lg hover:bg-primary/5 hover:text-primary transition-all font-semibold">
                  <History className="w-4 h-4" /> History
                </Button>
              </Link>
              {user && (
                <>
                  <Link href={`/edit/${id}`}>
                    <Button variant="outline" size="sm" className="gap-2 rounded-lg border-primary/20 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all font-semibold">
                      <Edit className="w-4 h-4" /> Edit
                    </Button>
                  </Link>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-card">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this article?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the article
                          "{article.title}" and remove it from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 rounded-lg">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>

          {/* Article Header */}
          <header className="mb-10 pb-8 border-b border-border/50">
            <div className="flex flex-wrap gap-3 mb-6">
              {article.tags.map(tag => (
                <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium flex items-center gap-1">
                  <Tag className="w-3 h-3 opacity-50" /> {tag}
                </span>
              ))}
            </div>

            <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-6 leading-tight">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground font-medium">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Updated {format(new Date(article.updatedAt), 'MMMM d, yyyy')}
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
              <span>Created {format(new Date(article.createdAt), 'MMM d, yyyy')}</span>
              <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
              <span className="flex items-center gap-1.5">
                {article.isPublic ? (
                  <><Globe className="w-3.5 h-3.5 text-green-600" /> Public</>
                ) : (
                  <><Lock className="w-3.5 h-3.5" /> Private</>
                )}
              </span>
            </div>
          </header>

          {/* Article Content */}
          <article className="prose-content min-h-[400px] min-w-0 overflow-x-hidden break-words">
            <MarkdownContent content={article.content} />
          </article>
        </div>
      </main>
    </div>
  );
}
