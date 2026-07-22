export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";

/**
 * POST /api/products/bulk-update-by-search
 * Updates all products matching a search keyword with the provided fields
 *
 * Body: {
 *   keyword: string (search term),
 *   updates: {
 *     category?: string,
 *     gender?: string,
 *     brand?: string,
 *     weight?: number,
 *     dimensions?: { length?, width?, height? }
 *   }
 * }
 */
export async function POST(request: any) {
  try {
    const token: any = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const { keyword = "", updates } = body;

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 },
      );
    }

    // Build search query
    const searchQuery: any = { active: true };

    if (keyword.trim()) {
      // Search in title, description, category, brand, ASIN, gender
      searchQuery.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { category: { $regex: keyword, $options: "i" } },
        { brand: { $regex: keyword, $options: "i" } },
        { ASIN: { $regex: keyword, $options: "i" } },
        { gender: { $regex: keyword, $options: "i" } },
      ];
    }

    // Build update fields
    const updateFields: Record<string, any> = {};

    if (updates.category) updateFields.category = updates.category;
    if (updates.gender) updateFields.gender = updates.gender;
    if (updates.brand) updateFields.brand = updates.brand;
    if (updates.weight != null) updateFields.weight = updates.weight;

    if (updates.dimensions) {
      const { length, width, height } = updates.dimensions;
      if (length != null) updateFields["dimensions.length"] = length;
      if (width != null) updateFields["dimensions.width"] = width;
      if (height != null) updateFields["dimensions.height"] = height;
    }

    // Perform bulk update
    const result = await Product.updateMany(searchQuery, {
      $set: updateFields,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Updated ${result.modifiedCount} products matching "${keyword}"`,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error bulk updating by search:", error);
    return NextResponse.json(
      {
        error: "Error updating products",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
