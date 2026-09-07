export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { newCSTDate } from "@/backend/helpers";
import Order from "@/backend/models/Order";
import StoreInventory from "@/backend/models/StoreInventory";
import Product from "@/backend/models/Product";
import CashRegisterMovement from "@/backend/models/CashRegisterMovement";
import CashRegisterSession from "@/backend/models/CashRegisterSession";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["manager", "sucursal", "pos", "admin", "super_admin"];

/**
 * POST /api/pos/cancel-order
 * Body: { orderId: string, authorizedById: string, authorizedByName: string }
 *
 * 1. Marks order as "Cancelado"
 * 2. Restores StoreInventory quantities for each item in the order
 * 3. Restores Product.variations[].stock and product.stock totals
 * 4. Reverses the CashRegisterSession totals for the matching sale movement
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const { orderId, authorizedById, authorizedByName } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Se requiere orderId" },
        { status: 400 },
      );
    }
    if (!authorizedById || !authorizedByName) {
      return NextResponse.json(
        { error: "Se requiere autorización de manager" },
        { status: 400 },
      );
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 },
      );
    }

    if (order.orderStatus === "Cancelado") {
      return NextResponse.json(
        { error: "La orden ya está cancelada" },
        { status: 400 },
      );
    }

    // ── 1. Mark order cancelled ───────────────────────────────────────────
    order.orderStatus = "Cancelado";
    order.cancelledAt = new Date();
    order.comment = [
      order.comment,
      `Cancelado por: ${authorizedByName} (${new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" })})`,
    ]
      .filter(Boolean)
      .join(" | ");
    await order.save();

    // ── 2. Restore inventory ──────────────────────────────────────────────
    const storeId = order.storeId;
    if (storeId && Array.isArray(order.orderItems)) {
      // Aggregate quantities by variationId + productId to avoid partial updates
      const varMap = new Map<string, { productId: string; qty: number }>();
      for (const item of order.orderItems) {
        const key = String(item.variation);
        const existing = varMap.get(key);
        if (existing) {
          existing.qty += item.quantity;
        } else {
          varMap.set(key, {
            productId: String(item.product),
            qty: item.quantity,
          });
        }
      }

      await Promise.all(
        Array.from(varMap.entries()).map(
          async ([variationId, { productId, qty }]) => {
            // Restore StoreInventory
            await StoreInventory.findOneAndUpdate(
              { store: storeId, variationId },
              { $inc: { quantity: qty }, $set: { lastUpdated: new Date() } },
            );

            // Restore Product variation stock
            await Product.findOneAndUpdate(
              { _id: productId, "variations._id": variationId },
              { $inc: { "variations.$.stock": qty } },
            );
          },
        ),
      );

      // Recalculate product.stock = sum of all variations for each affected product
      const uniqueProductIds = Array.from(
        new Set(Array.from(varMap.values()).map((v) => v.productId)),
      );
      await Promise.all(
        uniqueProductIds.map((pid) =>
          Product.findByIdAndUpdate(pid, [
            { $set: { stock: { $sum: "$variations.stock" } } },
          ]),
        ),
      );
    }

    // ── 3. Reverse cash register session totals ───────────────────────────
    const saleMovement = await CashRegisterMovement.findOne({
      order: order._id,
      type: "sale",
    });

    if (saleMovement) {
      const openSession = await CashRegisterSession.findOne({
        store: saleMovement.store,
        status: "open",
      });

      if (openSession) {
        const pm = saleMovement.payMethod;
        const cash = Number(saleMovement.cashAmount ?? 0);
        const card = Number(saleMovement.cardAmount ?? 0);

        let inc: Record<string, number> = {};
        if (pm === "EFECTIVO") {
          inc["totals.cashSales"] = -cash;
        } else if (pm === "TERMINAL") {
          inc["totals.cardSales"] = -card;
        } else if (pm === "MIXTO") {
          inc["totals.mixedCashSales"] = -cash;
          inc["totals.mixedCardSales"] = -card;
        }

        if (Object.keys(inc).length > 0) {
          await CashRegisterSession.findByIdAndUpdate(openSession._id, {
            $inc: inc,
          });
        }

        // ── 4. Create a new "restock" movement to record the cancellation ──
        // This creates an audit trail entry showing items returned to inventory
        const restockMovement = new CashRegisterMovement({
          session: openSession._id,
          store: saleMovement.store,
          type: "manual_in", // Items returning to inventory
          payMethod: "N/A", // No payment involved
          cashAmount: 0,
          cardAmount: 0,
          totalAmount: 0, // Cancellation, no money involved
          order: order._id,
          authorizedById: authorizedById,
          authorizedByName: authorizedByName,
          notes: `Pedido Cancelado (#${order.orderId}) `,
          createdAt: newCSTDate(),
        });

        await restockMovement.save();
      }
    }

    return NextResponse.json({ success: true, orderId });
  } catch (error: any) {
    console.error("cancel-order error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al cancelar" },
      { status: 500 },
    );
  }
}
