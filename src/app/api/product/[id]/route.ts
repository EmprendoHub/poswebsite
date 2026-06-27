export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";
import { getToken } from "next-auth/jwt";

export async function PATCH(
  request: any,
  { params }: { params: { id: string } },
) {
  const token: any = await getToken({ req: request });
  if (!token) {
    return new Response(JSON.stringify({ error: "Not authorized" }), {
      status: 401,
    });
  }

  try {
    await dbConnect();
    const productId = params.id;
    const body = await request.json();

    // Update only the fields provided in the body
    const updateData: any = {};

    if (body.images !== undefined) {
      updateData.images = body.images;
    }
    if (body.active !== undefined) {
      updateData.active = body.active;
    }
    if (body.availability !== undefined) {
      updateData.availability = body.availability;
    }
    if (body.title !== undefined) {
      updateData.title = body.title;
    }
    if (body.description !== undefined) {
      updateData.description = body.description;
    }
    if (body.price !== undefined) {
      updateData.price = body.price;
    }
    if (body.category !== undefined) {
      updateData.category = body.category;
    }
    if (body.brand !== undefined) {
      updateData.brand = body.brand;
    }
    if (body.gender !== undefined) {
      updateData.gender = body.gender;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, runValidators: true },
    );

    if (!updatedProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Product updated successfully",
        product: updatedProduct,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      {
        error: "Error updating product",
        message: error.message,
      },
      { status: 500 },
    );
  }
}

export async function GET(
  request: any,
  { params }: { params: { id: string } },
) {
  const token = await request.headers.get("cookie");
  if (!token) {
    return new Response(JSON.stringify({ error: "Not authorized" }), {
      status: 400,
    });
  }

  try {
    await dbConnect();
    const product = await Product.findById(params.id);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        product,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching product" },
      { status: 500 },
    );
  }
}
