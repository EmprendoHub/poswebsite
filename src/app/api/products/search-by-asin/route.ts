export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";

export const GET = async (request: any) => {
  const token = await request.headers.get("cookie");
  if (!token) {
    return new Response(JSON.stringify({ error: "Not authorized" }), {
      status: 400,
    });
  }

  try {
    await dbConnect();
    const asin = request.nextUrl.searchParams.get("asin");

    if (!asin || asin.trim() === "") {
      return NextResponse.json(
        { error: "ASIN parameter is required" },
        { status: 400 },
      );
    }

    // Search for product by ASIN (case-insensitive)
    const product = await Product.findOne({
      ASIN: { $regex: `^${asin.trim()}$`, $options: "i" },
    });

    // Ensure _id is a string if product exists
    const productData = product
      ? {
          ...product.toObject(),
          _id: product._id?.toString() || product._id,
        }
      : null;

    return NextResponse.json(
      {
        success: true,
        product: productData,
        found: !!productData,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error searching by ASIN:", error);
    return NextResponse.json(
      {
        error: "Error searching product",
      },
      { status: 500 },
    );
  }
};
