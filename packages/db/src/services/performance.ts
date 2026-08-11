import { db, students, feeInvoices } from "../index";
import { eq, and, gt } from "drizzle-orm";

// ── 1. Cursor-Based Pagination Service ────────────────────────
export interface CursorPaginateOptions<T> {
  schoolId: string;
  items: T[];
  cursorField: keyof T;
  cursorValue?: string | number | null;
  limit?: number;
}

export interface CursorPaginateResult<T> {
  items: T[];
  nextCursor: string | number | null;
  hasMore: boolean;
}

export function cursorPaginate<T extends Record<string, any>>(
  options: CursorPaginateOptions<T>
): CursorPaginateResult<T> {
  const { schoolId, items, cursorField, cursorValue, limit = 20 } = options;

  // Filter items strictly by schoolId
  const tenantItems = items.filter((item) => item.schoolId === schoolId);

  // Apply cursor filter if provided
  let filtered = tenantItems;
  if (cursorValue !== undefined && cursorValue !== null) {
    filtered = tenantItems.filter((item) => {
      const val = item[cursorField] as any;
      const curVal = cursorValue as any;
      return val > curVal;
    });
  }

  // Sort deterministically by cursorField
  filtered.sort((a, b) => {
    const valA = a[cursorField];
    const valB = b[cursorField];
    if (valA < valB) return -1;
    if (valA > valB) return 1;
    return 0;
  });

  const sliced = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;
  const lastItem = sliced[sliced.length - 1];
  const nextCursor = hasMore && lastItem ? lastItem[cursorField] : null;

  return {
    items: sliced,
    nextCursor: nextCursor !== undefined ? nextCursor : null,
    hasMore,
  };
}

// ── 2. Tenant-Safe Dynamic Cache Manager ──────────────────────
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const inFlightPromises = new Map<string, Promise<any>>();

export async function getOrSetTenantCache<T>(
  schoolId: string,
  key: string,
  fetcherFn: () => Promise<T>,
  ttlMs: number = 60000
): Promise<T> {
  // CRITICAL: Cache key MUST always be tenant-scoped
  const cacheKey = `${schoolId}:${key}`;
  const now = Date.now();

  const existing = memoryCache.get(cacheKey);
  if (existing && existing.expiresAt > now) {
    return existing.data as T;
  }

  // Prevent Cache Stampede by reusing in-flight promise
  if (inFlightPromises.has(cacheKey)) {
    return inFlightPromises.get(cacheKey)! as Promise<T>;
  }

  const promise = (async () => {
    try {
      const data = await fetcherFn();
      memoryCache.set(cacheKey, { data, expiresAt: now + ttlMs });
      return data;
    } finally {
      inFlightPromises.delete(cacheKey);
    }
  })();

  inFlightPromises.set(cacheKey, promise);
  return promise;
}

export function invalidateTenantCache(schoolId: string, keyPrefix?: string) {
  const prefix = keyPrefix ? `${schoolId}:${keyPrefix}` : `${schoolId}:`;
  for (const k of memoryCache.keys()) {
    if (k.startsWith(prefix)) {
      memoryCache.delete(k);
    }
  }
}

export function getCacheStats() {
  return {
    totalKeys: memoryCache.size,
    keys: Array.from(memoryCache.keys()),
  };
}

// ── 3. Query Latency Profiler ────────────────────────────────
export async function profileQueryLatency<T>(
  name: string,
  fn: () => Promise<T>,
  thresholdMs: number = 100
): Promise<{ result: T; durationMs: number; exceededThreshold: boolean }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;

  const exceededThreshold = durationMs > thresholdMs;
  if (exceededThreshold) {
    console.warn(`[SLOW_QUERY_WARNING] '${name}' executed in ${durationMs.toFixed(2)}ms (threshold: ${thresholdMs}ms)`);
  }

  return { result, durationMs, exceededThreshold };
}

// ── 4. Platform Load Benchmark Engine ─────────────────────────
export interface BenchmarkOptions {
  schoolCount?: number;
  recordsPerSchool?: number;
  concurrency?: number;
}

export interface BenchmarkReport {
  timestamp: string;
  totalRequests: number;
  successfulOps: number;
  failedOps: number;
  throughputOpsPerSec: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  memoryRssMb: number;
  heapUsedMb: number;
}

export async function runPlatformLoadBenchmark(
  options: BenchmarkOptions = {}
): Promise<BenchmarkReport> {
  const { schoolCount = 5, recordsPerSchool = 50, concurrency = 10 } = options;

  const startTime = performance.now();

  const latencies: number[] = [];
  let successfulOps = 0;
  let failedOps = 0;

  // Execute concurrent batch iterations
  const totalRequests = schoolCount * concurrency;
  const tasks: Promise<void>[] = [];

  for (let i = 0; i < totalRequests; i++) {
    const task = (async () => {
      const opStart = performance.now();
      try {
        // Simulated tenant-scoped read & cache retrieval
        const fakeSchoolId = `school-bench-${i % schoolCount}`;
        await getOrSetTenantCache(
          fakeSchoolId,
          `bench-key-${i}`,
          async () => {
            // Simulated light workload calculation
            return Array.from({ length: recordsPerSchool }).map((_, idx) => ({
              id: `item-${idx}`,
              schoolId: fakeSchoolId,
              value: idx * 10,
            }));
          },
          5000
        );

        latencies.push(performance.now() - opStart);
        successfulOps++;
      } catch {
        failedOps++;
      }
    })();

    tasks.push(task);
  }

  await Promise.all(tasks);

  const totalDurationSec = (performance.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);

  const avgLatencyMs = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const p95Idx = Math.floor(latencies.length * 0.95);
  const p99Idx = Math.floor(latencies.length * 0.99);

  const endMemory = process.memoryUsage();

  return {
    timestamp: new Date().toISOString(),
    totalRequests,
    successfulOps,
    failedOps,
    throughputOpsPerSec: Number((successfulOps / (totalDurationSec || 1)).toFixed(2)),
    avgLatencyMs: Number(avgLatencyMs.toFixed(2)),
    p95LatencyMs: Number((latencies[p95Idx] || avgLatencyMs).toFixed(2)),
    p99LatencyMs: Number((latencies[p99Idx] || avgLatencyMs).toFixed(2)),
    memoryRssMb: Number((endMemory.rss / (1024 * 1024)).toFixed(2)),
    heapUsedMb: Number((endMemory.heapUsed / (1024 * 1024)).toFixed(2)),
  };
}
