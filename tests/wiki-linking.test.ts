import { describe, it, expect } from "vitest";
import { extractWikiLinkTitles, preProcessWikiLinks } from "../shared/wiki-links";

describe("Wiki Linking", () => {
  describe("extractWikiLinkTitles", () => {
    it("should find all [[...]] patterns in markdown content", () => {
      const input = "See [[Getting Started]] and [[Advanced Topics]]";
      const result = extractWikiLinkTitles(input);
      expect(result).toEqual(["Getting Started", "Advanced Topics"]);
    });

    it("should return empty array when no links present", () => {
      const input = "No links here";
      const result = extractWikiLinkTitles(input);
      expect(result).toEqual([]);
    });

    it("should handle edge cases: [[]]", () => {
      const input = "[[]]";
      const result = extractWikiLinkTitles(input);
      expect(result).toEqual([]);
    });

    it("should handle edge cases: [[  Spaces  ]]", () => {
      const input = "[[  Spaces  ]]";
      const result = extractWikiLinkTitles(input);
      expect(result).toEqual(["Spaces"]);
    });

    it("should handle duplicates: [[A]] [[A]]", () => {
      const input = "[[A]] [[A]]";
      const result = extractWikiLinkTitles(input);
      expect(result).toEqual(["A"]);
    });
  });

  describe("preProcessWikiLinks", () => {
    it("should replace [[Title]] with placeholder links", () => {
      const input = "See [[Getting Started]]";
      const result = preProcessWikiLinks(input);
      expect(result).toContain("[Getting Started](wikilink://Getting%20Started)");
    });

    it("should handle multiple links", () => {
      const input = "[[A]] and [[B]]";
      const result = preProcessWikiLinks(input);
      expect(result).toContain("[A](wikilink://A)");
      expect(result).toContain("[B](wikilink://B)");
    });
  });
});
