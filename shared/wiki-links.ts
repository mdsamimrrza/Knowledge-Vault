/** Extract all [[Title]] wiki-link titles from markdown content */
export function extractWikiLinkTitles(content: string): string[] {
  const matches = content.match(/\[\[([^\]]+)\]\]/g);
  if (!matches) return [];
  const titles = matches.map((m) => m.slice(2, -2).trim());
  // Filter out empty titles and dedupe
  return Array.from(new Set(titles.filter(t => t.length > 0)));
}

/** Pre-process markdown: replace [[Title]] with a placeholder link that ReactMarkdown can parse */
export function preProcessWikiLinks(content: string): string {
  return content.replace(
    /\[\[([^\]]+)\]\]/g,
    (_match, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return _match; // Keep as is if empty
      return `[${trimmed}](wikilink://${encodeURIComponent(trimmed)})`;
    }
  );
}
