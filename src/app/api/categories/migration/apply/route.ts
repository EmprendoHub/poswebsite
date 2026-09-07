export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const NO_VALUE = "(sin valor)";

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Builds a match clause for a legacy field. NO_VALUE means "match empty/missing".
function fieldMatcher(field: "gender" | "category", value: string) {
  if (value === NO_VALUE) {
    return { $or: [{ [field]: null }, { [field]: "" }, { [field]: { $exists: false } }] };
  }
  return { [field]: new RegExp(`^${escapeRegex(value)}$`, "i") };
}

// POST /api/categories/migration/apply
// Body: { gender: string, category: string, mainCategoryId?, subCategoryId?, attributeIds?: string[] }
// Bulk-applies a new-taxonomy mapping to every product still holding the given
// legacy (gender, category) combination — matching both fields at once so the
// admin can see exactly which group of products is affected before applying.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !["manager", "super_admin"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { gender, category, mainCategoryId, subCategoryId, attributeIds } =
      body;

    if (!gender || !category) {
      return NextResponse.json(
        { error: "gender y category son requeridos" },
        { status: 400 },
      );
    }

    const hasMainMapping = !!mainCategoryId && !!subCategoryId;
    const hasAttributeMapping =
      Array.isArray(attributeIds) && attributeIds.length > 0;

    if (!hasMainMapping && !hasAttributeMapping) {
      return NextResponse.json(
        {
          error:
            "Selecciona categoría principal + subcategoría, y/o al menos un atributo",
        },
        { status: 400 },
      );
    }

    const matcher = {
      $and: [fieldMatcher("gender", gender), fieldMatcher("category", category)],
    };

    const update: any = {};
    if (hasMainMapping) {
      update.$set = { mainCategory: mainCategoryId, subCategory: subCategoryId };
    }
    if (hasAttributeMapping) {
      update.$addToSet = { attributes: { $each: attributeIds } };
    }

    const result = await Product.updateMany(matcher, update);

    return NextResponse.json(
      {
        success: true,
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error applying category migration:", error);
    return NextResponse.json(
      { error: error.message || "Error applying category migration" },
      { status: 500 },
    );
  }
}

