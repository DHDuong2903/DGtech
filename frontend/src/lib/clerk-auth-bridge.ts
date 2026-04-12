/**
 * Bridges Clerk's getToken (from React) to axios interceptors (module scope).
 * Enables 401 retry with skipCache without importing React in axios.ts.
 */

export type ClerkGetTokenOptions = {
  /** Force Clerk to mint a new session JWT (client-only). */
  skipCache?: boolean;
};

export type ClerkGetTokenFn = (options?: ClerkGetTokenOptions) => Promise<string | null>;

let clerkGetToken: ClerkGetTokenFn | null = null;

export function registerClerkGetToken(fn: ClerkGetTokenFn): void {
  clerkGetToken = fn;
}

export function unregisterClerkGetToken(): void {
  clerkGetToken = null;
}

export async function getClerkTokenForApi(options?: ClerkGetTokenOptions): Promise<string | null> {
  if (!clerkGetToken) return null;
  try {
    return await clerkGetToken(options);
  } catch {
    return null;
  }
}
