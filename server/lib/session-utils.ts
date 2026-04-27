import mongoose from "mongoose";
import type { Request } from "express";

export function destroySessionAsync(req: Request): Promise<void> {
  return new Promise((resolve) => {
    req.session.destroy(() => resolve());
  });
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  await mongoose.connection.collection("sessions").deleteMany({
    "session.userId": userId,
  });
}
