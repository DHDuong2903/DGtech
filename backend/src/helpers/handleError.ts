import type { Response } from "express";

/**
 * Centralized error response helper for controllers.
 * Keeps the response shape consistent while TypeScript is being introduced.
 */
export const handleError = (res: Response, error: any, message: string) => {
  console.error(message, error);
  return res.status(500).json({
    error: message,
    details: error?.message ?? String(error),
  });
};

