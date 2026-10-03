export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Category from "@/backend/models/Category";
import Product from "@/backend/models/Product";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = [
  "manager",
  "director",
  "super_admin",
  "admin",
  "sucursal",
  "pos",
  "organizer",
  "empleado",
  "supervisor",
];

/**
 * GET /api/admin/inventory-check/categories
 * Get main categories, subcategories, and attributes for filtering
 */
export async function GET(req: Request) {
  const session = await getServerSession(options);
  const role = (session?.user as any)?.role;
  if (!session || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await dbConnect();

  try {
    // Get main categories
    const mainCategories = await Category.find({
      kind: "main",
      isActive: true,
    })
      .select("_id name slug order")
      .sort({ order: 1 })
      .lean();

    // Get all subcategories (grouped by main category)
    const subCategories = await Category.find({
      kind: "sub",
      isActive: true,
    })
      .select("_id name slug parent order")
      .lean();

    // Get all attributes
    const attributes = await Category.find({
      kind: "attribute",
      isActive: true,
    })
      .select("_id name slug order")
      .sort({ order: 1 })
      .lean();

    // Get all unique brands from products
    const brandDocuments = await Product.distinct("brand");
    const brands = brandDocuments
      .filter((brand: string) => brand && brand.trim())
      .map((brand: string) => ({
        _id: brand,
        name: brand,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    // Group subcategories by parent
    const subCategoriesByParent: { [key: string]: any[] } = {};
    subCategories.forEach((sub: any) => {
      const parentId = sub.parent?.toString() || "no-parent";
      if (!subCategoriesByParent[parentId]) {
        subCategoriesByParent[parentId] = [];
      }
      subCategoriesByParent[parentId].push(sub);
    });

    // Enrich main categories with their subcategories
    const mainWithSubs = mainCategories.map((main: any) => ({
      ...main,
      _id: main._id?.toString(),
      subcategories: subCategoriesByParent[main._id?.toString()] || [],
    }));

    return NextResponse.json({
      mainCategories: mainWithSubs,
      attributes: attributes.map((a: any) => ({
        ...a,
        _id: a._id?.toString(),
      })),
      brands: brands,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Error al obtener categorías" },
      { status: 500 }
    );
  }
}
