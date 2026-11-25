export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import User from "@/backend/models/User";

/**
 * GET /api/supervisor/tournaments/search-customers?q=search_term
 * Search for existing customers by name or email
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?._id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        customers: [],
      });
    }

    // Search in name, email, phone
    const customers = await User.find(
      {
        role: "cliente",
        $or: [
          { name: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
          { phone: { $regex: query, $options: "i" } },
        ],
      },
      ["_id", "name", "email", "phone", "avatar"],
    )
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      customers: customers.map((c: any) => ({
        _id: c._id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        avatar: c.avatar,
      })),
    });
  } catch (error) {
    console.error("Error searching customers:", error);
    return NextResponse.json(
      { error: "Error al buscar clientes" },
      { status: 500 },
    );
  }
}
