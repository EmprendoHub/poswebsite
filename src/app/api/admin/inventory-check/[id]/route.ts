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
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(options);
  const role = (session?.user as any)?.role;
  if (!session || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await dbConnect();

  const doc = await InventoryCheckSession.findById(id).lean();
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
 * Body: { variationId, physicalCount, productTitle, variationTitle, sku, image, systemCount, productId, price, note, isDiscrepancy }
 * Adds or updates a scanned item count in the session.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
    price,
    note,
    isDiscrepancy,
    updateNote, // boolean: true if only updating the note
    updateDiscrepancy, // boolean: true if only updating discrepancy flag
  } = body;

  if (!variationId) {
    return NextResponse.json(
      { error: "variationId es requerido" },
      { status: 400 },
    );
  }

  const doc = await InventoryCheckSession.findById(id);
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

  if (updateNote || updateDiscrepancy) {
    // Only update note or discrepancy flag
    if (existingIndex >= 0) {
      if (updateNote !== undefined) {
        (doc.scannedItems[existingIndex] as any).note = note || "";
      }
      if (updateDiscrepancy !== undefined) {
        (doc.scannedItems[existingIndex] as any).isDiscrepancy =
          isDiscrepancy ?? false;
      }
    }
  } else {
    // Full item update (add/update scan)
    if (physicalCount === undefined) {
      return NextResponse.json(
        { error: "physicalCount es requerido para actualizar conteo" },
        { status: 400 },
      );
    }

    const count = Number(physicalCount);
    const sysCount = Number(systemCount ?? 0);
    const item: any = {
      variationId,
      productId: productId || "",
      productTitle: productTitle || "",
      variationTitle: variationTitle || "",
      sku: sku || "",
      image: image || "",
      price: price || 0,
      physicalCount: count,
      systemCount: sysCount,
      difference: count - sysCount,
      note: note || "",
      isDiscrepancy: isDiscrepancy ?? false,
    };

    if (existingIndex >= 0) {
      doc.scannedItems[existingIndex] = item;
    } else {
      doc.scannedItems.push(item);
    }
  }

  // Recalculate totals
  doc.totalScanned = doc.scannedItems.length;
  doc.totalMatched = doc.scannedItems.filter(
    (i: any) => i.difference === 0
  ).length;
  doc.totalDiscrepancies = doc.scannedItems.filter(
    (i: any) => i.isDiscrepancy || i.difference !== 0
  ).length;

  await doc.save();
  return NextResponse.json({ session: doc });
}

/** DELETE /api/admin/inventory-check/[id]?variationId= — remove one scanned item */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(options);
  const role = (session?.user as any)?.role;
  if (!session || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await dbConnect();

  const url = new URL(req.url);
  const variationId = url.searchParams.get("variationId");

  const doc = await InventoryCheckSession.findById(id);
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
