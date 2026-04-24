import { Link } from "wouter";
import { format } from "date-fns";
import { Tag as TagIcon, Clock, ChevronRight, Star, Globe, Lock } from "lucide-react";
import { type Article } from "@shared/schema";
import { useToggleFavorite } from "@/hooks/use-articles";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

/** Strip markdown syntax to produce a clean plain-text preview */
function stripMarkdown(md: string): string {
  return md
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`([^`]*)`/g, '$1')
    // Remove images
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Remove wiki-style links [[text]]
    .replace(/\[\[(.*?)\]\]/g, '$1')
    // Remove links but keep text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Remove headings markers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic markers
    .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2')
    // Remove strikethrough
    .replace(/~~(.*?)~~/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove unordered list markers
    .replace(/^\s*[-+*]\s+/gm, '')
    // Remove ordered list markers
    .replace(/^\s*\d+\.\s+/gm, '')
    // Collapse multiple newlines
    .replace(/\n{2,}/g, ' ')
    // Replace single newlines with space
    .replace(/\n/g, ' ')
    // Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}

interface ArticleCardProps {
  article: Article;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const toggleFavorite = useToggleFavorite();
  const { data: user } = useUser();
  const { toast } = useToast();

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast({ variant: "destructive", title: "Sign in required", description: "Please sign in to favorite articles." });
      return;
    }
    toggleFavorite.mutate({ id: article.id, isFavorite: !!article.isFavorite });
  };

  return (
    <Link href={`/article/${article.id}`} className="group block">
      <div className="
        h-full bg-card p-6 rounded-2xl border border-border/50
        shadow-premium hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1.5
        hover:border-primary/40 transition-all duration-300 relative
      ">
        {/* Favorite button */}
        <button
          onClick={handleFavorite}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-secondary transition-colors z-10"
          aria-label={article.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star className={`w-4 h-4 transition-colors ${article.isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40 group-hover:text-muted-foreground"}`} />
        </button>

        <div className="flex flex-col h-full gap-4">
          <div className="space-y-2 pr-6">
            <h3 className="font-display font-bold text-xl text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {article.title}
            </h3>
            <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
              {(() => { const plain = stripMarkdown(article.content); return plain.length > 150 ? plain.slice(0, 150) + '…' : plain; })()}
            </p>
          </div>

          <div className="mt-auto pt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {format(new Date(article.updatedAt), 'MMM d, yyyy')}
              </span>
              {article.tags.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <TagIcon className="w-3.5 h-3.5" />
                  {article.tags[0]}
                  {article.tags.length > 1 && ` +${article.tags.length - 1}`}
                </span>
              )}
              <span className="flex items-center gap-1" title={article.isPublic ? "Public" : "Private"}>
                {article.isPublic ? <Globe className="w-3.5 h-3.5 text-green-600" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
              </span>
            </div>

            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-primary flex items-center font-medium">
              Read <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
