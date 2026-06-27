import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";
import { NextRequest, NextResponse } from "next/server";

// Calculate similarity score between two strings
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // If one string contains the other, high match
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.95;
  }

  // Split into words, filter out common stopwords and pure numbers
  const stopwords = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "en",
    "el",
    "la",
    "de",
    "para",
    "con",
  ]);

  // Filter: must have at least 4 characters AND at least one letter (not pure numbers)
  const isValidWord = (w: string) => {
    return (
      w.length > 3 && !stopwords.has(w) && /[a-z]/.test(w) // Must contain at least one letter
    );
  };

  const words1 = s1.split(/\s+/).filter(isValidWord);
  const words2 = s2.split(/\s+/).filter(isValidWord);

  // REQUIRE at least one meaningful word in the search term
  if (words2.length === 0) {
    return 0; // No meaningful words to search for
  }

  // Count matching words (must be exact match or one contains the other)
  let matchingWords = 0;
  for (const word2 of words2) {
    for (const word1 of words1) {
      if (
        word1 === word2 ||
        word1.startsWith(word2) ||
        word2.startsWith(word1)
      ) {
        matchingWords++;
        break;
      }
    }
  }

  // REQUIRE at least one matching word for meaningful matches
  if (matchingWords === 0) {
    return 0; // No matching words = no match
  }

  // Calculate word similarity ratio
  const wordSimilarity = matchingWords / Math.max(words1.length, words2.length);

  // Character-level similarity for truncated titles
  let charMatches = 0;
  const minLen = Math.min(s1.length, s2.length);
  for (let i = 0; i < minLen; i++) {
    if (s1[i] === s2[i]) charMatches++;
  }
  const charSimilarity = charMatches / Math.max(s1.length, s2.length);

  // Combined score: 60% word matching + 40% character matching
  // This ensures word matching is still primary but gives more weight to character similarity
  return wordSimilarity * 0.6 + charSimilarity * 0.4;
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const title = searchParams.get("title");

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, found: false, message: "Title parameter required" },
        { status: 400 },
      );
    }

    // Get all products and score them
    const allProducts = await Product.find({
      title: { $exists: true, $ne: "" },
    }).lean();

    // Score and filter products
    const scoredProducts = allProducts
      .map((product: any) => ({
        ...product,
        _id: product._id?.toString() || product._id, // Ensure _id is a string
        score: calculateSimilarity(title, product.title),
      }))
      .filter((product) => product.score > 0.45) // Lowered threshold to 0.45 to catch partial matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Return top 10 matches

    if (scoredProducts.length === 0) {
      return NextResponse.json(
        {
          success: true,
          found: false,
          products: [],
          message: "No similar products found",
        },
        { status: 200 },
      );
    }

    // Return first match as primary result, plus alternatives
    return NextResponse.json(
      {
        success: true,
        found: true,
        product: scoredProducts[0],
        alternatives: scoredProducts.slice(1),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error searching by title:", error);
    return NextResponse.json(
      { success: false, found: false, message: "Error searching for products" },
      { status: 500 },
    );
  }
}
