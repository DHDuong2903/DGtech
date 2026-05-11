import dotenv from "dotenv";
import { createClient } from "redis";

dotenv.config();

type CacheRecord = {
  value: string;
  expiresAt: number | null;
};

const memoryCache = new Map<string, CacheRecord>();
const versionMemory = new Map<string, number>();
const redisUrl = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING || "";

let redisClient: ReturnType<typeof createClient> | null = null;
let redisConnectPromise: Promise<void> | null = null;
let redisDisabled = false;

function getMemoryValue(key: string): string | null {
  const record = memoryCache.get(key);
  if (!record) return null;
  if (record.expiresAt != null && record.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return record.value;
}

async function getRedisClient() {
  if (!redisUrl || redisDisabled) return null;

  if (!redisClient) {
    redisClient = createClient({ url: redisUrl });
    redisClient.on("error", (error) => {
      if (!redisDisabled) {
        console.warn("Redis cache error:", error?.message || error);
      }
    });
  }

  if (!redisClient.isOpen) {
    if (!redisConnectPromise) {
      redisConnectPromise = redisClient
        .connect()
        .then(() => undefined)
        .catch((error) => {
          redisDisabled = true;
          console.warn("Redis cache disabled:", error?.message || error);
          redisClient = null;
        })
        .finally(() => {
          redisConnectPromise = null;
        });
    }
    await redisConnectPromise;
  }

  return redisClient?.isOpen ? redisClient : null;
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const client = await getRedisClient();
  if (client) {
    const value = await client.get(key);
    if (value != null) {
      try {
        return JSON.parse(value) as T;
      } catch {
        await client.del(key);
      }
    }
  }

  const memoryValue = getMemoryValue(key);
  if (memoryValue == null) return null;
  try {
    return JSON.parse(memoryValue) as T;
  } catch {
    memoryCache.delete(key);
    return null;
  }
}

export async function cacheSetJson(key: string, value: unknown, ttlMs: number): Promise<void> {
  const payload = JSON.stringify(value);
  const client = await getRedisClient();
  if (client) {
    await client.set(key, payload, { PX: ttlMs });
    return;
  }

  memoryCache.set(key, {
    value: payload,
    expiresAt: ttlMs > 0 ? Date.now() + ttlMs : null,
  });
}

export async function cacheDelete(key: string): Promise<void> {
  const client = await getRedisClient();
  if (client) {
    await client.del(key);
  }
  memoryCache.delete(key);
}

export async function cacheGetVersion(namespace: string): Promise<number> {
  const key = `cacheVersion:${namespace}`;
  const client = await getRedisClient();
  if (client) {
    const value = await client.get(key);
    const parsed = value != null ? parseInt(value, 10) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const local = versionMemory.get(namespace);
  return Number.isFinite(local) && local! > 0 ? (local as number) : 1;
}

export async function cacheBumpVersion(namespace: string): Promise<number> {
  const key = `cacheVersion:${namespace}`;
  const client = await getRedisClient();
  if (client) {
    const next = await client.incr(key);
    return next > 0 ? next : 1;
  }

  const next = (versionMemory.get(namespace) ?? 1) + 1;
  versionMemory.set(namespace, next);
  return next;
}
