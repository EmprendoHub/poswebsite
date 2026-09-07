export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Category from "@/backend/models/Category";
import Product from "@/backend/models/Product";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

function toSlug(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// PUT /api/categories/[id] — update name/image/order/isActive (manager or super_admin)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !["manager", "super_admin"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { name, image, order, isActive } = body;

    const update: any = {};
    if (name !== undefined) {
      update.name = name;
      update.slug = toSlug(name);
    }
    if (image !== undefined) update.image = image;
    if (order !== undefined) update.order = order;
    if (isActive !== undefined) update.isActive = isActive;

    const category = await Category.findByIdAndUpdate(id, update, {
      new: true,
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, category }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: error.message || "Error updating category" },
      { status: 500 },
    );
  }
}

// DELETE /api/categories/[id] — only super_admin, blocked if it still has children or products
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(options);
    if (!session || (session.user as any)?.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const childCount = await Category.countDocuments({ parent: id });
    if (childCount > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar: esta categoría tiene subcategorías o atributos asociados",
        },
        { status: 409 },
      );
    }

    const productCount = await Product.countDocuments({
      $or: [{ mainCategory: id }, { subCategory: id }, { attributes: id }],
    });
    if (productCount > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar: ${productCount} producto(s) usan esta categoría`,
        },
        { status: 409 },
      );
    }

    await Category.findByIdAndDelete(id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: error.message || "Error deleting category" },
      { status: 500 },
    );
  }
}
