import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import AuthToken from "@/backend/models/AuthToken";
import User from "@/backend/models/User";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(options);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId, variationId } = await req.json();

    if (!productId || !variationId) {
      return NextResponse.json(
        { error: "Product ID and Variation ID are required" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Verify user exists
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Create token entry
    const authToken = await AuthToken.create({
      userId: user._id,
      token,
      productId,
      variationId,
      expiresAt,
    });

    // Generate payment link
    const baseUrl =
      process.env.NEXT_PUBLIC_NEXTAUTH_URL || "http://localhost:3000";
    const paymentLink = `${baseUrl}/producto/${productId}?token=${token}`;

    console.log("✅ [Auth Token] Generated token:", {
      token,
      userId: user._id,
      productId,
      variationId,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      token,
      paymentLink,
      expiresAt,
    });
  } catch (error) {
    console.error("❌ [Generate Token] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 },
    );
  }
}
