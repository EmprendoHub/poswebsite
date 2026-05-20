import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CLEANED_IMAGES_DIR =
  "/mnt/3TB/CLIENTES/SuperCollectiblesMx/2025/NEW PSA/cleaned_images";

export async function POST(request: any) {
  try {
    const { category, fileName } = await request.json();

    const categoryPath = path.join(CLEANED_IMAGES_DIR, category);
    const filePath = path.join(categoryPath, fileName);

    console.log(`🔍 Checking file: ${filePath}`);

    const response: {
      categoryExists: boolean;
      fileExists: boolean;
      categoryPath: string;
      filePath: string;
      availableFiles: string[];
    } = {
      categoryExists: fs.existsSync(categoryPath),
      fileExists: fs.existsSync(filePath),
      categoryPath,
      filePath,
      availableFiles: [],
    };

    if (response.categoryExists) {
      response.availableFiles = fs
        .readdirSync(categoryPath)
        .filter((f) => f.toLowerCase().endsWith(".png"))
        .filter(
          (f) =>
            f.toLowerCase().includes("eustass") ||
            f.toLowerCase().includes("captain") ||
            f.toLowerCase().includes("kid") ||
            f.toLowerCase().includes("st10013")
        )
        .slice(0, 5);
    }

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
