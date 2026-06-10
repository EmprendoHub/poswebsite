export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Store from "@/backend/models/Store";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// GET /api/stores — list all stores (manager or pos roles)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();
    const stores = await Store.find({})
      .sort({ name: 1 })
      .populate("managedBy", "name email");
    return NextResponse.json(stores, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/stores — create a new store (manager only)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    if (
      !session ||
      !["manager", "super_admin"].includes((session.user as any)?.role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();
    const data = await req.json();
    const store = await Store.create(data);
    return NextResponse.json(store, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
