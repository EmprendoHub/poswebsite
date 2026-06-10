export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Store from "@/backend/models/Store";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// GET /api/stores/[id]
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();
    const store = await Store.findById(params.id).populate(
      "managedBy",
      "name email",
    );
    if (!store) {
      return NextResponse.json(
        { error: "Sucursal no encontrada" },
        { status: 404 },
      );
    }
    return NextResponse.json(store, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/stores/[id] — update store (manager only)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
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
    const store = await Store.findByIdAndUpdate(params.id, data, { new: true });
    if (!store) {
      return NextResponse.json(
        { error: "Sucursal no encontrada" },
        { status: 404 },
      );
    }
    return NextResponse.json(store, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/stores/[id] — soft-delete by setting isActive=false (manager only)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(options);
    if (
      !session ||
      !["manager", "super_admin"].includes((session.user as any)?.role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();
    const store = await Store.findByIdAndUpdate(
      params.id,
      { isActive: false },
      { new: true },
    );
    if (!store) {
      return NextResponse.json(
        { error: "Sucursal no encontrada" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { message: "Sucursal desactivada" },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
