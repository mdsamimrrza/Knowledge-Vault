import { app, initApp } from "../server/index";
import type { Request, Response } from "express";

export default async function handler(req: Request, res: Response) {
  try {
    await initApp();
    return app(req, res);
  } catch (err: any) {
    console.error("❌ Vercel Function Initialization Error:", err);
    return res.status(500).json({
      error: "Vercel Serverless Function Initialization Failed",
      message: err.message || String(err),
    });
  }
}
