export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import Arqueo from "@/backend/models/Arqueo";

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
  const storeId = url.searchParams.get("storeId");
  const limit = url.searchParams.get("limit") || "50";
  const page = url.searchParams.get("page") || "1";

  try {
    let query: any = {};

    // Filter by store if provided
    if (storeId) {
      query.store = storeId;
    }

    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      query.date = {
        $gte: start,
        $lte: end,
      };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const arqueos = await Arqueo.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Arqueo.countDocuments(query);

    return NextResponse.json({
      success: true,
      arqueos,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching arqueo history:", error);
    return NextResponse.json(
      { error: "Error fetching arqueo history" },
      { status: 500 },
    );
  }
}
