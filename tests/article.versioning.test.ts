import { describe, it, expect } from "vitest";
import { 
  createVersionEntry, 
  sortVersions, 
  applyVersionLimit, 
  getRestoredContent 
} from "../server/lib/versioning";

describe("Article Versioning", () => {
  const articleId = "article-123";
  const authorId = "user-456";

  it("createVersion — creates a new version entry with correct fields", () => {
    const content = "New content";
    const version = createVersionEntry(articleId, content, authorId, "CREATED");

    expect(version.articleId).toBe(articleId);
    expect(version.content).toBe(content);
    expect(version.editedBy).toBe(authorId);
    expect(version.action).toBe("CREATED");
    expect(version.createdAt).toBeInstanceOf(Date);
  });

  it("restoreVersion — replaces article content with version content", () => {
    const versions = [
      { content: "v1 content" },
      { content: "v2 content" },
      { content: "v3 content" }
    ];
    
    // Restore version index 0
    const restoredContent = getRestoredContent(versions[0]);
    expect(restoredContent).toBe("v1 content");
  });

  it("getVersionHistory — returns versions sorted newest first", () => {
    const v1 = { id: 1, createdAt: new Date("2023-01-01") };
    const v2 = { id: 2, createdAt: new Date("2023-01-03") };
    const v3 = { id: 3, createdAt: new Date("2023-01-02") };
    
    const history = sortVersions([v1, v2, v3]);
    
    expect(history[0].id).toBe(2); // Jan 3
    expect(history[1].id).toBe(3); // Jan 2
    expect(history[2].id).toBe(1); // Jan 1
  });

  it("version limit — keeps only the last 50 versions", () => {
    const manyVersions = Array.from({ length: 51 }, (_, i) => ({
      id: i,
      createdAt: new Date(Date.now() + i * 1000)
    }));

    // After adding version 52 (making it 52 total)
    const newVersion = { id: 51, createdAt: new Date(Date.now() + 52000) };
    const totalVersions = [...manyVersions, newVersion];
    
    const limited = applyVersionLimit(totalVersions, 50);
    
    expect(limited).toHaveLength(50);
    expect(limited[0].id).toBe(51); // Newest should be index 0
    expect(limited[limited.length - 1].id).toBe(2); // Should have dropped id 0 and 1
  });
});
