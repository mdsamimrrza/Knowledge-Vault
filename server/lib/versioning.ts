import { ArticleVersion } from "@shared/schema";

/**
 * Pure function to create a new version object
 */
export function createVersionEntry(
  articleId: string,
  content: string,
  editedBy?: string,
  action: "CREATED" | "UPDATED" | "RESTORED" = "UPDATED"
) {
  return {
    articleId,
    content,
    editedBy,
    action,
    createdAt: new Date(),
  };
}

/**
 * Pure function to sort versions by newest first
 */
export function sortVersions(versions: any[]) {
  return [...versions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Pure function to handle version limit (keep last 50)
 */
export function applyVersionLimit(versions: any[], limit: number = 50) {
  const sorted = sortVersions(versions);
  return sorted.slice(0, limit);
}

/**
 * Logic to restore article content from a version
 */
export function getRestoredContent(version: { content: string }) {
  return version.content;
}
