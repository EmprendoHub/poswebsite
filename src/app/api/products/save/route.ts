import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import path from "path";
import fs from "fs/promises";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";
import { mc } from "@/lib/minio";

import fsSync from "fs";

const IMAGES_ROOT = "/mnt/3TB/CLIENTES/SuperCollectiblesMx";

// Recursively find all directories named "cleaned_images" under root
function findCleanedImageDirs(root: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of fsSync.readdirSync(root, { withFileTypes: true })) {
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

// Resolve a relative cleaned_images/... path to the first matching absolute path
function resolveLocalPath(imgUrl: string): string {
  if (imgUrl.startsWith("/")) return imgUrl; // already absolute
  if (imgUrl.startsWith("cleaned_images/")) {
    const relative = imgUrl.replace(/^cleaned_images\//, "");
    // Re-scan on every call so newly added collection folders are found without restart
    const dirs = findCleanedImageDirs(IMAGES_ROOT);
    for (const base of dirs) {
      const candidate = path.join(base, relative);
      try {
        fsSync.accessSync(candidate);
        return candidate;
      } catch {
        // not in this dir, try next
      }
    }
    // Return first candidate even if not found (let caller handle the 404)
    return path.join(dirs[0] ?? IMAGES_ROOT, relative);
  }
  return path.join(process.cwd(), imgUrl);
}

// Generate a unique slug from title and ASIN
function generateSlug(title: string, asin: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .trim()
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

  // Add ASIN to ensure uniqueness
  return `${baseSlug}-${asin.toLowerCase()}`;
}

// Upload file to MinIO
async function uploadToMinio(
  localPath: string,
  bucket: string,
  fileName: string,
): Promise<string> {
  try {
    const etag = await mc.fPutObject(bucket, fileName, localPath);
    // Construct the MinIO URL correctly - should match the working format
    return `https://minio.salvawebpro.com:9000/${bucket}/${fileName}`;
  } catch (err) {
    throw new Error(`MinIO upload failed: ${err}`);
  }
}

// Generate CSV content for excluded products
function generateExcludedProductsCSV(excludedProducts: any[]): string {
  const headers = [
    "ASIN",
    "Title",
    "Category",
    "Price",
    "Stock",
    "Exclusion Reason",
    "Image Count",
    "Images Found",
  ].join(",");

  const rows = excludedProducts.map((product) => {
    const imagesList =
      product.images?.map((img: any) => img.url).join("; ") || "";
    return [
      `"${product.asin || ""}"`,
      `"${product.title || ""}"`,
      `"${product.category || ""}"`,
      `"${product.price || 0}"`,
      `"${product.stock || 0}"`,
      `"${product.exclusionReason || ""}"`,
      `"${product.images?.length || 0}"`,
      `"${imagesList}"`,
    ].join(",");
  });

  return [headers, ...rows].join("\n");
}

export async function POST(req: NextRequest) {
  const token: any = await getToken({ req });
  if (!token || !["manager", "super_admin"].includes(token.user.role)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { products } = await req.json();
    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: "Invalid products data" },
        { status: 400 },
      );
    }

    await dbConnect();

    const savedProducts: any[] = [];
    const excludedProducts: any[] = [];

    console.log(
      `🔄 Processing ${products.length} products for database save...`,
    );

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const {
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
      } = product;

      console.log(
        `\n📦 Processing product ${i + 1}/${products.length}: "${title}"`,
      );
      console.log(`   Images found: ${images?.length || 0}`);

      // EXCLUSION RULE 1: No images found
      if (!images || images.length === 0) {
        console.log(`❌ Excluding "${title}" - No images found`);
        excludedProducts.push({
          ...product,
          exclusionReason: "No images found",
        });
        continue;
      }

      console.log(
        `✅ "${title}" passed image count validation (${images.length} images)`,
      );

      const uploadedImages: { url: string; color?: string }[] = [];
      let shouldSkipProduct = false;

      // Check if all images exist before processing the product
      for (const img of images) {
        const localPath = resolveLocalPath(img.url);

        console.log(`   Checking image: ${img.url}`);
        console.log(`   Constructed path: ${localPath}`);

        // Check if file exists
        try {
          await fs.access(localPath);
          console.log(`   ✓ File exists: ${localPath}`);
        } catch (accessError) {
          console.error(`   ✗ File not found: ${localPath}`);

          // Let's also check what files actually exist in the directory
          const dir = path.dirname(localPath);
          const expectedFileName = path.basename(localPath);
          try {
            const actualFiles = await fs.readdir(dir);
            console.log(
              `   Directory contents (${dir}):`,
              actualFiles.slice(0, 5),
            ); // Show first 5 files
            console.log(`   Looking for: ${expectedFileName}`);

            // Look for similar files
            const similarFiles = actualFiles
              .filter((file) => {
                const similarity = file
                  .toLowerCase()
                  .includes(expectedFileName.toLowerCase().substring(0, 10));
                return similarity;
              })
              .slice(0, 3); // Show max 3 similar files

            if (similarFiles.length > 0) {
              console.log(`   Similar files found:`, similarFiles);
            }
          } catch (dirError) {
            console.error(`   Could not read directory: ${dir}`, dirError);
          }

          console.log(
            `❌ Excluding "${title}" - Missing image file: ${img.url}`,
          );
          excludedProducts.push({
            ...product,
            exclusionReason: `Missing image file: ${path.basename(img.url)}`,
          });
          shouldSkipProduct = true;
          break; // Exit the image loop early
        }
      }

      // Skip this entire product if any image is missing
      if (shouldSkipProduct) {
        continue; // Move to the next product
      }

      // Upload all images to MinIO (we know all files exist at this point)
      for (const img of images) {
        try {
          const localPath = resolveLocalPath(img.url);

          const fileName = `${asin}-${path.basename(img.url)}`;
          const minioUrl = (await uploadToMinio(
            localPath,
            "supercollectibles",
            fileName,
          )) as string;
          uploadedImages.push({ url: minioUrl, color: img.color || "" });
          console.log(`   ✅ Uploaded: ${fileName}`);
        } catch (imageError) {
          console.error(`   ❌ Error uploading image ${img.url}:`, imageError);
          excludedProducts.push({
            ...product,
            exclusionReason: `Failed to upload image: ${path.basename(
              img.url,
            )}`,
          });
          shouldSkipProduct = true;
          break;
        }
      }

      // Skip this product if any upload failed
      if (shouldSkipProduct) {
        console.log(`❌ Excluding "${title}" - Image upload failure`);
        continue;
      }

      // Ensure at least one variation
      const productVariations =
        variations && variations.length > 0
          ? variations.map((v: any, idx: number) => ({
              ...v,
              image: uploadedImages[idx]?.url || uploadedImages[0]?.url || "",
            }))
          : [
              {
                title: "Default",
                stock,
                price,
                image: uploadedImages[0]?.url || "",
              },
            ];

      // Create product document
      const productSlug = generateSlug(title, asin);

      try {
        const newProduct = await Product.create({
          ASIN: asin,
          title,
          slug: productSlug,
          description,
          price,
          stock,
          category,
          linea,
          gender,
          brand,
          images: uploadedImages,
          variations: productVariations,
          user: token.user._id,
        });

        savedProducts.push(newProduct);
        console.log(`✅ Saved to database: "${title}"`);
      } catch (productError: any) {
        if (productError.code === 11000) {
          // Duplicate key error — append ASIN suffix to both title and slug to make unique
          const uniqueSuffix = asin ? ` ${asin}` : ` ${Date.now()}`;
          const uniqueTitle = `${title}${uniqueSuffix}`;
          const uniqueSlug = generateSlug(uniqueTitle, asin) + `-${Date.now()}`;
          console.log(
            `   🔄 Duplicate title detected, saving as: "${uniqueTitle}"`,
          );

          try {
            const newProduct = await Product.create({
              ASIN: asin,
              title: uniqueTitle,
              slug: uniqueSlug,
              description,
              price,
              stock,
              category,
              linea,
              gender,
              brand,
              images: uploadedImages,
              variations: productVariations,
              user: token.user._id,
            });

            savedProducts.push(newProduct);
            console.log(
              `✅ Saved to database with unique title: "${uniqueTitle}"`,
            );
          } catch (retryError: any) {
            console.error(
              `❌ Database error on retry for "${title}":`,
              retryError,
            );
            excludedProducts.push({
              ...product,
              exclusionReason: `Database error: ${retryError.message}`,
            });
          }
        } else {
          console.error(`❌ Database error for "${title}":`, productError);
          excludedProducts.push({
            ...product,
            exclusionReason: `Database error: ${productError.message}`,
          });
        }
      }
    }

    console.log(`\n📊 Processing complete:`);
    console.log(`   ✅ Saved to database: ${savedProducts.length} products`);
    console.log(`   ❌ Excluded: ${excludedProducts.length} products`);

    // Generate CSV for excluded products
    let csvData = null;
    if (excludedProducts.length > 0) {
      csvData = generateExcludedProductsCSV(excludedProducts);
      console.log(
        `📄 Generated CSV for ${excludedProducts.length} excluded products`,
      );

      // Log exclusion reasons summary
      const reasonCounts: { [key: string]: number } = {};
      excludedProducts.forEach((product) => {
        const reason = product.exclusionReason.split(":")[0]; // Get main reason
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });
      console.log(`📈 Exclusion reasons:`, reasonCounts);
    }

    return NextResponse.json({
      success: true,
      products: savedProducts,
      excluded: excludedProducts,
      excludedCount: excludedProducts.length,
      savedCount: savedProducts.length,
      csvData: csvData, // Send CSV data to frontend
    });
  } catch (error: any) {
    console.error("Error saving products:", error);
    return NextResponse.json(
      { error: "Error saving products" },
      { status: 500 },
    );
  }
}
