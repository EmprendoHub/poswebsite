export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import WorkOrder from "@/backend/models/WorkOrder";
import StoreInventory from "@/backend/models/StoreInventory";
import User from "@/backend/models/User";
import Store from "@/backend/models/Store";
import Product from "@/backend/models/Product";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

// GET /api/work-orders/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const session = await getServerSession(options);
    if (!session)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await dbConnect();

    const wo = await WorkOrder.findById(id)
      .populate({ path: "fromStore", model: Store, select: "name slug" })
      .populate({ path: "toStore", model: Store, select: "name slug" })
      .populate({ path: "requestedBy", model: User, select: "name email" })
      .populate({ path: "approvedBy", model: User, select: "name email" })
      .populate({
        path: "items.product",
        model: Product,
        select: "title images variations price",
      });

    if (!wo)
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 },
      );
    return NextResponse.json(wo, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/work-orders/[id] — update status (approve, cancel, etc.)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !["manager", "sucursal", "pos"].includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();

    const { status, cancelReason, notes } = await req.json();
    const userId = (session.user as any)?._id;

    // Use lean() so applyInventoryChanges reads exact MongoDB values.
    // A normal findById() would apply Mongoose schema defaults to subdocument
    // fields that are missing in the DB (e.g. adjustmentDirection defaults to
    // "add" even when the stored value was "remove" on older documents).
    const wo = await WorkOrder.findById(id).lean<any>();
    if (!wo)
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 },
      );

    // Status transition guard
    const validTransitions: Record<string, string[]> = {
      draft: ["pending", "cancelled"],
      pending: ["approved", "cancelled"],
      approved: ["in_transit", "cancelled"],
      in_transit: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };

    if (status && !validTransitions[wo.status]?.includes(status)) {
      return NextResponse.json(
        { error: `No se puede cambiar de "${wo.status}" a "${status}"` },
        { status: 400 },
      );
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (notes) updateData.notes = notes;
    if (status === "approved") updateData.approvedBy = userId;
    if (status === "cancelled") {
      updateData.cancelledAt = new Date();
      updateData.cancelReason = cancelReason || "Sin motivo";
    }
    if (status === "completed") {
      updateData.completedAt = new Date();
      // Apply inventory changes on completion
      await applyInventoryChanges(wo);
    }

    const updated = await WorkOrder.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate({ path: "fromStore", model: Store, select: "name slug" })
      .populate({ path: "toStore", model: Store, select: "name slug" })
      .populate({ path: "requestedBy", model: User, select: "name email" })
      .populate({ path: "approvedBy", model: User, select: "name email" })
      .populate({
        path: "items.product",
        model: Product,
        select: "title images variations price",
      });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Applies inventory adjustments when a work order is completed.
// Re-reads the document via the native MongoDB driver so adjustmentDirection
// is always the raw stored string, never a Mongoose schema default.
async function applyInventoryChanges(wo: any) {
  const rawWo = await mongoose.connection.db!.collection("workorders").findOne({
    _id:
      wo._id instanceof mongoose.Types.ObjectId
        ? wo._id
        : new mongoose.Types.ObjectId(String(wo._id)),
  });

  if (!rawWo) return;

  for (const item of rawWo.items ?? []) {
    const { product, variationId, quantity, adjustmentDirection } = item;

    // Deduct from source store (transfer type only)
    if (rawWo.type === "transfer" && rawWo.fromStore) {
      await StoreInventory.findOneAndUpdate(
        { store: rawWo.fromStore, variationId },
        { $inc: { quantity: -quantity }, lastUpdated: new Date() },
      );
    }

    const isRemoval =
      rawWo.type === "adjustment" && adjustmentDirection === "remove";
    const qtyDelta = isRemoval ? -quantity : quantity;

    await StoreInventory.findOneAndUpdate(
      { store: rawWo.toStore, variationId },
      {
        $inc: { quantity: qtyDelta },
        $setOnInsert: {
          product,
          store: rawWo.toStore,
          variationId,
          minStock: 1,
        },
        lastUpdated: new Date(),
      },
      { upsert: true },
    );
  }
}
