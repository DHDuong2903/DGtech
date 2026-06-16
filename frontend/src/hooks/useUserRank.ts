"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { usersApi } from "@/src/apis/userApi";
import type { UserRank } from "@/src/types";

const rankCache = new Map<string, UserRank>();
const inflightRequests = new Map<string, Promise<UserRank>>();

async function fetchRankForUser(userId: string) {
  const cached = rankCache.get(userId);
  if (cached) return cached;

  const inflight = inflightRequests.get(userId);
  if (inflight) return inflight;

  const request = usersApi
    .getMyRank()
    .then((rank) => {
      rankCache.set(userId, rank);
      inflightRequests.delete(userId);
      return rank;
    })
    .catch((error) => {
      inflightRequests.delete(userId);
      throw error;
    });

  inflightRequests.set(userId, request);
  return request;
}

export function invalidateUserRankCache(userId?: string) {
  if (userId) {
    rankCache.delete(userId);
    inflightRequests.delete(userId);
    return;
  }

  rankCache.clear();
  inflightRequests.clear();
}

export function useUserRank() {
  const { isLoaded, isSignedIn, user } = useUser();
  const userId = user?.id ?? null;
  const [rank, setRank] = useState<UserRank | null>(() => (userId ? rankCache.get(userId) ?? null : null));
  const [isLoading, setIsLoading] = useState(() => Boolean(userId && !rankCache.has(userId)));
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;

    if (!isLoaded) {
      setIsLoading(true);
      return () => {
        active = false;
      };
    }

    if (!isSignedIn || !userId) {
      setRank(null);
      setError(null);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    const cached = rankCache.get(userId) ?? null;
    if (cached) {
      setRank(cached);
      setError(null);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    setError(null);

    fetchRankForUser(userId)
      .then((nextRank) => {
        if (!active) return;
        setRank(nextRank);
        setIsLoading(false);
      })
      .catch((nextError) => {
        if (!active) return;
        setError(nextError);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, userId]);

  const refresh = useCallback(async () => {
    if (!userId) return null;
    invalidateUserRankCache(userId);
    setIsLoading(true);
    setError(null);
    try {
      const nextRank = await fetchRankForUser(userId);
      setRank(nextRank);
      return nextRank;
    } catch (nextError) {
      setError(nextError);
      throw nextError;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return {
    rank,
    isLoading,
    error,
    refresh,
    isLoaded,
    isSignedIn,
    userId,
  };
}
