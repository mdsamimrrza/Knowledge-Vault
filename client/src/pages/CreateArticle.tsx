import { useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateArticle } from "@/hooks/use-articles";
import { useUser } from "@/hooks/use-auth";
import { Sidebar } from "@/components/Sidebar";
import { ArticleEditor } from "@/components/ArticleEditor";
import { type InsertArticle } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function CreateArticle() {
  const [, setLocation] = useLocation();
  const createMutation = useCreateArticle();
  const { data: user, isLoading: authLoading } = useUser();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({ variant: "destructive", title: "Sign in required", description: "Please sign in to create articles." });
      setLocation("/auth");
    }
  }, [user, authLoading, setLocation, toast]);

  const handleSubmit = async (data: InsertArticle) => {
    const newArticle = await createMutation.mutateAsync(data);
    toast({
      title: "Success",
      description: "Article created successfully",
    });
    setLocation(`/article/${newArticle.id}`);
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 pt-16 pb-4 md:p-8 max-w-5xl mx-auto w-full min-h-full">
           <div className="mb-6">
             <h1 className="text-2xl font-display font-bold text-foreground">Create New Article</h1>
             <p className="text-muted-foreground text-sm">Draft a new piece of knowledge</p>
           </div>
           
           <div className="h-[calc(100vh-140px)]">
             <ArticleEditor 
               onSubmit={handleSubmit} 
               isSubmitting={createMutation.isPending}
               onCancel={() => setLocation("/")}
             />
           </div>
        </div>
      </main>
    </div>
  );
}
