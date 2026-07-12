import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";
import ProductDetail from "@/backend/models/ProductDetail";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

/**
 * Get count of products for each ProductDetail value
 * Query params: catType (gender|brand|category)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const catType = searchParams.get("catType");

    if (!catType || !["gender", "brand", "category"].includes(catType)) {
      return NextResponse.json(
        { error: "Invalid catType parameter" },
        { status: 400 },
      );
    }

    // Map catType to Product field name
    const fieldMap: { [key: string]: string } = {
      gender: "gender",
      brand: "brand",
      category: "category",
    };

    const field = fieldMap[catType];

    // Get product counts grouped by lowercase
    const counts = await Product.aggregate([
      {
        $match: {
          [field]: { $nin: [null, "", undefined] },
        },
      },
      {
        $group: {
          _id: { $toLower: `$${field}` },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Fetch all ProductDetails for this catType to map title-cased values
    const productDetails = await ProductDetail.find({ catType: catType });

    // Debug logging
    console.log(`[ProductDetail Count] catType: ${catType}, field: ${field}`);
    console.log(
      `[ProductDetail Count] Found ${counts.length} product count groups`,
    );
    console.log(
      `[ProductDetail Count] Found ${productDetails.length} ProductDetails`,
    );

    // Build countMap with both lowercase and title-cased keys
    const countMap: { [key: string]: number } = {};

    counts.forEach((item) => {
      const lowerCaseKey = item._id;
      const count = item.count;

      // Add lowercase key
      countMap[lowerCaseKey] = count;

      // Find matching ProductDetail and add title-cased key
      const matchingDetail = productDetails.find(
        (pd) => pd.catTitle.toLowerCase() === lowerCaseKey,
      );

      if (matchingDetail) {
        countMap[matchingDetail.catTitle] = count;
        console.log(
          `[ProductDetail Count] Mapped "${matchingDetail.catTitle}" (${lowerCaseKey}) = ${count}`,
        );
      }
    });

    return NextResponse.json(
      { success: true, counts: countMap },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching product counts:", error);
    return NextResponse.json(
      { error: error.message || "Error fetching product counts" },
      { status: 500 },
    );
  }
}
