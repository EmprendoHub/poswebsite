import Store from "@/backend/models/Store";
import type { Types } from "mongoose";

export const PHYSICAL_STORE_TYPE = "fisica" as const;

/**
 * Returns the _id of all "fisica" (physical/sellable) stores as ObjectIds
 * (safe for both Mongoose `.find()` casting and raw `.aggregate()` $match).
 * Bodega-type stores are storage-only and must never count toward
 * online-store or POS stock availability.
 */
export async function getPhysicalStoreIds(): Promise<Types.ObjectId[]> {
  const stores = await Store.find({ type: PHYSICAL_STORE_TYPE }, "_id").lean();
  return stores.map((s: any) => s._id);
}
