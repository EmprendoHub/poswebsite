import { NextResponse } from "next/server";
import OpenAi from "openai";
import fs from "fs";
import path from "path";

const CLEANED_IMAGES_DIR =
  "/mnt/3TB/CLIENTES/SuperCollectiblesMx/2025/NEW PSA/cleaned_images";

// Function to estimate token count (rough approximation)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4); // Rough estimate: 1 token ≈ 4 characters
}

// Function to chunk images to fit within token limits
function chunkImages(images: string[], maxTokens: number = 6000): string[][] {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const image of images) {
    const imageTokens = estimateTokens(image);

    if (currentTokens + imageTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [image];
      currentTokens = imageTokens;
    } else {
      currentChunk.push(image);
      currentTokens += imageTokens;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// More lenient pre-filter to catch more potential matches
function preFilterImages(
  productTitle: string,
  availableImages: string[]
): string[] {
  const titleLower = productTitle.toLowerCase();
  const titleWords = titleLower
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);

  console.log(`Pre-filtering from ${availableImages.length} images...`);
  console.log(`Looking for words: [${titleWords.join(", ")}]`);

  // Extract key identifiers from title
  const extractKeyTerms = (title: string) => {
    const terms = [];
    const lowerTitle = title.toLowerCase();

    // Character names
    if (lowerTitle.includes("lebron")) terms.push("lebron");
    if (lowerTitle.includes("james")) terms.push("james");
    if (lowerTitle.includes("vegeta")) terms.push("vegeta");
    if (lowerTitle.includes("trafalgar")) terms.push("trafalgar");
    if (lowerTitle.includes("law")) terms.push("law");
    if (lowerTitle.includes("nami")) terms.push("nami");
    if (lowerTitle.includes("eustass")) terms.push("eustass");
    if (lowerTitle.includes("captain")) terms.push("captain");
    if (lowerTitle.includes("kid")) terms.push("kid");
    if (lowerTitle.includes("cheryl")) terms.push("cheryl");

    // Card codes
    const cardCode = title.match(/#?([A-Z]{2,}\d+[A-Z]*)/i);
    if (cardCode) terms.push(cardCode[1].toLowerCase());

    // Sets/Series
    if (lowerTitle.includes("home court")) terms.push("home", "court");
    if (lowerTitle.includes("dbs")) terms.push("dbs");
    if (lowerTitle.includes("dragon ball")) terms.push("dragon", "ball");
    if (lowerTitle.includes("one piece")) terms.push("one", "piece");
    if (lowerTitle.includes("pokemon")) terms.push("pokemon");
    if (lowerTitle.includes("romance dawn")) terms.push("romance", "dawn");
    if (lowerTitle.includes("sun moon")) terms.push("sun", "moon");
    if (lowerTitle.includes("alter genesis")) terms.push("alter", "genesis");
    if (lowerTitle.includes("rainbow")) terms.push("rainbow");

    // Years
    const years = title.match(/\b(19|20)\d{2}\b/g);
    if (years) terms.push(...years);

    return terms;
  };

  const keyTerms = extractKeyTerms(productTitle);
  console.log(`Key terms extracted: [${keyTerms.join(", ")}]`);

  const filtered = availableImages.filter((image) => {
    const imageLower = image.toLowerCase();

    // Count matches with key terms (more lenient)
    let matchCount = 0;
    for (const term of keyTerms) {
      if (imageLower.includes(term)) {
        matchCount++;
      }
    }

    // Also check original title words
    let wordMatches = 0;
    for (const word of titleWords) {
      if (imageLower.includes(word)) {
        wordMatches++;
      }
    }

    // Include if any key term matches OR at least 1 word match
    const isRelevant = matchCount > 0 || wordMatches >= 1;

    if (isRelevant) {
      console.log(
        `  ✓ Keeping: ${image} (${matchCount} key terms, ${wordMatches} words)`
      );
    }

    return isRelevant;
  });

  console.log(
    `Pre-filter result: ${filtered.length}/${availableImages.length} images`
  );
  return filtered;
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

  const { productTitle, category, availableImages } = await request.json();

  try {
    // Step 1: Pre-filter images to reduce the search space
    const relevantImages = preFilterImages(productTitle, availableImages);

    if (relevantImages.length === 0) {
      console.log(`No relevant images found for "${productTitle}"`);
      return NextResponse.json({ matches: [] }, { status: 200 });
    }

    // Step 2: If still too many images, chunk them
    const imageChunks = chunkImages(relevantImages, 5000); // Conservative limit
    console.log(
      `Processing ${imageChunks.length} chunks for "${productTitle}"`
    );

    let allMatches: string[] = [];

    // Step 3: Process each chunk
    for (let i = 0; i < imageChunks.length; i++) {
      const chunk = imageChunks[i];
      console.log(
        `Processing chunk ${i + 1}/${imageChunks.length} (${
          chunk.length
        } images)`
      );

      const prompt = `
You are an expert at matching trading card products to their image files. Be more LENIENT in your matching.

PRODUCT TO MATCH: "${productTitle}"

AVAILABLE IMAGE FILES:
${chunk.map((img: string, index: number) => `${index + 1}. ${img}`).join("\n")}

MATCHING GUIDELINES (be flexible):
- Look for character names (LEBRON JAMES, VEGETA, TRAFALGAR LAW, NAMI, EUSTASS CAPTAIN KID, CHERYL)
- Look for card codes (OP01002, ST01007, ST10013)
- Look for sets (HOME COURT, DBS, ONE PIECE, POKEMON, ROMANCE DAWN, SUN MOON, etc.)
- Look for years (2012, 2017, 2019, 2021, 2022, etc.)
- Look for grades (MINT, PRISTINE, PSA, BECKETT)
- Include ALL variations of the same card (01, 02, 03, etc.)

EXAMPLES OF GOOD MATCHES:
- "2012 Home Court Lebron James" should match "2012_Home_Court_Lebron_James_Firmada_Mint_9_01.png", "2012_Home_Court_Lebron_James_Firmada_Mint_9_02.png", "2012_Home_Court_Lebron_James_Firmada_Mint_9_03.png"
- "2017-23 DBS VEGETA" should match files with "DBS", "VEGETA"
- "2022 ONE PIECE TRAFALGAR LAW" should match files with "ONE_PIECE", "TRAFALGAR", "LAW"

RESPONSE: Return ALL matching filenames, one per line. Be inclusive rather than exclusive.
`;

      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-4",
        max_tokens: 800, // Increased for more matches
        temperature: 0.2, // Slightly higher for more creativity
        messages: [
          {
            role: "system",
            content:
              "You are a lenient matching expert. Include ALL possible matches for the product, including different card variations (01, 02, 03, etc.). Be inclusive, not exclusive.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const response = chatCompletion.choices[0].message.content?.trim();
      console.log(`AI Response for chunk ${i + 1}:`, response);

      if (response && response !== "NO_MATCH") {
        const chunkMatches = response
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && line.endsWith(".png"))
          .filter((filename) => chunk.includes(filename)); // Verify files exist in this chunk

        allMatches.push(...chunkMatches);
        console.log(
          `Found ${chunkMatches.length} matches in chunk ${i + 1}:`,
          chunkMatches
        );
      }

      // Small delay between chunks to avoid rate limiting
      if (i < imageChunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Remove duplicates
    const uniqueMatches = Array.from(new Set(allMatches));

    console.log(`Final matches for "${productTitle}":`, uniqueMatches);
    return NextResponse.json({ matches: uniqueMatches }, { status: 200 });
  } catch (error) {
    console.error("Error with AI image matching:", error);
    return NextResponse.json(
      { error: "Failed to match images with AI" },
      { status: 500 }
    );
  }
}
