import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the environment BEFORE importing anything that uses getEnv()
vi.mock("../server/lib/env", () => ({
  getEnv: vi.fn(() => ({
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: 587,
    SMTP_SECURE: false,
    EMAIL_USER: "test@example.com",
    EMAIL_PASS: "password",
    SUPER_ADMIN_EMAIL: "admin@example.com"
  })),
  validateEnv: vi.fn()
}));

// Mock the dns promises module
vi.mock("node:dns/promises", () => ({
  resolveMx: vi.fn()
}));

import { isValidEmailDomain } from "../server/lib/email";
import * as dns from "node:dns/promises";

describe("DNS Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("isValidEmailDomain — returns true for a domain with MX records", async () => {
    vi.mocked(dns.resolveMx).mockResolvedValue([{ exchange: "mail.gmail.com", priority: 10 }]);
    
    const result = await isValidEmailDomain("user@gmail.com");
    expect(result).toBe(true);
  });

  it("isValidEmailDomain — returns false for a domain with no MX records", async () => {
    vi.mocked(dns.resolveMx).mockResolvedValue([]);
    
    const result = await isValidEmailDomain("user@nodomain.xyz");
    expect(result).toBe(false);
  });

  it("isValidEmailDomain — returns false for DNS lookup failure", async () => {
    vi.mocked(dns.resolveMx).mockRejectedValue(new Error("ENOTFOUND"));
    
    const result = await isValidEmailDomain("user@error-domain.com");
    expect(result).toBe(false);
  });

  it("isValidEmailDomain — blocks blacklisted domains", async () => {
    const domains = ["mailinator.com", "guerrillamail.com", "throwaway.email", "tempmail.com"];
    
    for (const d of domains) {
      const result = await isValidEmailDomain(`user@${d}`);
      expect(result).toBe(false);
      // DNS should not even be called for blacklisted domains
      expect(dns.resolveMx).not.toHaveBeenCalledWith(d);
    }
  });
});
