export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Order from "@/backend/models/Order";
import User from "@/backend/models/User";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/**
 * GET /api/customer-dashboard?userId=xxx
 * Returns dashboard statistics for a customer
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId requerido" }, { status: 400 });
    }

    // Get user with all details
    const user = (await User.findById(userId).lean()) as any;

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    // Count orders by status
    const orders = await Order.countDocuments({
      user: userId,
      orderStatus: { $ne: "Cancelado" },
    });

    // Count canceled orders
    const canceledOrders = await Order.countDocuments({
      user: userId,
      orderStatus: "Cancelado",
    });

    // Count favorites
    const favoritesCount = Array.isArray(user.favorites)
      ? user.favorites.length
      : 0;

    // Get total spent (sum of amountPaid from all orders)
    const totalSpentAgg = await Order.aggregate([
      {
        $match: {
          user: require("mongoose").Types.ObjectId.createFromHexString(userId),
          orderStatus: { $ne: "Cancelado" },
        },
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: "$paymentInfo.amountPaid" },
        },
      },
    ]);

    const totalSpent =
      totalSpentAgg.length > 0 ? totalSpentAgg[0].totalSpent : 0;

    return NextResponse.json({
      ordersCount: orders,
      canceledOrders,
      favoritesCount,
      points: user.points || 0,
      totalSpent: Math.round(totalSpent * 100) / 100,
    });
  } catch (error: any) {
    console.error("customer-dashboard error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al cargar dashboard" },
      { status: 500 },
    );
  }
}
