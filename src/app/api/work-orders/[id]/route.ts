export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import WorkOrder from "@/backend/models/WorkOrder";
import StoreInventory from "@/backend/models/StoreInventory";
import User from "@/backend/models/User";
import Store from "@/backend/models/Store";
import Product from "@/backend/models/Product";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// GET /api/work-orders/[id]
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(options);
    if (!session)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await dbConnect();

    const wo = await WorkOrder.findById(params.id)
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
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !["manager", "sucursal", "pos"].includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();

    const { status, cancelReason, notes } = await req.json();
    const userId = (session.user as any)?._id;

    const wo = await WorkOrder.findById(params.id);
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

    const updated = await WorkOrder.findByIdAndUpdate(params.id, updateData, {
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

// Applies inventory adjustments when a work order is completed
async function applyInventoryChanges(wo: any) {
  for (const item of wo.items) {
    const { product, variationId, quantity } = item;

    // Deduct from source store (transfer type only)
    if (wo.type === "transfer" && wo.fromStore) {
      await StoreInventory.findOneAndUpdate(
        { store: wo.fromStore, variationId },
        { $inc: { quantity: -quantity }, lastUpdated: new Date() },
      );
    }

    // Add to destination store (all types)
    await StoreInventory.findOneAndUpdate(
      { store: wo.toStore, variationId },
      {
        $inc: { quantity },
        $setOnInsert: { product, store: wo.toStore, variationId, minStock: 1 },
        lastUpdated: new Date(),
      },
      { upsert: true },
    );
  }
}
