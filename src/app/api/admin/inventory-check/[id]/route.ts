export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import InventoryCheckSession from "@/backend/models/InventoryCheckSession";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = [
  "manager",
  "director",
  "super_admin",
  "pos",
  "organizer",
  "empleado",
  "sucursal",
  "supervisor",
];

/** GET /api/admin/inventory-check/[id] — get full session with all scanned items */
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(options);
  const role = (session?.user as any)?.role;
  if (!session || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await dbConnect();

  const doc = await InventoryCheckSession.findById(params.id).lean();
  if (!doc) {
    return NextResponse.json(
      { error: "Sesión no encontrada" },
      { status: 404 },
    );
  }
  return NextResponse.json({ session: doc });
}

/**
 * PATCH /api/admin/inventory-check/[id]
 * Body: { variationId, physicalCount, productTitle, variationTitle, sku, image, systemCount, productId }
 * Adds or updates a scanned item count in the session.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(options);
  const role = (session?.user as any)?.role;
  if (!session || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await dbConnect();

  const body = await req.json();
  const {
    variationId,
    physicalCount,
    productTitle,
    variationTitle,
    sku,
    image,
    systemCount,
    productId,
  } = body;

  if (!variationId || physicalCount === undefined) {
    return NextResponse.json(
      { error: "variationId y physicalCount son requeridos" },
      { status: 400 },
    );
  }

  const doc = await InventoryCheckSession.findById(params.id);
  if (!doc) {
    return NextResponse.json(
      { error: "Sesión no encontrada" },
      { status: 404 },
    );
  }
  if (doc.status === "finalized") {
    return NextResponse.json(
      { error: "La sesión ya fue finalizada" },
      { status: 400 },
    );
  }

  const existingIndex = doc.scannedItems.findIndex(
    (i: any) => i.variationId === variationId,
  );
  const count = Number(physicalCount);
  const sysCount = Number(systemCount ?? 0);
  const item = {
    variationId,
    productId: productId || "",
    productTitle: productTitle || "",
    variationTitle: variationTitle || "",
    sku: sku || "",
    image: image || "",
    physicalCount: count,
    systemCount: sysCount,
    difference: count - sysCount,
  };

  if (existingIndex >= 0) {
    doc.scannedItems[existingIndex] = item as any;
  } else {
    doc.scannedItems.push(item as any);
  }

  await doc.save();
  return NextResponse.json({ session: doc });
}

/** DELETE /api/admin/inventory-check/[id]?variationId= — remove one scanned item */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(options);
  const role = (session?.user as any)?.role;
  if (!session || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await dbConnect();

  const url = new URL(req.url);
  const variationId = url.searchParams.get("variationId");

  const doc = await InventoryCheckSession.findById(params.id);
  if (!doc) {
    return NextResponse.json(
      { error: "Sesión no encontrada" },
      { status: 404 },
    );
  }
  if (doc.status === "finalized") {
    return NextResponse.json(
      { error: "La sesión ya fue finalizada" },
      { status: 400 },
    );
  }

  doc.scannedItems = doc.scannedItems.filter(
    (i: any) => i.variationId !== variationId,
  ) as any;
  await doc.save();
  return NextResponse.json({ session: doc });
}
