export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { newCSTDate } from "@/backend/helpers";
import Order from "@/backend/models/Order";
import StoreInventory from "@/backend/models/StoreInventory";
import Store from "@/backend/models/Store";
import CashRegisterMovement from "@/backend/models/CashRegisterMovement";
import CashRegisterSession from "@/backend/models/CashRegisterSession";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["manager", "sucursal", "pos", "admin", "super_admin"];

interface OfflineOrderItem {
  product: string;
  variation: string;
  name: string;
  quantity: number;
  price: number;
  image: string;
}

interface OfflineOrder {
  localId: string;
  storeId: string;
  storeSlug: string;
  orderItems: OfflineOrderItem[];
  customerName: string;
  customerPhone: string;
  payMethod: string;
  amountPaid: number;
  taxPaid: number;
  transactionRef: string;
  total: number;
  createdAt: number; // client-side timestamp (ms) when the offline sale was made
}

/**
 * POST /api/pos/sync-orders
 *
 * Accepts an array of offline orders saved in the client's IndexedDB
 * and processes each one exactly like the normal checkout endpoint.
 *
 * Returns a per-order result array:
 *   [{ localId, success, orderId? }, { localId, success, error? }, ...]
 *
 * A single order failure does NOT abort the rest.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const { orders }: { orders: OfflineOrder[] } = await req.json();
    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        { error: "No se recibieron órdenes" },
        { status: 400 },
      );
    }

    const results: {
      localId: string;
      success: boolean;
      orderId?: string;
      error?: string;
    }[] = [];

    for (const order of orders) {
      try {
        const store = await Store.findById(order.storeId);
        if (!store) throw new Error("Sucursal no encontrada");

        const isPaid = Number(order.amountPaid) >= Number(order.total);
        const orderStatus = isPaid ? "Entregado" : "Apartado";
        const paymentStatus = isPaid ? "Pagado" : "Pendiente";

        const newOrder = await Order.create({
          orderItems: order.orderItems,
          customerName: order.customerName || "Cliente POS",
          phone: order.customerPhone || "",
          branch: store.branchLegacyName || store.name,
          storeId: store._id,
          paymentInfo: {
            id: order.transactionRef || "POS-OFFLINE",
            status: paymentStatus,
            taxPaid: Number(order.taxPaid) || 0,
            amountPaid: Number(order.amountPaid),
            paymentIntent: order.transactionRef || "POS-OFFLINE",
          },
          orderStatus,
          // Use server time but note the original offline timestamp in notes
          createdAt: newCSTDate(),
          updatedAt: newCSTDate(),
        });

        // Decrement branch inventory
        for (const item of order.orderItems) {
          await StoreInventory.findOneAndUpdate(
            { store: order.storeId, variationId: item.variation },
            { $inc: { quantity: -item.quantity }, lastUpdated: new Date() },
          );
        }

        // Record cash register movement if a session is currently open
        const cajaSession = await CashRegisterSession.findOne({
          store: order.storeId,
          status: "open",
        });

        if (cajaSession) {
          let cashAmount = 0;
          let cardAmount = 0;

          if (order.payMethod === "EFECTIVO") {
            cashAmount = Number(order.amountPaid);
          } else if (order.payMethod === "TERMINAL") {
            cardAmount = Number(order.amountPaid);
          } else if (order.payMethod === "MIXTO") {
            const cashMatch = order.transactionRef?.match(/CASH:([\d.]+)/);
            const cardMatch = order.transactionRef?.match(/CARD:([\d.]+)/);
            cashAmount = cashMatch ? Number(cashMatch[1]) : 0;
            cardAmount = cardMatch ? Number(cardMatch[1]) : 0;
          }

          await CashRegisterMovement.create({
            session: cajaSession._id,
            store: order.storeId,
            type: "sale",
            payMethod: order.payMethod,
            cashAmount,
            cardAmount,
            totalAmount: Number(order.amountPaid),
            order: newOrder._id,
            orderId: newOrder.orderId,
            // Tag so managers can identify which orders came in offline
            notes: `[OFFLINE ${new Date(order.createdAt).toLocaleString("es-MX")}]`,
            createdByName: (session?.user as any)?.name || "Cajero",
            createdBy: (session?.user as any)?._id,
          });

          const totalsUpdate: Record<string, number> = {};
          if (order.payMethod === "EFECTIVO") {
            totalsUpdate["totals.cashSales"] = cashAmount;
          } else if (order.payMethod === "TERMINAL") {
            totalsUpdate["totals.cardSales"] = cardAmount;
          } else if (order.payMethod === "MIXTO") {
            totalsUpdate["totals.mixedCashSales"] = cashAmount;
            totalsUpdate["totals.mixedCardSales"] = cardAmount;
          }
          if (Object.keys(totalsUpdate).length > 0) {
            await CashRegisterSession.findByIdAndUpdate(cajaSession._id, {
              $inc: totalsUpdate,
            });
          }
        }

        results.push({
          localId: order.localId,
          success: true,
          orderId: newOrder.orderId,
        });
      } catch (err: any) {
        results.push({
          localId: order.localId,
          success: false,
          error: err.message,
        });
      }
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error("POS sync-orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
