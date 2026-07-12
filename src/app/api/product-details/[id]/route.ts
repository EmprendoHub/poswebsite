import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ProductDetail from "@/backend/models/ProductDetail";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import mongoose from "mongoose";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const detail = await ProductDetail.findById(params.id);

    if (!detail) {
      return NextResponse.json(
        { error: "Product detail not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, detail }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching product detail:", error);
    return NextResponse.json(
      { error: error.message || "Error fetching product detail" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(options);
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { catType, catTitle } = body;

    if (!catType || !catTitle) {
      return NextResponse.json(
        { error: "catType and catTitle are required" },
        { status: 400 },
      );
    }

    // Normalize title to title case
    const normalizedTitle = catTitle
      .split(" ")
      .map(
        (word: string) =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join(" ");

    // Check if another detail with same title exists
    const existing = await ProductDetail.findOne({
      catTitle: normalizedTitle,
      _id: { $ne: new mongoose.Types.ObjectId(params.id) },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This product detail title already exists" },
        { status: 409 },
      );
    }

    const updatedDetail = await ProductDetail.findByIdAndUpdate(
      params.id,
      {
        catType,
        catTitle: normalizedTitle,
      },
      { new: true },
    );

    if (!updatedDetail) {
      return NextResponse.json(
        { error: "Product detail not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, detail: updatedDetail },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error updating product detail:", error);
    return NextResponse.json(
      { error: error.message || "Error updating product detail" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(options);
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const deletedDetail = await ProductDetail.findByIdAndDelete(params.id);

    if (!deletedDetail) {
      return NextResponse.json(
        { error: "Product detail not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, message: "Product detail deleted" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error deleting product detail:", error);
    return NextResponse.json(
      { error: error.message || "Error deleting product detail" },
      { status: 500 },
    );
  }
}
