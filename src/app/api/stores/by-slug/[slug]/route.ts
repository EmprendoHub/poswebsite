export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Store from "@/backend/models/Store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    // Connect to database
    await dbConnect();

    // Find store by slug
    const store = await Store.findOne({ slug }).lean();

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    return NextResponse.json(store, { status: 200 });
  } catch (error: any) {
    console.error("❌ Error fetching store:", error);
    return NextResponse.json(
      { error: error.message || "Error fetching store" },
      { status: 500 },
    );
  }
}
