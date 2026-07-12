import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ProductDetail from "@/backend/models/ProductDetail";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const catType = searchParams.get("catType");

    let query: any = {};
    if (catType) {
      query.catType = catType;
    }

    const details = await ProductDetail.find(query).sort({ catTitle: 1 });

    return NextResponse.json({ success: true, details }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching product details:", error);
    return NextResponse.json(
      { error: error.message || "Error fetching product details" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

    // Check if already exists
    const existing = await ProductDetail.findOne({
      catTitle: normalizedTitle,
    });

    if (existing) {
      return NextResponse.json(
        { error: "This product detail already exists" },
        { status: 409 },
      );
    }

    const newDetail = await ProductDetail.create({
      catType,
      catTitle: normalizedTitle,
    });

    return NextResponse.json(
      { success: true, detail: newDetail },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating product detail:", error);
    return NextResponse.json(
      { error: error.message || "Error creating product detail" },
      { status: 500 },
    );
  }
}
