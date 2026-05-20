import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const IMAGES_ROOT = "/mnt/3TB/CLIENTES/SuperCollectiblesMx";

// Recursively find all directories named "cleaned_images" under root
function findCleanedImageDirs(root: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const fullPath = path.join(root, entry.name);
      if (entry.name === "cleaned_images") {
        results.push(fullPath);
      } else {
        results.push(...findCleanedImageDirs(fullPath));
      }
    }
  } catch {
    // ignore unreadable dirs
  }
  // Sort newest-first: deeper 2026 paths before 2025, etc.
  return results.sort((a, b) => b.localeCompare(a));
}

const CLEANED_IMAGE_DIRS = findCleanedImageDirs(IMAGES_ROOT);

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  try {
    console.log(`🖼️  Image request: ${request.url}`);
    console.log(`📋 URL params:`, params.path);

    // Re-scan on each request so newly added collection folders are found without restart
    const cleanedImageDirs = findCleanedImageDirs(IMAGES_ROOT);

    // Try each base directory until we find the file
    let filePath: string | null = null;
    for (const baseDir of cleanedImageDirs) {
      const candidate = path.join(baseDir, ...params.path);
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }

    // Check if file exists
    if (!filePath) {
      console.log(
        `❌ Image not found in any directory: ${params.path.join("/")}`,
      );
      return new NextResponse("Image not found", { status: 404 });
    }

    // Read the file
    const fileBuffer = fs.readFileSync(filePath);

    if (!fileBuffer || fileBuffer.length === 0) {
      console.log(`❌ File is empty or couldn't be read: ${filePath}`);
      return new NextResponse("Empty file", { status: 404 });
    }

    console.log(
      `✅ Successfully read file: ${filePath} (${fileBuffer.length} bytes)`,
    );

    // Determine content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    let contentType = "image/jpeg"; // default

    switch (ext) {
      case ".png":
        contentType = "image/png";
        break;
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg";
        break;
      case ".gif":
        contentType = "image/gif";
        break;
      case ".webp":
        contentType = "image/webp";
        break;
    }

    // Convert Buffer to Uint8Array which is compatible with NextResponse
    const uint8Array = new Uint8Array(fileBuffer);

    // Return the image with proper headers
    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000", // Cache for 1 year
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
