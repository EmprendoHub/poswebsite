import { options } from "@/app/api/auth/[...nextauth]/options";
import InventoryCheckSession from "@/backend/models/InventoryCheckSession";
import Store from "@/backend/models/Store";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["manager", "director", "super_admin"];

/** GET /api/admin/inventory-check?storeId=  — list sessions for a store (or all) */
export async function GET(req: Request) {
  const session = await getServerSession(options);
  const role = (session?.user as any)?.role;
  if (!session || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await dbConnect();

  const url = new URL(req.url);
  const storeId = url.searchParams.get("storeId");
  const filter = storeId ? { store: storeId } : {};

  const sessions = await InventoryCheckSession.find(filter)
    .sort({ startedAt: -1 })
    .limit(50)
    .lean();

  const stores = await Store.find({ isActive: true })
    .select("_id name slug")
    .lean();

  return NextResponse.json({ sessions, stores });
}

/** POST /api/admin/inventory-check — create a new in-progress session */
export async function POST(req: Request) {
  const session = await getServerSession(options);
  const role = (session?.user as any)?.role;
  if (!session || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await dbConnect();

  const body = await req.json();
  const { storeId } = body;
  if (!storeId) {
    return NextResponse.json({ error: "Se requiere storeId" }, { status: 400 });
  }

  const store = (await Store.findById(storeId).lean()) as any;
  if (!store) {
    return NextResponse.json(
      { error: "Sucursal no encontrada" },
      { status: 404 },
    );
  }

  const user = session.user as any;
  const newSession = await InventoryCheckSession.create({
    store: storeId,
    storeName: store.name,
    status: "in_progress",
    scannedItems: [],
    startedBy: user._id || user.id,
    startedByName: user.name || user.email,
    startedAt: new Date(),
  });

  return NextResponse.json({ session: newSession }, { status: 201 });
}
