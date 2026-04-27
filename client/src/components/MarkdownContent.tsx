import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import type { Components } from "react-markdown";
import { LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import rehypeRaw from "rehype-raw";

import { extractWikiLinkTitles, preProcessWikiLinks } from "@shared/wiki-links";

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
  const processed = useMemo(() => preProcessWikiLinks(content), [content]);

  const components: Components = useMemo(
    () => ({
      ins: ({ children }) => (
        <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-0.5 rounded font-bold">
          {children}
        </span>
      ),
      del: ({ children }) => (
        <span className="bg-rose-500/20 text-rose-700 dark:text-rose-400 line-through px-0.5 rounded opacity-70">
          {children}
        </span>
      ),
      a: ({ href, children, node, ...props }) => {
        // Handle wiki-link:// protocol
        if (href?.startsWith("wikilink://")) {
          const title = decodeURIComponent(href.replace("wikilink://", ""));
          const articleId = resolvedLinks?.[title];

          if (articleId) {
            // Existing article → styled blue link with manual navigation
            return (
              <a
                href={`/article/${articleId}`}
                className={cn(
                  "inline break-words text-primary font-medium cursor-pointer touch-manipulation",
                  "underline decoration-primary/30 underline-offset-2",
                  "hover:decoration-primary hover:text-primary/80 transition-colors"
                )}
              >
                {children}
                <LinkIcon className="ml-1 inline-block w-3 h-3 align-middle opacity-60" />
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
    [resolvedLinks]
  );

  return (
    <ReactMarkdown
      components={components}
      rehypePlugins={[rehypeRaw]}
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
