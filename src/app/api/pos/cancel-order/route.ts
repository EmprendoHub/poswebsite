export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Order from "@/backend/models/Order";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["manager", "sucursal", "pos", "admin", "super_admin"];

/**
 * POST /api/pos/cancel-order
 * Body: { orderId: string, authorizedById: string, authorizedByName: string }
 * Sets orderStatus to "Cancelado" after manager code has been verified client-side.
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

    order.orderStatus = "Cancelado";
    order.comment = [
      order.comment,
      `Cancelado por: ${authorizedByName} (${new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" })})`,
    ]
      .filter(Boolean)
      .join(" | ");
    await order.save();

    return NextResponse.json({ success: true, orderId });
  } catch (error: any) {
    console.error("cancel-order error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al cancelar" },
      { status: 500 },
    );
  }
}
