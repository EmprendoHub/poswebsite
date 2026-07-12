import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";
import ProductDetail from "@/backend/models/ProductDetail";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

/**
 * Update all products that have a specific ProductDetail value
 * This is used when editing or deleting a ProductDetail
 * Body: { catType, oldValue, newValue }
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(options);
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { catType, oldValue, newValue } = body;

    if (!catType || !oldValue) {
      return NextResponse.json(
        { error: "catType and oldValue are required" },
        { status: 400 },
      );
    }

    if (!["gender", "brand", "category"].includes(catType)) {
      return NextResponse.json({ error: "Invalid catType" }, { status: 400 });
    }

    // Map catType to Product field name
    const fieldMap: { [key: string]: string } = {
      gender: "gender",
      brand: "brand",
      category: "category",
    };

    const field = fieldMap[catType];

    // Update all products with old value to new value (case-insensitive)
    // Use regex for case-insensitive matching
    const result = await Product.updateMany(
      {
        [field]: {
          $regex: `^${oldValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          $options: "i",
        },
      },
      { [field]: newValue || null },
    );

    console.log(
      `[Update Products] Updated ${result.modifiedCount} products: ${oldValue} → ${newValue}`,
    );

    return NextResponse.json(
      {
        success: true,
        message: `Updated ${result.modifiedCount} products`,
        modifiedCount: result.modifiedCount,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error updating products:", error);
    return NextResponse.json(
      { error: error.message || "Error updating products" },
      { status: 500 },
    );
  }
}
