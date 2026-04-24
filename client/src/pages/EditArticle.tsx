import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useArticle, useUpdateArticle } from "@/hooks/use-articles";
import { useUser } from "@/hooks/use-auth";
import { Sidebar } from "@/components/Sidebar";
import { ArticleEditor } from "@/components/ArticleEditor";
import { type InsertArticle } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function EditArticle() {
  const [, params] = useRoute("/edit/:id");
  const [, setLocation] = useLocation();
  const id = params?.id || "";
  
  const { data: article, isLoading } = useArticle(id);
  const { data: user, isLoading: authLoading } = useUser();
  const updateMutation = useUpdateArticle();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({ variant: "destructive", title: "Sign in required", description: "Please sign in to edit articles." });
      setLocation("/auth");
    }
  }, [user, authLoading, setLocation, toast]);

  const handleSubmit = async (data: InsertArticle) => {
    await updateMutation.mutateAsync({ id, ...data });
    toast({
      title: "Success",
      description: "Article updated successfully",
    });
    setLocation(`/article/${id}`);
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;
  if (!article) return <div>Article not found</div>;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 pt-16 pb-4 md:p-8 max-w-5xl mx-auto w-full min-h-full">
           <div className="mb-6">
             <h1 className="text-2xl font-display font-bold text-foreground">Edit Article</h1>
             <p className="text-muted-foreground text-sm">Update your content</p>
           </div>
           
           <div className="h-[calc(100vh-140px)]">
             <ArticleEditor 
               initialData={article}
               onSubmit={handleSubmit} 
               isSubmitting={updateMutation.isPending}
               onCancel={() => setLocation(`/article/${id}`)}
             />
           </div>
        </div>
      </main>
    </div>
  );
}
