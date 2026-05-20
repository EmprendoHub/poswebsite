import { NextRequest, NextResponse } from "next/server";
import { mc } from "@/lib/minio";
import { getToken } from "next-auth/jwt";

export async function DELETE(req: NextRequest) {
  try {
    // Check authorization
    const token = await getToken({ req });
    if (
      !token ||
      typeof token.user !== "object" ||
      token.user === null ||
      !["manager", "super_admin"].includes(
        (token.user as { role?: string }).role ?? "",
      )
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 },
      );
    }

    // Extract bucket and object name from the URL
    // Expected format: https://minio.salvawebpro.com:9000/supercollectibles/filename.jpg
    const urlParts = imageUrl.split("/");
    const bucket = urlParts[urlParts.length - 2]; // supercollectibles
    const objectName = urlParts[urlParts.length - 1]; // filename.jpg

    if (!bucket || !objectName) {
      return NextResponse.json(
        { error: "Invalid image URL format" },
        { status: 400 },
      );
    }

    // Delete the object from MinIO
    await mc.removeObject(bucket, objectName);

    console.log(`Successfully deleted: ${bucket}/${objectName}`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${objectName}`,
    });
  } catch (error: any) {
    console.error("Error deleting image from MinIO:", error);
    return NextResponse.json(
      { error: "Failed to delete image", details: error.message },
      { status: 500 },
    );
  }
}
