import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertArticleSchema, type InsertArticle } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
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
import { Loader2, Save, X, Eye, Edit3, Globe, Lock } from "lucide-react";
import { MarkdownContent } from "@/components/MarkdownContent";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ArticleEditorProps {
  initialData?: InsertArticle;
  onSubmit: (data: InsertArticle) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

export function ArticleEditor({ initialData, onSubmit, isSubmitting, onCancel }: ArticleEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<InsertArticle>({
    resolver: zodResolver(insertArticleSchema),
    defaultValues: initialData || {
      title: "",
      content: "",
      tags: [],
      isPublic: false,
    },
  });

  const handleSubmit = async (data: InsertArticle) => {
    try {
      await onSubmit(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving article",
        description: error.message,
      });
    }
  };

  const currentContent = form.watch("content");
  const currentTitle = form.watch("title");

  // Warn on unsaved changes when navigating away
  const isDirty = form.formState.isDirty;
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Handle tag input as comma-separated string for simplicity in UI
  const [tagInput, setTagInput] = useState(initialData?.tags.join(", ") || "");

  useEffect(() => {
    const tags = tagInput.split(",").map(t => t.trim()).filter(Boolean);
    form.setValue("tags", tags);
  }, [tagInput, form]);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPreview(false)}
            className={cn(
              "gap-2",
              !isPreview && "bg-secondary text-primary font-medium"
            )}
          >
            <Edit3 className="w-4 h-4" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPreview(true)}
            className={cn(
              "gap-2",
              isPreview && "bg-secondary text-primary font-medium"
            )}
          >
            <Eye className="w-4 h-4" /> Preview
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {isDirty ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" disabled={isSubmitting}>Cancel</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You have unsaved changes that will be lost if you leave.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep editing</AlertDialogCancel>
                  <AlertDialogAction onClick={onCancel}>Discard</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          )}
          <Button onClick={form.handleSubmit(handleSubmit)} disabled={isSubmitting} className="min-w-[100px]">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col gap-6 h-full">
          <div className="grid gap-6">
             <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder="Article Title" 
                      {...field} 
                      className="text-2xl md:text-3xl font-display font-bold border-none px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 h-auto py-2"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex flex-col md:flex-row gap-4 md:items-end">
               <FormItem className="flex-1 w-full">
                 <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tags</FormLabel>
                 <FormControl>
                   <Input 
                     value={tagInput}
                     onChange={(e) => setTagInput(e.target.value)}
                     placeholder="technology, react, tutorial (comma separated)" 
                     className="bg-transparent"
                   />
                 </FormControl>
               </FormItem>

               <FormField
                 control={form.control}
                 name="isPublic"
                 render={({ field }) => (
                   <FormItem className="flex items-center gap-2 pb-2">
                     <FormControl>
                       <Switch checked={field.value} onCheckedChange={field.onChange} />
                     </FormControl>
                     <FormLabel className="!mt-0 flex items-center gap-1.5 text-sm cursor-pointer">
                       {field.value ? <Globe className="w-3.5 h-3.5 text-green-600" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                       {field.value ? "Public" : "Private"}
                     </FormLabel>
                   </FormItem>
                 )}
               />
            </div>
          </div>

          <div className="flex-1 min-h-[500px] border border-border rounded-xl overflow-hidden bg-card shadow-sm">
            {isPreview ? (
              <div className="p-8 prose-content overflow-y-auto h-full max-h-[70vh]">
                <MarkdownContent content={currentContent || "*No content yet*"} />
              </div>
            ) : (
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem className="h-full">
                    <FormControl>
                      <Textarea 
                        placeholder="Start writing your masterpiece in Markdown..." 
                        {...field} 
                        className="h-full resize-none border-none p-6 font-mono text-base focus-visible:ring-0 leading-relaxed"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
