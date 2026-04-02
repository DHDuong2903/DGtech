import "express";

declare global {
  namespace Express {
    interface Request {
      /**
       * Populated by `requireAuth` middleware.
       */
      auth?: {
        userId: string;
        sessionId?: string;
      };
      /**
       * Populated by `requireAdmin` middleware.
       */
      user?: unknown;
    }
  }
}

export {};

