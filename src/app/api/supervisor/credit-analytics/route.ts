export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import CustomerCredit from "@/backend/models/CustomerCredit";
import User from "@/backend/models/User";

/**
 * GET /api/supervisor/credit-analytics
 * Get credit usage analytics dashboard (supervisor only)
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?._id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    // Check supervisor role
    const user = await User.findById(session.user._id);
    if (user?.role !== "organizador") {
      return NextResponse.json(
        { error: "Se requiere rol de supervisor" },
        { status: 403 },
      );
    }

    // Get all credit records
    const creditRecords = await CustomerCredit.aggregate([
      {
        $group: {
          _id: null,
          totalEarned: {
            $sum: {
              $sum: {
                $filter: {
                  input: "$transactions",
                  as: "t",
                  cond: { $eq: ["$$t.type", "earned"] },
                  limit: 1,
                },
              },
            },
          },
          totalUsed: {
            $sum: {
              $sum: {
                $filter: {
                  input: "$transactions",
                  as: "t",
                  cond: { $eq: ["$$t.type", "used"] },
                  limit: 1,
                },
              },
            },
          },
          totalExpired: {
            $sum: {
              $sum: {
                $filter: {
                  input: "$transactions",
                  as: "t",
                  cond: { $eq: ["$$t.type", "expired"] },
                  limit: 1,
                },
              },
            },
          },
          activeCredits: {
            $sum: {
              $sum: {
                $filter: {
                  input: "$transactions",
                  as: "t",
                  cond: {
                    $and: [
                      { $eq: ["$$t.status", "active"] },
                      { $eq: ["$$t.type", "earned"] },
                    ],
                  },
                  limit: 1,
                },
              },
            },
          },
          uniqueCustomers: {
            $sum: 1,
          },
        },
      },
    ]);

    // Get top spenders
    const topSpenders = await CustomerCredit.aggregate([
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
          _id: 1,
          userId: 1,
          "user.name": 1,
          "user.email": 1,
          totalBalance: 1,
          usedAmount: 1,
        },
      },
      {
        $sort: { usedAmount: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Get credit burn rate by month
    const burnRateByMonth = await CustomerCredit.aggregate([
      {
        $unwind: "$transactions",
      },
      {
        $match: { "transactions.type": "used" },
      },
      {
        $group: {
          _id: {
            year: { $year: "$transactions.transactionDate" },
            month: { $month: "$transactions.transactionDate" },
          },
          totalSpent: { $sum: "$transactions.amount" },
          transactionCount: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 },
      },
      {
        $limit: 12,
      },
    ]);

    return NextResponse.json({
      success: true,
      analytics: {
        summary: creditRecords[0] || {
          totalEarned: 0,
          totalUsed: 0,
          totalExpired: 0,
          activeCredits: 0,
          uniqueCustomers: 0,
        },
        topSpenders,
        burnRateByMonth,
      },
    });
  } catch (error) {
    console.error("Error fetching credit analytics:", error);
    return NextResponse.json(
      { error: "Error al obtener análisis de crédito" },
      { status: 500 },
    );
  }
}
