export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Category from "@/backend/models/Category";
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

// GET /api/categories?kind=main|sub|attribute&parent=<id>
// Public — the storefront needs this to render category tiles for anonymous visitors.
export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind");
    const parent = searchParams.get("parent");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const query: any = {};
    if (kind) query.kind = kind;
    if (parent) query.parent = parent;
    if (activeOnly) query.isActive = true;

    const categories = await Category.find(query).sort({ order: 1, name: 1 });

    return NextResponse.json({ success: true, categories }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: error.message || "Error fetching categories" },
      { status: 500 },
    );
  }
}

// POST /api/categories — create a main/sub/attribute category (manager or super_admin)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !["manager", "super_admin"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { name, kind, parent, image, order } = body;

    if (!name || !kind) {
      return NextResponse.json(
        { error: "name y kind son requeridos" },
        { status: 400 },
      );
    }

    if (!["main", "sub", "attribute"].includes(kind)) {
      return NextResponse.json({ error: "kind inválido" }, { status: 400 });
    }

    if (kind === "sub" && !parent) {
      return NextResponse.json(
        { error: "Las subcategorías requieren una categoría principal (parent)" },
        { status: 400 },
      );
    }

    const slug = toSlug(name);

    const existing = await Category.findOne({ slug });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese nombre" },
        { status: 409 },
      );
    }

    const category = await Category.create({
      name,
      slug,
      kind,
      parent: kind === "sub" ? parent : null,
      image,
      order: order ?? 0,
    });

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: error.message || "Error creating category" },
      { status: 500 },
    );
  }
}
