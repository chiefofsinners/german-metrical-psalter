import { Redis } from "@upstash/redis";

// Upstash Redis client, built from UPSTASH_REDIS_REST_URL / _TOKEN. Returns null
// when unconfigured so callers can surface a clear setup error instead of
// crashing. The client (auto)serializes JSON values on set/get.
let client: Redis | null = null;

export function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!client) client = new Redis({ url, token });
  return client;
}
