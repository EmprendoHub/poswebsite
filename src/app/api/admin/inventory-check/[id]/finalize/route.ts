export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import InventoryCheckSession from "@/backend/models/InventoryCheckSession";
import StoreInventory from "@/backend/models/StoreInventory";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["manager", "director", "super_admin"];

/**
 * POST /api/admin/inventory-check/[id]/finalize
 * 1. Re-syncs systemCount from StoreInventory for accuracy.
 * 2. Updates StoreInventory quantities to match the physical count for each scanned item.
 * 3. Marks the session as finalized with summary totals.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(options);
  const role = (session?.user as any)?.role;
  if (!session || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await dbConnect();

  const doc = await InventoryCheckSession.findById(params.id);
  if (!doc) {
    return NextResponse.json(
      { error: "Sesión no encontrada" },
      { status: 404 },
    );
  }
  if (doc.status === "finalized") {
    return NextResponse.json(
      { error: "La sesión ya fue finalizada" },
      { status: 400 },
    );
  }

  // Re-fetch live system counts from StoreInventory to ensure accuracy
  const variationIds = doc.scannedItems.map((i: any) => i.variationId);
  const inventoryRecords = await StoreInventory.find({
    store: doc.store,
    variationId: { $in: variationIds },
  })
    .select("variationId quantity")
    .lean();

  const stockMap = new Map<string, number>();
  for (const rec of inventoryRecords) {
    stockMap.set(rec.variationId, rec.quantity);
  }

  let totalMatched = 0;
  let totalDiscrepancies = 0;

  for (const item of doc.scannedItems) {
    const liveCount = stockMap.get(item.variationId) ?? 0;
    item.systemCount = liveCount;
    item.difference = item.physicalCount - liveCount;
    if (item.difference === 0) {
      totalMatched++;
    } else {
      totalDiscrepancies++;
    }
  }

  // Update StoreInventory to match physical counts for all scanned items
  await Promise.all(
    doc.scannedItems.map((item: any) =>
      StoreInventory.findOneAndUpdate(
        { store: doc.store, variationId: item.variationId },
        {
          $set: {
            quantity: item.physicalCount,
            lastUpdated: new Date(),
          },
        },
        { new: true },
      ),
    ),
  );

  doc.status = "finalized";
  doc.finalizedAt = new Date();
  doc.totalScanned = doc.scannedItems.length;
  doc.totalMatched = totalMatched;
  doc.totalDiscrepancies = totalDiscrepancies;

  await doc.save();
  return NextResponse.json({ session: doc });
}
