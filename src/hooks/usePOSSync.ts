"use client";
/**
 * usePOSSync — manages online/offline state, local product caching,
 * and automatic flush of pending offline orders when connectivity returns.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { posDB } from "@/lib/posDB";

const CACHE_TTL_MS = 10 * 60 * 1000; // re-cache after 10 min (reduced from 30 to show product updates faster)
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // background check every 5 min

export interface SyncResult {
  synced: number;
  failed: number;
}

export function usePOSSync(storeId: string | null, storeSlug: string) {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const flushingRef = useRef(false);

  // ── 1. Track browser online/offline ──────────────────────────────────────
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // ── 2. Keep pending count up to date ─────────────────────────────────────
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await posDB.pendingOrders
        .where("status")
        .equals("pending")
        .count();
      setPendingCount(count);
    } catch {
      // IndexedDB not available (SSR / private mode) — ignore
    }
  }, []);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  // ── 3. Cache all store products into IndexedDB ────────────────────────────
  const cacheProducts = useCallback(async () => {
    if (!storeId || !navigator.onLine) return;
    try {
      const res = await fetch(`/api/pos/products?storeId=${storeId}`);
      if (!res.ok) return;
      const products: any[] = await res.json();
      const now = Date.now();
      await posDB.products.bulkPut(
        products.map((p) => ({
          id: p._id,
          storeId,
          title: p.title,
          asin: p.ASIN ?? undefined,
          price: p.price ?? 0,
          currentPrice: p.currentPrice ?? p.price ?? 0,
          images: p.images ?? [],
          variations: p.variations ?? [],
          cachedAt: now,
        })),
      );
      setLastSyncedAt(new Date());
    } catch {
      // Network hiccup during cache — not fatal
    }
  }, [storeId]);

  // ── 4. Flush pending offline orders to server ─────────────────────────────
  const flushPendingOrders = useCallback(async () => {
    if (flushingRef.current || !navigator.onLine) return;
    try {
      const pending = await posDB.pendingOrders
        .where("status")
        .equals("pending")
        .toArray();
      if (pending.length === 0) return;

      flushingRef.current = true;
      setIsSyncing(true);

      const res = await fetch("/api/pos/sync-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: pending }),
      });
      if (!res.ok) return;

      const results: {
        localId: string;
        success: boolean;
        orderId?: string;
        error?: string;
      }[] = await res.json();

      let synced = 0;
      let failed = 0;
      for (const r of results) {
        if (r.success) {
          await posDB.pendingOrders.update(r.localId, {
            status: "synced",
            syncedOrderId: r.orderId,
          });
          synced++;
        } else {
          await posDB.pendingOrders.update(r.localId, {
            status: "failed",
            error: r.error,
          });
          failed++;
        }
      }
      setLastSyncResult({ synced, failed });
      await refreshPendingCount();
    } catch {
      // Network error during flush — will retry on next online event
    } finally {
      flushingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  // ── 5. When connectivity returns: cache + flush ───────────────────────────
  useEffect(() => {
    if (isOnline && storeId) {
      cacheProducts();
      flushPendingOrders();
    }
  }, [isOnline, storeId, cacheProducts, flushPendingOrders]);

  // ── 6. On mount: cache products if stale / missing ───────────────────────
  useEffect(() => {
    if (!storeId) return;
    (async () => {
      try {
        const sample = await posDB.products
          .where("storeId")
          .equals(storeId)
          .first();
        if (!sample || Date.now() - sample.cachedAt > CACHE_TTL_MS) {
          await cacheProducts();
        }
      } catch {
        // IndexedDB unavailable — skip
      }
    })();
  }, [storeId, cacheProducts]);

  // ── 7. Periodic background sync ──────────────────────────────────────────
  useEffect(() => {
    if (!storeId) return;
    const id = setInterval(() => {
      if (navigator.onLine) {
        cacheProducts();
        flushPendingOrders();
      }
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [storeId, cacheProducts, flushPendingOrders]);

  // ── Manual sync trigger ───────────────────────────────────────────────────
  const syncNow = useCallback(async () => {
    await Promise.all([cacheProducts(), flushPendingOrders()]);
  }, [cacheProducts, flushPendingOrders]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncedAt,
    lastSyncResult,
    syncNow,
    refreshPendingCount,
  };
}
