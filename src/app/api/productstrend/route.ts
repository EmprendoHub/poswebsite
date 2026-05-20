import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";
import Post from "@/backend/models/Post";

export const GET = async (req: any) => {
  const token = await req.headers.get("cookie");
  if (!token) {
    // Not Signed in
    const notAuthorized = "You are not authorized no no no";
    return new Response(JSON.stringify(notAuthorized), {
      status: 400,
    });
  }

  try {
    await dbConnect();

    const _id = await req.url.split("?")[1];
    const post = await Post?.findOne({ _id });
    // Extract tag values from post.tags array
    const tagValues = await post.tags.map((tag: any) => tag.value);
    // Find products matching any of the tag values
    const trendingProducts = await Product.find({
      category: { $in: tagValues },
    }).limit(4);
    const response = NextResponse.json({
      message: "One Product fetched successfully",
      success: true,
      trendingProducts,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: "Product loading error",
      },
      { status: 500 }
    );
  }
};
