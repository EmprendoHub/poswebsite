export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import CashRegisterCut from "@/backend/models/CashRegisterCut";

const ALLOWED_ROLES = ["admin", "owner", "manager"];

export async function GET(req: Request) {
  const session = await getServerSession(options);
  const role = (session?.user as any)?.role;

  if (!session || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await dbConnect();

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const limit = url.searchParams.get("limit") || "50";

  try {
    let query: any = {};

    // If date range is provided, filter by those dates
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      query.createdAt = {
        $gte: start,
        $lte: end,
      };
    } else {
      // Default: last 30 days if no date range specified
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      query.createdAt = {
        $gte: thirtyDaysAgo,
      };
    }

    const cortes = await CashRegisterCut.find(query)
      .select(
        "_id store cutNumber storeName periodStart periodEnd type totals paymentMethods gastos createdAt",
      )
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    return NextResponse.json({
      success: true,
      cortes,
      count: cortes.length,
    });
  } catch (error) {
    console.error("Error fetching recent cortes:", error);
    return NextResponse.json(
      { error: "Error fetching recent cortes" },
      { status: 500 },
    );
  }
}
