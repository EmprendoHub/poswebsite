import { NextResponse } from "next/server";
import csv from "csv-parser";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json(
        { error: "CSV file is required" },
        { status: 400 },
      );
    }

    // Save uploaded CSV temporarily
    const tempPath = path.join("/tmp", file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(tempPath, buffer);

    // Parse CSV
    const products: any[] = [];
    await new Promise<void>((resolve, reject) => {
      interface ProductImage {
        url: string;
      }

      interface ProductVariation {
        title: string;
        stock: number;
        price: number;
        image: string;
      }

      interface Product {
        asin: string;
        title: string;
        description: string;
        price: number;
        stock: number;
        category: string;
        linea: string;
        gender: string;
        brand: string;
        images: ProductImage[];
        variations: ProductVariation[];
      }

      // Supports new English-header CSVs:
      // asin,title,description,price,stock,category,linea,gender,brand,images
      type CsvRow = Record<string, string>;

      fs.createReadStream(tempPath)
        .pipe(csv({ separator: "," }))
        .on("data", (row: CsvRow) => {
          const asin: string = row["asin"] || "";
          const title: string = row["title"] || "";
          const description: string = row["description"] || title;
          const priceString = (row["price"] || "0").replace(/[$,]/g, "");
          const price: number =
            Math.round((parseFloat(priceString) || 0) * 1.1 * 100) / 100;
          const stock: number = parseFloat(row["stock"] || "0") || 0;
          const category: string = row["category"] || "";
          const linea: string = row["linea"] || "";
          const gender: string = row["gender"] || "";
          const brand: string = row["brand"] || "";

          // Parse images from the "images" column (comma-separated paths).
          // Paths may be absolute (/mnt/.../cleaned_images/CAT/file.png) or
          // already relative (cleaned_images/CAT/file.png). Normalize to the
          // relative form so the frontend /api/images/[...path] route can serve them.
          let images: ProductImage[] = [];
          const rawImages = row["images"] || "";
          if (rawImages.trim()) {
            images = rawImages
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean)
              .map((p) => {
                // Extract everything from "cleaned_images/" onward
                const match = p.match(/cleaned_images\/.+/);
                return { url: match ? match[0] : p };
              });
          }

          console.log(
            `📦 Parsed "${title}" — ${images.length} image(s) from CSV`,
          );

          // Default variation
          const variations: ProductVariation[] = [
            {
              title,
              stock,
              price,
              image: images.length > 0 ? images[0].url : "",
            },
          ];

          const product: Product = {
            asin,
            title,
            description,
            price,
            stock,
            category,
            linea,
            gender,
            brand,
            images,
            variations,
          };

          products.push(product);
        })
        .on("end", () => resolve())
        .on("error", reject);
    });

    // Clean up temp file
    try {
      await fs.promises.unlink(tempPath);
    } catch (err) {
      console.warn("Could not delete temp file:", err);
    }

    return NextResponse.json({ success: true, products });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error parsing CSV" }, { status: 500 });
  }
}
