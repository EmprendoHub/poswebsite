import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import AuthToken from "@/backend/models/AuthToken";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    await dbConnect();

    const authToken = await AuthToken.findOne({ token });

    if (!authToken) {
      console.warn("⚠️ [Verify Token] Token not found:", token);
      return NextResponse.json(
        { valid: false, error: "Token not found" },
        { status: 404 },
      );
    }

    // Check if token is expired
    const now = new Date();
    if (authToken.expiresAt < now) {
      console.warn("⚠️ [Verify Token] Token expired:", token);
      return NextResponse.json(
        { valid: false, error: "Token has expired" },
        { status: 410 },
      );
    }

    // Check if token was already used
    if (authToken.used) {
      console.warn("⚠️ [Verify Token] Token already used:", token);
      return NextResponse.json(
        { valid: false, error: "Token has already been used" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      valid: true,
      productId: authToken.productId,
      variationId: authToken.variationId,
      expiresAt: authToken.expiresAt,
    });
  } catch (error) {
    console.error("❌ [Verify Token] Error:", error);
    return NextResponse.json(
      { error: "Failed to verify token" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    await dbConnect();

    const authToken = await AuthToken.findOne({ token });

    if (!authToken) {
      return NextResponse.json(
        { valid: false, error: "Token not found" },
        { status: 404 },
      );
    }

    // Check if token is expired
    const now = new Date();
    if (authToken.expiresAt < now) {
      return NextResponse.json(
        { valid: false, error: "Token has expired" },
        { status: 410 },
      );
    }

    // Check if token was already used
    if (authToken.used) {
      return NextResponse.json(
        { valid: false, error: "Token has already been used" },
        { status: 403 },
      );
    }

    // Mark token as used after first successful verification
    authToken.used = true;
    authToken.usedAt = new Date();
    await authToken.save();

    return NextResponse.json({
      valid: true,
      productId: authToken.productId,
      variationId: authToken.variationId,
      expiresAt: authToken.expiresAt,
    });
  } catch (error) {
    console.error("❌ [Verify Token] Error:", error);
    return NextResponse.json(
      { error: "Failed to verify token" },
      { status: 500 },
    );
  }
}
