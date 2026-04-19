"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { registerClerkGetToken, unregisterClerkGetToken } from "../lib/clerk-auth-bridge";

/**
 * Wires Clerk `getToken` into the axios bridge used by `axios.ts` interceptors (registered at module load).
 * Registering here on render (not in a child-only useEffect) avoids PDP/list firing before Bearer exists.
 * 401 responses are still retried once in axios.ts with getToken({ skipCache: true }).
 */
export const AxiosInterceptorSetup = ({ children }: { children: React.ReactNode }) => {
  const { getToken } = useAuth();
  registerClerkGetToken((opts) => getToken(opts));

  useEffect(() => {
    return () => unregisterClerkGetToken();
  }, [getToken]);

  return <>{children}</>;
};
