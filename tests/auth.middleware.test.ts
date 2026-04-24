import { describe, it, expect, vi, beforeEach } from "vitest";
import { isAuthenticated, requireRole } from "../server/middleware/auth";
import { Request, Response } from "express";
import { getEnv } from "../server/lib/env";

// Mock the environment
vi.mock("../server/lib/env", () => ({
  getEnv: vi.fn(() => ({
    SUPER_ADMIN_EMAIL: "admin@example.com"
  }))
}));

describe("Auth Middleware", () => {
  let mockReq: any;
  let mockRes: any;
  let next: any;

  beforeEach(() => {
    mockReq = {
      isAuthenticated: vi.fn(),
      user: null
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    next = vi.fn();
  });

  describe("isAuthenticated", () => {
    it("should allow authenticated requests", () => {
      mockReq.isAuthenticated.mockReturnValue(true);
      isAuthenticated(mockReq as Request, mockRes as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it("should block unauthenticated requests with 401", () => {
      mockReq.isAuthenticated.mockReturnValue(false);
      isAuthenticated(mockReq as Request, mockRes as Response, next);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });
  });

  describe("requireRole", () => {
    it("should allow users with the correct role", () => {
      mockReq.isAuthenticated.mockReturnValue(true);
      mockReq.user = { role: "admin", email: "other@example.com" };
      
      const middleware = requireRole("admin");
      middleware(mockReq as Request, mockRes as Response, next);
      
      expect(next).toHaveBeenCalled();
    });

    it("should allow super admin to bypass role checks", () => {
      mockReq.isAuthenticated.mockReturnValue(true);
      mockReq.user = { role: "user", email: "admin@example.com" }; // Match SUPER_ADMIN_EMAIL
      
      const middleware = requireRole("admin");
      middleware(mockReq as Request, mockRes as Response, next);
      
      expect(next).toHaveBeenCalled();
    });

    it("should block users with incorrect role with 403", () => {
      mockReq.isAuthenticated.mockReturnValue(true);
      mockReq.user = { role: "user", email: "other@example.com" };
      
      const middleware = requireRole("admin");
      middleware(mockReq as Request, mockRes as Response, next);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Forbidden: Insufficient privileges" });
    });

    it("should block unauthenticated users with 401", () => {
      mockReq.isAuthenticated.mockReturnValue(false);
      
      const middleware = requireRole("admin");
      middleware(mockReq as Request, mockRes as Response, next);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});
