// @ts-nocheck
import { verifyToken } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

/** Sets req.auth when a valid Bearer token is present; otherwise continues without error. */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return next();
    }

    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY as string,
    });

    if (payload?.sub) {
      req.auth = { userId: payload.sub, sessionId: payload.sid };
    }
  } catch {
    // Ignore invalid/expired token on public routes
  }
  next();
};
