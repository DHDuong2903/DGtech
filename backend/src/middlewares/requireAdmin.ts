// @ts-nocheck
import { User } from "../models/userModel.js";
import type { NextFunction, Request, Response } from "express";
import { getHttpStatusForError, getPublicErrorMessage } from "../helpers/dbResilience.js";

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clerkId = req.auth?.userId;

    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findOne({ where: { clerkId } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden - Admin access required" });
    }

    req.user = user;
    next();
  } catch (error: any) {
    console.error("Admin check error:", error?.message);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Internal server error"),
    });
  }
};

