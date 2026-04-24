import { useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import type { Components } from "react-markdown";
import { LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Extract all [[Title]] wiki-link titles from markdown content */
function extractWikiLinkTitles(content: string): string[] {
  const matches = content.match(/\[\[([^\]]+)\]\]/g);
  if (!matches) return [];
  const titles = matches.map(m => m.slice(2, -2).trim());
  return Array.from(new Set(titles)); // dedupe
}

/** Pre-process markdown: replace [[Title]] with a placeholder link that ReactMarkdown can parse */
function preProcessWikiLinks(content: string): string {
  return content.replace(
    /\[\[([^\]]+)\]\]/g,
    (_match, title: string) => `[${title.trim()}](wikilink://${encodeURIComponent(title.trim())})`
  );
}

/** Hook to batch-resolve wiki-link titles → article IDs */
function useResolveWikiLinks(content: string) {
  const titles = useMemo(() => extractWikiLinkTitles(content), [content]);

  return useQuery<Record<string, string | null>>({
    queryKey: [api.wikiLinks.resolve.path, titles],
    queryFn: async () => {
      if (titles.length === 0) return {};
      const res = await fetch(api.wikiLinks.resolve.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titles }),
        credentials: "include",
      });
      if (!res.ok) return {};
      return res.json();
    },
    enabled: titles.length > 0,
    staleTime: 60_000,
  });
}

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const { data: resolvedLinks } = useResolveWikiLinks(content);
  const [, navigate] = useLocation();
  const processed = useMemo(() => preProcessWikiLinks(content), [content]);

  const components: Components = useMemo(
    () => ({
      a: ({ href, children, node, ref, ...props }) => {
        // Handle wiki-link:// protocol
        if (href?.startsWith("wikilink://")) {
          const title = decodeURIComponent(href.replace("wikilink://", ""));
          const articleId = resolvedLinks?.[title];

          if (articleId) {
            // Existing article → styled blue link with manual navigation
            const handleClick = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/article/${articleId}`);
            };
            return (
              <a
                href={`/article/${articleId}`}
                onClick={handleClick}
                className={cn(
                  "inline-flex items-center gap-0.5 text-primary font-medium cursor-pointer",
                  "underline decoration-primary/30 underline-offset-2",
                  "hover:decoration-primary hover:text-primary/80 transition-colors"
                )}
              >
                <LinkIcon className="w-3 h-3 shrink-0 opacity-60" />
                {children}
              </a>
            );
          }

          // Article doesn't exist → red link (Wikipedia-style)
          return (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-destructive/70 font-medium cursor-help",
                "underline decoration-dashed decoration-destructive/30 underline-offset-2"
              )}
              title={`Article "${title}" does not exist yet`}
            >
              <LinkIcon className="w-3 h-3 shrink-0 opacity-50" />
              {children}
            </span>
          );
        }

        // Regular markdown links — open external links in new tab
        const isExternal = href?.startsWith("http://") || href?.startsWith("https://");
        return (
          <a
            href={href}
            {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {children}
          </a>
        );
      },
    }),
    [resolvedLinks, navigate]
  );

  return (
    <ReactMarkdown
      components={components}
      urlTransform={(url) => {
        // Allow our custom wikilink:// protocol through without sanitization
        if (url.startsWith("wikilink://")) return url;
        // Fall back to default sanitization for all other URLs
        return defaultUrlTransform(url);
      }}
    >
      {processed}
    </ReactMarkdown>
  );
}
