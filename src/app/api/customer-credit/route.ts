export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import CustomerCredit from "@/backend/models/CustomerCredit";

/**
 * GET /api/customer-credit?userId=xxx
 * Returns customer's credit balance and transaction history
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?._id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || session.user._id;

    // Get customer credit record
    let creditRecord = (await CustomerCredit.findOne({ userId }).lean()) as any;

    // If no credit record exists, return default values
    if (!creditRecord) {
      return NextResponse.json({
        success: true,
        data: {
          userId,
          totalBalance: 0,
          usedAmount: 0,
          availableCredit: 0,
          transactions: [],
          activeTransactions: [],
          expiredTransactions: [],
        },
      });
    }

    // Separate active and expired transactions
    const now = new Date();
    const activeTransactions = (creditRecord.transactions || []).filter(
      (t: any) => t.status === "active" && (!t.expiresAt || t.expiresAt > now),
    );
    const expiredTransactions = (creditRecord.transactions || []).filter(
      (t: any) => t.status === "expired" || (t.expiresAt && t.expiresAt <= now),
    );

    // Calculate available credit (active earned - used)
    const earnedActive = activeTransactions
      .filter((t: any) => t.type === "earned")
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const usedActive = activeTransactions
      .filter((t: any) => t.type === "used" || t.type === "adjusted")
      .reduce(
        (sum: number, t: any) => sum + (t.type === "used" ? t.amount : 0),
        0,
      );

    const availableCredit = earnedActive - usedActive;

    return NextResponse.json({
      success: true,
      data: {
        userId,
        totalBalance: creditRecord.totalBalance,
        usedAmount: creditRecord.usedAmount,
        availableCredit: Math.max(0, availableCredit),
        transactions: (creditRecord.transactions || []).sort(
          (a: any, b: any) =>
            new Date(b.transactionDate).getTime() -
            new Date(a.transactionDate).getTime(),
        ),
        activeTransactions: activeTransactions.sort(
          (a: any, b: any) =>
            new Date(b.transactionDate).getTime() -
            new Date(a.transactionDate).getTime(),
        ),
        expiredTransactions,
      },
    });
  } catch (error) {
    console.error("Error fetching customer credit:", error);
    return NextResponse.json(
      { error: "Error al obtener información de crédito" },
      { status: 500 },
    );
  }
}
