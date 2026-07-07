/**
 * posDB.ts — Dexie (IndexedDB) schema for offline POS operation.
 *
 * Two tables:
 *  • products      — local cache of the store's active product catalog
 *  • pendingOrders — sales made while offline, waiting to sync
 */
import Dexie, { Table } from "dexie";

// ── Cached product (mirrors the /api/pos/search response shape) ──────────
export interface CachedProduct {
  id: string; // = product._id string
  storeId: string;
  title: string;
  asin?: string;
  price?: number; // Base product price
  currentPrice?: number; // Sale price (takes precedence over price)
  images: { url: string }[];
  variations: {
    _id: string;
    title?: string;
    color?: string;
    size?: string;
    price: number;
    stock: number;
    image?: string;
  }[];
  cachedAt: number; // Date.now()
}

// ── Offline order waiting to be synced ──────────────────────────────────
export interface PendingOrder {
  localId: string; // client-generated UUID
  storeId: string;
  storeSlug: string;
  orderItems: {
    product: string;
    variation: string;
    name: string;
    quantity: number;
    price: number;
    image: string;
  }[];
  customerName: string;
  customerPhone: string;
  payMethod: string;
  amountPaid: number;
  taxPaid: number;
  transactionRef: string;
  total: number;
  createdAt: number; // Date.now() at time of offline sale
  status: "pending" | "synced" | "failed";
  syncedOrderId?: string; // real orderId after successful sync
  error?: string;
}

class POSDatabase extends Dexie {
  products!: Table<CachedProduct>;
  pendingOrders!: Table<PendingOrder>;

  constructor() {
    super("SuperCollectiblesPOS");
    this.version(2).stores({
      products: "id, storeId, title",
      pendingOrders: "localId, storeId, status, createdAt",
    });
  }
}

export const posDB = new POSDatabase();
