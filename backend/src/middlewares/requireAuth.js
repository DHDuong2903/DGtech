import { clerkClient, verifyToken } from "@clerk/express";

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    // Verify JWT token networkless (không cần gọi API)
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (!payload || !payload.sub) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    req.auth = { userId: payload.sub, sessionId: payload.sid };
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ error: "Unauthorized - Invalid token" });
  }
};
