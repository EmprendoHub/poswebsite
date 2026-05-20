import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";

export const GET = async (request: any) => {
  const token = await request.headers.get("cookie");
  if (!token) {
    // Not Signed in
    const notAuthorized = "You are not authorized no no no";
    return new Response(JSON.stringify(notAuthorized), {
      status: 400,
    });
  }

  try {
    await dbConnect();
    const id = await request.headers.get("id");
    const slug = await request.headers.get("slug");
    let product;
    if (id) {
      product = await Product?.findOne({ _id: id });
    } else {
      product = await Product?.findOne({ slug: slug });
    }

    const trendingProducts = await Product.find({
      category: product.category,
    })
      .sort({ createdAt: -1 })
      .limit(4);
    const response = NextResponse.json({
      message: "One Product fetched successfully",
      success: true,
      product,
      trendingProducts,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: "Product loading error",
      },
      { status: 500 },
    );
  }
};

export async function DELETE(req: any) {
  const sessionData = req.headers.get("x-mysession-key");
  const session = JSON.parse(sessionData);
  if (session) {
    try {
      await dbConnect();
      const urlData = await req.url.split("?");
      const id = urlData[1];
      const deleteProduct = await Product.findByIdAndDelete(id);
      return new Response(JSON.stringify(deleteProduct), { status: 201 });
    } catch (error: any) {
      return new Response(JSON.stringify(error.message), { status: 500 });
    }
  } else {
    // Not Signed in
    return new Response("You are not authorized, eh eh eh, no no no", {
      status: 400,
    });
  }
}
