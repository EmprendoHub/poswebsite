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

/**
 * PATCH /api/admin/inventory-check/[id]/metadata
 * Update session metadata like selectedProducts and filters
 * Body: { selectedProducts?, filters? }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(options);
  const role = (session?.user as any)?.role;
  if (!session || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await dbConnect();

  const body = await req.json();
  const { selectedProducts, filters } = body;

  const doc = await InventoryCheckSession.findById(id);
  if (!doc) {
    return NextResponse.json(
      { error: "Sesión no encontrada" },
      { status: 404 }
    );
  }
  if (doc.status === "finalized") {
    return NextResponse.json(
      { error: "La sesión ya fue finalizada" },
      { status: 400 }
    );
  }

  if (selectedProducts !== undefined) {
    doc.selectedProducts = selectedProducts;
    doc.totalSelected = selectedProducts.length;
  }

  if (filters !== undefined) {
    doc.filters = filters;
  }

  await doc.save();
  return NextResponse.json({ session: doc });
}
