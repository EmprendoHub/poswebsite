export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Order from "@/backend/models/Order";
import WorkOrder from "@/backend/models/WorkOrder";
import StoreInventory from "@/backend/models/StoreInventory";
import Product from "@/backend/models/Product";
import Store from "@/backend/models/Store";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["super_admin", "manager"];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function toObjId(id: string) {
  return mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;
}

interface AdjEntry {
  productId: string;
  variationId: string;
  storeId: string | null; // null → online order, no store
  /** positive = add, negative = subtract */
  varDelta: number;
  /** storeDelta may differ from varDelta for transfers (var unchanged) */
  storeDelta: number;
}

/** key = `${storeId ?? ""}|${variationId}|${productId}` */
type AdjMap = Map<
  string,
  {
    productId: string;
    variationId: string;
    storeId: string | null;
    varDelta: number;
    storeDelta: number;
  }
>;

function upsertAdj(
  map: AdjMap,
  storeId: string | null,
  variationId: string,
  productId: string,
  varDelta: number,
  storeDelta: number,
) {
  const key = `${storeId ?? ""}|${variationId}|${productId}`;
  const existing = map.get(key);
  if (existing) {
    existing.varDelta += varDelta;
    existing.storeDelta += storeDelta;
  } else {
    map.set(key, { productId, variationId, storeId, varDelta, storeDelta });
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/store-inventory/reconcile
// Body: { dateFrom: "YYYY-MM-DD", dateTo: "YYYY-MM-DD", dryRun: boolean }
// ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      dateFrom,
      dateTo,
      dryRun = true,
    } = body as {
      dateFrom: string;
      dateTo: string;
      dryRun: boolean;
    };

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "dateFrom y dateTo son requeridos" },
        { status: 400 },
      );
    }

    const start = new Date(dateFrom + "T00:00:00.000Z");
    const end = new Date(dateTo + "T23:59:59.999Z");
    if (start > end) {
      return NextResponse.json(
        { error: "dateFrom debe ser anterior a dateTo" },
        { status: 400 },
      );
    }

    await dbConnect();

    // ── 1. Fetch source documents ──────────────────────────────────
    const orders = await Order.find({
      orderStatus: "Entregado",
      createdAt: { $gte: start, $lte: end },
    }).lean();

    const workOrders = await WorkOrder.find({
      status: "completed",
      $or: [
        { completedAt: { $gte: start, $lte: end } },
        { completedAt: null, updatedAt: { $gte: start, $lte: end } },
      ],
    }).lean();

    // ── 2. Build adjustment map ────────────────────────────────────
    const adjMap: AdjMap = new Map();

    // Orders → sales (decrease stock everywhere)
    for (const order of orders) {
      const storeId = (order as any).storeId
        ? (order as any).storeId.toString()
        : null;
      for (const item of order.orderItems) {
        const variationId = item.variation; // string variationId
        const productId = item.product.toString();
        const qty = item.quantity;
        // Decrease both StoreInventory (if store exists) and product.variations.stock
        upsertAdj(adjMap, storeId, variationId, productId, -qty, -qty);
      }
    }

    // Work Orders → multiple types
    for (const wo of workOrders) {
      const toStoreId = (wo as any).toStore.toString();
      const fromStoreId = (wo as any).fromStore
        ? (wo as any).fromStore.toString()
        : null;

      for (const item of (wo as any).items) {
        const variationId = item.variationId;
        const productId = item.product.toString();
        const qty = item.quantity;
        const woType = (wo as any).type as string;

        if (woType === "receive" || woType === "new_product") {
          // New stock in → add to store AND product variation total
          upsertAdj(adjMap, toStoreId, variationId, productId, +qty, +qty);
        } else if (woType === "transfer") {
          // Move between stores → no change to product total stock
          if (fromStoreId) {
            upsertAdj(adjMap, fromStoreId, variationId, productId, 0, -qty);
          }
          upsertAdj(adjMap, toStoreId, variationId, productId, 0, +qty);
        } else if (woType === "adjustment") {
          // Positive correction → add to store and product total
          upsertAdj(adjMap, toStoreId, variationId, productId, +qty, +qty);
        }
      }
    }

    const entries = Array.from(adjMap.values()).filter(
      (e) => e.varDelta !== 0 || e.storeDelta !== 0,
    );

    // ── 3. Dry-run: build preview ──────────────────────────────────
    if (dryRun) {
      // Batch-fetch all needed data
      const allProductIds = Array.from(
        new Set(entries.map((e) => e.productId)),
      );
      const allStoreIds = Array.from(
        new Set(entries.map((e) => e.storeId).filter(Boolean) as string[]),
      );

      const [products, stores, invRecords] = await Promise.all([
        Product.find({ _id: { $in: allProductIds.map(toObjId) } })
          .select("title variations")
          .lean(),
        Store.find({ _id: { $in: allStoreIds.map(toObjId) } })
          .select("name")
          .lean(),
        StoreInventory.find({
          product: { $in: allProductIds.map(toObjId) },
        }).lean(),
      ]);

      const productMap = new Map(
        products.map((p: any) => [p._id.toString(), p]),
      );
      const storeMap = new Map(
        stores.map((s: any) => [s._id.toString(), s.name]),
      );
      const invMap = new Map(
        invRecords.map((r: any) => [
          `${r.store.toString()}|${r.variationId}`,
          r.quantity ?? 0,
        ]),
      );

      const adjustments = entries.map((entry) => {
        const product = productMap.get(entry.productId) as any;
        const variation = product?.variations?.find(
          (v: any) => v._id?.toString() === entry.variationId,
        );
        const varLabel =
          variation?.title ||
          [variation?.color, variation?.size].filter(Boolean).join(" / ") ||
          entry.variationId.slice(-6);

        const storeName = entry.storeId
          ? (storeMap.get(entry.storeId) ?? entry.storeId)
          : "(Online)";

        const currentStorQty = entry.storeId
          ? (invMap.get(`${entry.storeId}|${entry.variationId}`) ?? 0)
          : null;

        const currentVarStock = variation?.stock ?? 0;

        return {
          storeId: entry.storeId,
          storeName,
          productId: entry.productId,
          productTitle: product?.title ?? entry.productId,
          variationId: entry.variationId,
          variationLabel: varLabel,
          currentStoreQty: currentStorQty,
          newStoreQty:
            currentStorQty !== null ? currentStorQty + entry.storeDelta : null,
          storeDelta: entry.storeDelta,
          currentVarStock,
          newVarStock: currentVarStock + entry.varDelta,
          varDelta: entry.varDelta,
        };
      });

      // Sort by storeName, then productTitle
      adjustments.sort((a, b) =>
        `${a.storeName}${a.productTitle}`.localeCompare(
          `${b.storeName}${b.productTitle}`,
        ),
      );

      const affectedProductCount = new Set(entries.map((e) => e.productId))
        .size;
      const affectedVariationCount = new Set(
        entries.map((e) => `${e.productId}|${e.variationId}`),
      ).size;

      return NextResponse.json({
        dryRun: true,
        dateFrom,
        dateTo,
        orderCount: orders.length,
        workOrderCount: workOrders.length,
        affectedProducts: affectedProductCount,
        affectedVariations: affectedVariationCount,
        adjustments,
      });
    }

    // ── 4. Apply adjustments ───────────────────────────────────────
    const affectedProductIds = new Set<string>();
    let applied = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      try {
        // Update StoreInventory
        if (entry.storeId && entry.storeDelta !== 0) {
          await StoreInventory.findOneAndUpdate(
            { store: toObjId(entry.storeId), variationId: entry.variationId },
            {
              $inc: { quantity: entry.storeDelta },
              $set: {
                product: toObjId(entry.productId),
                lastUpdated: new Date(),
              },
            },
            { upsert: true },
          );
        }

        // Update product.variations[].stock
        if (entry.varDelta !== 0) {
          await Product.updateOne(
            { _id: toObjId(entry.productId) },
            { $inc: { "variations.$[v].stock": entry.varDelta } },
            { arrayFilters: [{ "v._id": toObjId(entry.variationId) }] },
          );
        }

        affectedProductIds.add(entry.productId);
        applied++;
      } catch (e: any) {
        errors.push(`${entry.productId}/${entry.variationId}: ${e.message}`);
      }
    }

    // Recalculate product.stock = sum of all variations.stock
    for (const productId of Array.from(affectedProductIds)) {
      const product = await Product.findById(toObjId(productId))
        .select("variations")
        .lean();
      if (!product) continue;
      const totalStock = ((product as any).variations ?? []).reduce(
        (sum: number, v: any) => sum + (v.stock ?? 0),
        0,
      );
      await Product.updateOne(
        { _id: toObjId(productId) },
        { $set: { stock: totalStock } },
      );
    }

    return NextResponse.json({
      dryRun: false,
      success: true,
      dateFrom,
      dateTo,
      orderCount: orders.length,
      workOrderCount: workOrders.length,
      adjustmentsApplied: applied,
      affectedProducts: affectedProductIds.size,
      errors,
    });
  } catch (error: any) {
    console.error("[POST /api/store-inventory/reconcile]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
