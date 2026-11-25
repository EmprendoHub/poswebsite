export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import CustomerCredit from "@/backend/models/CustomerCredit";
import User from "@/backend/models/User";

/**
 * POST /api/supervisor/credit/adjust
 * Manually adjust customer credit with audit trail (supervisor only)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?._id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    // Check organizador role
    const user = await User.findById(session.user._id);
    if (user?.role !== "organizador") {
      return NextResponse.json(
        { error: "Se requiere rol de organizador" },
        { status: 403 },
      );
    }

    const { customerId, amount, reason, type } = await req.json();

    // Validation
    if (!customerId || typeof amount !== "number" || !reason) {
      return NextResponse.json(
        { error: "customerId, amount, reason son requeridos" },
        { status: 400 },
      );
    }

    if (Math.abs(amount) < 0.01) {
      return NextResponse.json(
        { error: "El monto debe ser diferente de 0" },
        { status: 400 },
      );
    }

    // Get customer
    const customer = await User.findById(customerId);
    if (!customer) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 },
      );
    }

    // Get or create credit record
    let creditRecord = await CustomerCredit.findOne({ userId: customerId });
    if (!creditRecord) {
      creditRecord = new CustomerCredit({
        userId: customerId,
        totalBalance: 0,
        usedAmount: 0,
        transactions: [],
      });
    }

    // Create adjustment transaction
    const transaction = {
      type: "adjusted",
      amount: Math.abs(amount),
      direction: amount > 0 ? "add" : "subtract",
      description: reason,
      transactionDate: new Date(),
      status: "active",
      adjustedBy: session.user._id,
      adjustmentReason: reason,
    };

    creditRecord.transactions.push(transaction as any);

    // Update total balance
    if (amount > 0) {
      creditRecord.totalBalance += amount;
    } else {
      creditRecord.totalBalance = Math.max(
        0,
        creditRecord.totalBalance + amount,
      );
    }

    await creditRecord.save();

    return NextResponse.json({
      success: true,
      data: {
        customerId,
        customerName: customer.name,
        adjustmentAmount: amount,
        newBalance: creditRecord.totalBalance,
        reason,
        adjustedAt: new Date(),
        adjustedBy: session.user._id,
      },
    });
  } catch (error) {
    console.error("Error adjusting credit:", error);
    return NextResponse.json(
      { error: "Error al ajustar crédito" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/supervisor/credit/adjust
 * Get credit adjustment history (supervisor only)
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?._id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    // Check organizador role
    const user = await User.findById(session.user._id);
    if (user?.role !== "organizador") {
      return NextResponse.json(
        { error: "Se requiere rol de organizador" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const limit = parseInt(searchParams.get("limit") || "50");

    const query: any = {};
    if (customerId) query.userId = customerId;

    // Get all credit records with adjustment history
    const adjustmentHistory = await CustomerCredit.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          userId: 1,
          "user.name": 1,
          "user.email": 1,
          totalBalance: 1,
          adjustments: {
            $filter: {
              input: "$transactions",
              as: "t",
              cond: { $eq: ["$$t.type", "adjusted"] },
            },
          },
        },
      },
      {
        $addFields: {
          adjustmentCount: { $size: "$adjustments" },
          lastAdjustment: { $arrayElemAt: ["$adjustments", -1] },
        },
      },
      {
        $sort: { "lastAdjustment.transactionDate": -1 },
      },
      {
        $limit: limit,
      },
    ]);

    return NextResponse.json({
      success: true,
      data: adjustmentHistory,
      count: adjustmentHistory.length,
    });
  } catch (error) {
    console.error("Error fetching adjustment history:", error);
    return NextResponse.json(
      { error: "Error al obtener historial de ajustes" },
      { status: 500 },
    );
  }
}
