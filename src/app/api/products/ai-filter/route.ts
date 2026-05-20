import { NextResponse } from "next/server";
import OpenAi from "openai";

// Function to clean product names exactly like the Python script
function clean_name(name: string): string {
  // Remove all special characters except letters, numbers, and spaces
  let cleaned = name.replace(/[^a-zA-Z0-9 ]/g, "");
  // Replace multiple spaces with single underscore
  cleaned = cleaned.replace(/\s+/g, "_");
  // Remove leading/trailing underscores
  cleaned = cleaned.trim().replace(/^_+|_+$/g, "");
  return cleaned;
}

export async function POST(request: any) {
  const cookie = await request.headers.get("cookie");
  if (!cookie) {
    return new Response(JSON.stringify("You are not authorized"), {
      status: 400,
    });
  }

  const openai = new OpenAi({
    apiKey: process.env.OPEN_AI_KEY,
  });

  const { products, selectedIndices } = await request.json();

  try {
    console.log(
      `🤖 Starting AI filtering for ${
        selectedIndices?.length || products.length
      } products...`
    );

    const filteredProducts = [...products]; // Copy all products

    // Determine which products to process
    const productsToProcess = selectedIndices
      ? selectedIndices.map((index: number) => ({
          product: products[index],
          index,
        }))
      : products.map((product: any, index: number) => ({ product, index }));

    let processedCount = 0;

    for (const { product, index } of productsToProcess) {
      // Only filter products that have 2+ images
      if (product.images && product.images.length >= 2) {
        console.log(
          `\n🤖 AI filtering product ${processedCount + 1}: "${product.title}"`
        );
        console.log(`Images to filter: ${product.images.length}`);

        try {
          // Extract filenames from image URLs
          const imageFilenames = product.images.map((img: any) => {
            const urlParts = img.url.split("/");
            return urlParts[urlParts.length - 1]; // Get just the filename
          });

          console.log("🔍 Available images:", imageFilenames);

          // Clean the product name exactly like the Python script does
          const cleanedProductName = clean_name(product.title);
          console.log(
            `🧹 Cleaned product name: "${product.title}" → "${cleanedProductName}"`
          );

          const prompt = `
You are a trading card image matching expert. You need to identify which images belong to this specific product.

IMPORTANT CONTEXT:
- Images were processed by a Python script that cleans product names and adds sequential numbers
- The Python script removes special characters and replaces spaces with underscores
- Then adds _01, _02, _03, etc. to the end of each image filename

PRODUCT: "${product.title}"
CLEANED PRODUCT NAME (Python processed): "${cleanedProductName}"
EXPECTED IMAGE PATTERN: "${cleanedProductName}_01.png", "${cleanedProductName}_02.png", etc.

AVAILABLE IMAGES:
${imageFilenames
  .map((filename: string, idx: number) => `${idx + 1}. ${filename}`)
  .join("\n")}

MATCHING ANALYSIS:

1. EXACT PATTERN MATCHING (Highest Priority):
   - Look for images that start with "${cleanedProductName}_" followed by numbers
   - These are the images that were correctly processed by the Python script
   - Example: "${cleanedProductName}_01.png", "${cleanedProductName}_02.png"

2. CHARACTER/PLAYER VALIDATION:
   - All images should have the same character/player as the product
   - Different characters should be removed (VEGETA ≠ GOKU, NAMI ≠ LUFFY, etc.)

3. SET/SERIES VALIDATION:
   - All images should be from the same set/series as the product
   - Different sets should be removed (RUSH ATTACK ≠ FUSION WORLD, ROMANCE DAWN ≠ ALTERNATE ART)

4. CARD CODE VALIDATION:
   - If the product has a specific card code, images should match that code
   - Different card codes indicate different cards entirely

ANALYSIS STEPS:
1. First, identify images that exactly match the pattern "${cleanedProductName}_XX.png"
2. Then, check if remaining images belong to the same character/set but might have slight naming differences
3. Remove any images that clearly belong to different characters, sets, or card codes

BE CONSERVATIVE: When in doubt, keep images that seem related to the same product, even if the naming is slightly different.

RESPONSE FORMAT: Return ONLY the filenames that should be KEPT, one per line:
filename1.png
filename2.png
filename3.png
`;

          const chatCompletion = await openai.chat.completions.create({
            model: "gpt-4",
            max_tokens: 300,
            temperature: 0.0,
            messages: [
              {
                role: "system",
                content: `You understand that images were processed by a Python script that cleans names to "${cleanedProductName}" format and adds _01, _02, _03 suffixes. Prioritize exact pattern matches but also consider similar products with slight naming variations.`,
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          });

          const response = chatCompletion.choices[0].message.content?.trim();
          console.log(`🤖 Raw AI Response:`, response);

          if (response && response !== "NO_MATCH") {
            // Parse approved filenames - handle both numbered lists and plain filenames
            const approvedFilenames = response
              .split("\n")
              .map((line) => {
                // Remove leading numbers and dots (e.g., "1. filename.png" → "filename.png")
                const cleaned = line.trim().replace(/^\d+\.\s*/, "");
                return cleaned;
              })
              .filter((line) => line.length > 0 && line.endsWith(".png"))
              .filter((filename) => imageFilenames.includes(filename)); // Verify files exist

            console.log(`🎯 Parsed approved filenames:`, approvedFilenames);

            const originalImageCount = product.images.length;

            // Apply filtering to the product at the correct index
            filteredProducts[index].images = product.images.filter(
              (img: any) => {
                const filename = img.url.split("/").pop();
                const shouldKeep = approvedFilenames.includes(filename);
                console.log(`  ${shouldKeep ? "✅" : "❌"} ${filename}`);
                return shouldKeep;
              }
            );

            // Safety check: if AI removed ALL images but we expected some exact matches, keep at least the best match
            if (
              filteredProducts[index].images.length === 0 &&
              originalImageCount > 0
            ) {
              console.log(
                `⚠️  AI removed ALL images, checking for exact pattern matches...`
              );

              // Look for exact pattern matches as fallback
              const exactMatches = product.images.filter((img: any) => {
                const filename =
                  img.url.split("/").pop()?.replace(".png", "") || "";
                const expectedPattern = new RegExp(
                  `^${cleanedProductName.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                  )}_\\d{2}$`
                );
                return expectedPattern.test(filename);
              });

              if (exactMatches.length > 0) {
                console.log(
                  `🔄 Found ${exactMatches.length} exact pattern matches, keeping those`
                );
                filteredProducts[index].images = exactMatches;
              } else {
                console.log(
                  `🔄 No exact matches found, keeping first image as fallback`
                );
                filteredProducts[index].images = [product.images[0]];
              }
            }

            // Update variation image if needed
            if (filteredProducts[index].images.length > 0) {
              filteredProducts[index].variations[0].image =
                filteredProducts[index].images[0].url;
            } else {
              filteredProducts[index].variations[0].image = "";
            }

            const removedCount =
              originalImageCount - filteredProducts[index].images.length;
            console.log(
              `✅ AI filtering result: ${originalImageCount} → ${filteredProducts[index].images.length} images (removed ${removedCount}) for "${product.title}"`
            );

            if (removedCount > 0) {
              const keptImages = filteredProducts[index].images.map(
                (img: any) => img.url.split("/").pop()
              );
              const removedImages = imageFilenames.filter(
                (filename: string) => !keptImages.includes(filename)
              );
              console.log(`🗑️  Removed images:`, removedImages);
              console.log(`✅ Kept images:`, keptImages);
            }
          } else {
            console.log(
              `⚠️  AI returned NO_MATCH or empty response - keeping original images`
            );
          }

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ AI filtering error for "${product.title}":`, error);
          // Keep original images on error
        }
      } else {
        console.log(
          `⏭️  Skipping "${product.title}" (${
            product.images?.length || 0
          } images - needs 2+ to filter)`
        );
      }

      processedCount++;

      // Progress update
      if (processedCount % 3 === 0) {
        console.log(
          `Progress: ${processedCount}/${productsToProcess.length} products processed`
        );
      }
    }

    console.log(`✅ AI filtering complete for ${processedCount} products`);

    return NextResponse.json({
      success: true,
      products: filteredProducts,
      message: "AI filtering completed",
    });
  } catch (error) {
    console.error("Error with AI filtering:", error);
    return NextResponse.json(
      { error: "Failed to filter products with AI", products: products },
      { status: 500 }
    );
  }
}
