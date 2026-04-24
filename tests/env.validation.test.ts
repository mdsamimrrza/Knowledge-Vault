import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Env Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("validateEnv — throws when SESSION_SECRET is too short", async () => {
    const { validateEnv } = await import("../server/lib/env");
    process.env.SESSION_SECRET = "short";
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    process.env.ADMIN_SECRET_KEY = "long-enough-secret-key";
    process.env.SUPER_ADMIN_EMAIL = "admin@example.com";
    process.env.EMAIL_USER = "user@example.com";
    process.env.EMAIL_PASS = "password";

    expect(() => validateEnv()).toThrow();
  });

  it("validateEnv — throws when MONGODB_URI is missing", async () => {
    const { validateEnv } = await import("../server/lib/env");
    process.env.SESSION_SECRET = "a-very-long-and-secure-session-secret-key-32";
    delete process.env.MONGODB_URI;
    
    expect(() => validateEnv()).toThrow();
  });

  it("validateEnv — passes with all valid env vars", async () => {
    const { validateEnv } = await import("../server/lib/env");
    process.env.SESSION_SECRET = "a-very-long-and-secure-session-secret-key-32";
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    process.env.ADMIN_SECRET_KEY = "another-long-secret-key";
    process.env.SUPER_ADMIN_EMAIL = "admin@example.com";
    process.env.EMAIL_USER = "user@example.com";
    process.env.EMAIL_PASS = "password";

    const env = validateEnv();
    expect(env.SESSION_SECRET).toBe(process.env.SESSION_SECRET);
  });

  it("getEnv — triggers validation and throws if env is invalid", async () => {
    const { getEnv } = await import("../server/lib/env");
    process.env.SESSION_SECRET = "too-short";
    
    expect(() => getEnv()).toThrow();
  });
});
