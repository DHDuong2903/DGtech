// @ts-nocheck
import { verifyToken } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY as string,
    });

    if (!payload || !payload.sub) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    req.auth = { userId: payload.sub, sessionId: payload.sid };
    next();
  } catch (error: any) {
    console.error("Auth error:", error?.message);
    return res.status(401).json({ error: "Unauthorized - Invalid token" });
  }
};

