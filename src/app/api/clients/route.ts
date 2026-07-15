export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import User from "@/backend/models/User";

export const GET = async (req: NextRequest) => {
  try {
    const session = await getServerSession(options);

    if (!session) {
      return NextResponse.json(
        { error: "You are not authorized" },
        { status: 401 },
      );
    }

    await dbConnect();

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const limit = Number(searchParams.get("limit")) || 10;

    // Build search filter
    let searchFilter: any = { role: "cliente" };

    if (search) {
      searchFilter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Find matching clients
    const clients = await User.find(searchFilter)
      .limit(limit)
      .sort({ createdAt: -1 })
      .select("_id name email phone");

    return NextResponse.json(clients, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Clients loading error" },
      { status: 500 },
    );
  }
};
