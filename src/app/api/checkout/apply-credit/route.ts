export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import CustomerCredit from "@/backend/models/CustomerCredit";

/**
 * POST /api/checkout/apply-credit
 * Apply customer credit to an order (reduce total amount due)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?._id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { creditAmount, orderTotal } = body;

    if (!creditAmount || creditAmount <= 0) {
      return NextResponse.json(
        { error: "Monto de crédito inválido" },
        { status: 400 },
      );
    }

    if (!orderTotal || orderTotal <= 0) {
      return NextResponse.json(
        { error: "Total de orden inválido" },
        { status: 400 },
      );
    }

    // Get customer credit record
    const creditRecord = (await CustomerCredit.findOne({
      userId: session.user._id,
    })) as any;

    if (!creditRecord) {
      return NextResponse.json(
        { error: "No tienes crédito disponible" },
        { status: 400 },
      );
    }

    // Calculate available credit (active earned - used)
    const now = new Date();
    const activeTransactions = (creditRecord.transactions || []).filter(
      (t: any) => t.status === "active" && (!t.expiresAt || t.expiresAt > now),
    );

    const earnedActive = activeTransactions
      .filter((t: any) => t.type === "earned")
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const usedActive = activeTransactions
      .filter((t: any) => t.type === "used")
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const availableCredit = earnedActive - usedActive;

    if (creditAmount > availableCredit) {
      return NextResponse.json(
        {
          error: `Crédito insuficiente. Disponible: $${availableCredit.toFixed(2)}`,
          availableCredit,
        },
        { status: 400 },
      );
    }

    // Calculate new order total
    const newOrderTotal = Math.max(0, orderTotal - creditAmount);
    const creditUsed = creditAmount;

    // Record will be added to order when payment is processed
    return NextResponse.json({
      success: true,
      creditApplied: creditUsed,
      newOrderTotal,
      originalTotal: orderTotal,
      availableCredit: availableCredit - creditUsed,
      message: `Crédito de $${creditUsed.toFixed(2)} aplicado. Nuevo total: $${newOrderTotal.toFixed(2)}`,
    });
  } catch (error) {
    console.error("Error applying credit:", error);
    return NextResponse.json(
      { error: "Error al aplicar crédito" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/checkout/check-credit
 * Check available credit for a customer before checkout
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?._id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const creditRecord = (await CustomerCredit.findOne({
      userId: session.user._id,
    }).lean()) as any;

    if (!creditRecord) {
      return NextResponse.json({
        success: true,
        hasCredit: false,
        availableCredit: 0,
      });
    }

    // Calculate available credit
    const now = new Date();
    const activeTransactions = (creditRecord.transactions || []).filter(
      (t: any) => t.status === "active" && (!t.expiresAt || t.expiresAt > now),
    );

    const earnedActive = activeTransactions
      .filter((t: any) => t.type === "earned")
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const usedActive = activeTransactions
      .filter((t: any) => t.type === "used")
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const availableCredit = Math.max(0, earnedActive - usedActive);

    return NextResponse.json({
      success: true,
      hasCredit: availableCredit > 0,
      availableCredit,
      totalBalance: creditRecord.totalBalance,
    });
  } catch (error) {
    console.error("Error checking credit:", error);
    return NextResponse.json(
      { error: "Error al verificar crédito" },
      { status: 500 },
    );
  }
}
