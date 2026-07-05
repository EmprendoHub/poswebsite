export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Simple in-memory cache for PSA lookups (avoids rate limit issues)
const psaCertCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// eBay Browse API configuration
const EBAY_IS_SANDBOX = process.env.EBAY_CLIENT_ID?.includes("SBX") || false;
const EBAY_API_BASE = EBAY_IS_SANDBOX
  ? "https://api.sandbox.ebay.com/buy/browse/v1"
  : "https://api.ebay.com/buy/browse/v1";
const EBAY_AUTH_URL = EBAY_IS_SANDBOX
  ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
  : "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID || "";
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET || "";

// PSA API configuration
const PSA_API_BASE = "https://api.psacard.com/publicapi";
const PSA_ACCESS_TOKEN = process.env.PSA_ACCESS_TOKEN || "";
const PSA_API_KEY = process.env.PSA_API_KEY || PSA_ACCESS_TOKEN;

// Currency conversion rate: 1 USD = 17 MXN (approximate, can be adjusted)
const USD_TO_MXN_RATE = 18;

// Convert USD price to MXN
function convertUsdToMxn(usdPrice: number): number {
  return Math.round(usdPrice * USD_TO_MXN_RATE * 100) / 100;
}

interface EbayMatchResult {
  title: string;
  price: number;
  currency: string;
  matchPercentage: number;
  matchReasons: string[];
  itemWebUrl: string;
  imageUrl?: string;
}

interface PriceCheckResult {
  ebay?: {
    price: number;
    currency: string;
    listingCount: number;
    sourceUrl?: string;
  };
  ebayResults?: EbayMatchResult[];
  psa?: {
    gradeLabel: string;
    avgPrice: number;
    listingCount: number;
    sourceUrl?: string;
  };
  cardDetails?: {
    certNumber: string;
    cardName: string;
    gradeLabel: string;
    grade: number;
    setName: string;
    year: number;
    cardNumber: string;
    imageUrl?: string;
  };
  success: boolean;
  message: string;
}

// Get eBay OAuth token
async function getEBayToken(): Promise<string | null> {
  try {
    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
      console.log("⚠️ eBay credentials not configured");
      return null;
    }

    console.log(`🔐 Getting eBay OAuth token from: ${EBAY_AUTH_URL}`);
    console.log(`🏪 Sandbox Mode: ${EBAY_IS_SANDBOX}`);

    const credentials = Buffer.from(
      `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`,
    ).toString("base64");

    const response = await fetch(EBAY_AUTH_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ eBay OAuth error: ${response.status} ${response.statusText}`,
      );
      console.error(`📝 Error details: ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log("✅ eBay OAuth token obtained successfully");
    return data.access_token || null;
  } catch (error) {
    console.error("❌ eBay token retrieval error:", error);
    return null;
  }
}

// Helper function to extract certificator and grade from title
function parseCertificatorAndGrade(title: string): {
  certificator: string | null;
  grade: string | null;
  cardName: string;
} {
  const certificators = ["PSA", "CGC", "BGS", "SGC", "CSG"];
  let certificator: string | null = null;
  let grade: string | null = null;

  // Look for certificator in title
  for (const cert of certificators) {
    if (title.toUpperCase().includes(cert)) {
      certificator = cert;
      break;
    }
  }

  // Extract grade (look for patterns like "10", "9.5", "NM", "M", "PSA 10", "Grade 10", etc.)
  const gradePatterns = [
    /(?:PSA|CGC|BGS|SGC|CSG)\s*(?:Grade\s*)?(\d+\.?\d*)/i,
    /Grade\s*(\d+\.?\d*)/i,
    /\b([0-9]{1,2}(?:\.[0-9])?\s*(?:\/10)?)\b/,
  ];

  for (const pattern of gradePatterns) {
    const match = title.match(pattern);
    if (match) {
      grade = match[1].trim();
      break;
    }
  }

  // Remove certificator and grade from title to get card name
  let cardName = title;
  if (certificator) {
    cardName = cardName.replace(
      new RegExp(`${certificator}\\s*(?:Grade\\s*)?\\d+\\.?\\d*\\s*`, "i"),
      "",
    );
  }
  cardName = cardName.trim();

  return { certificator, grade, cardName };
}

// Calculate match percentage for an eBay item
function calculateMatchPercentage(
  itemTitle: string,
  cert: string | null,
  grade: string | null,
  cardName: string,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const normalizedTitle = itemTitle.toUpperCase();
  const normalizedCard = cardName.toUpperCase();

  // Card name matching (highest priority)
  if (cardName && normalizedTitle.includes(normalizedCard)) {
    score += 30;
    reasons.push("Card name match");
  } else if (cardName) {
    // Check for partial card name match
    const cardWords = normalizedCard.split(/\s+/);
    const matchedWords = cardWords.filter((word) =>
      normalizedTitle.includes(word),
    );
    if (matchedWords.length > 0) {
      score += Math.round((matchedWords.length / cardWords.length) * 20);
      reasons.push(
        `Card name partial match (${matchedWords.length}/${cardWords.length})`,
      );
    }
  }

  // Certificator matching (PSA, CGC, etc.)
  if (cert) {
    if (normalizedTitle.includes(cert.toUpperCase())) {
      score += 35;
      reasons.push(`Contains ${cert}`);
    } else {
      // Check for other graders - penalize if different grader found
      const graders = ["PSA", "CGC", "BGS", "SGC", "CSG"];
      const foundGrader = graders.find((g) => normalizedTitle.includes(g));
      if (foundGrader) {
        score += 10;
        reasons.push(`Different grader: ${foundGrader}`);
      }
    }
  }

  // Grade matching
  if (grade) {
    const normalizedGrade = grade.replace(/\s*\/10\s*$/, "").trim();
    const gradeValue = parseFloat(normalizedGrade);

    // Exact grade match
    if (normalizedTitle.includes(normalizedGrade)) {
      score += 25;
      reasons.push(`Grade ${grade} match`);
    } else if (!isNaN(gradeValue)) {
      // Check for any grade in title
      const gradePattern = /\b([1-9]|10)(?:\.\d+)?\b/g;
      const gradeMatches = itemTitle.match(gradePattern) || [];

      if (gradeMatches.length > 0) {
        const firstGradeMatch = gradeMatches[0];
        if (firstGradeMatch) {
          const itemGrade = parseFloat(firstGradeMatch);
          const gradeDiff = Math.abs(itemGrade - gradeValue);

          if (gradeDiff === 0) {
            score += 25;
            reasons.push(`Grade ${firstGradeMatch} match`);
          } else if (gradeDiff <= 0.5) {
            score += 15;
            reasons.push(`Grade ${firstGradeMatch} (close to ${grade})`);
          } else if (gradeDiff <= 1) {
            score += 5;
            reasons.push(`Grade ${firstGradeMatch} (within 1 point)`);
          }
        }
      }
    }
  }

  // Ensure score doesn't exceed 100
  const finalScore = Math.min(score, 100);

  return {
    score: finalScore,
    reasons,
  };
}

// Helper function to check if eBay item matches certificator and grade
function itemMatchesCriteria(
  itemTitle: string,
  requiredCertificator: string | null,
  requiredGrade: string | null,
): boolean {
  if (!requiredCertificator && !requiredGrade) {
    // If no specific criteria, accept the item
    return true;
  }

  const itemTitleUpper = itemTitle.toUpperCase();
  const certificators = ["PSA", "CGC", "BGS", "SGC", "CSG"];

  // Check if item contains the required certificator
  if (requiredCertificator) {
    if (!itemTitleUpper.includes(requiredCertificator.toUpperCase())) {
      return false;
    }
  }

  // Check if item contains the required grade
  if (requiredGrade) {
    // Normalize grade format (remove /10 if present)
    const normalizedGrade = requiredGrade.replace(/\s*\/10\s*$/, "").trim();

    // Look for exact grade match or pattern match
    const gradePatterns = [
      new RegExp(`${normalizedGrade}\\s*(?:/10)?`, "i"),
      new RegExp(`Grade\\s*${normalizedGrade}`, "i"),
      new RegExp(
        `${requiredCertificator}\\s*(?:Grade\\s*)?${normalizedGrade}`,
        "i",
      ),
    ];

    for (const pattern of gradePatterns) {
      if (pattern.test(itemTitle)) {
        return true;
      }
    }

    return false;
  }

  return true;
}

// Search eBay for similar items
async function searchEBay(
  title: string,
  asin?: string,
): Promise<PriceCheckResult["ebay"]> {
  try {
    // Parse title to extract certificator and grade
    const { certificator, grade, cardName } = parseCertificatorAndGrade(title);

    console.log(
      `🔍 Parsed title - Certificator: ${certificator}, Grade: ${grade}, Card: ${cardName}`,
    );

    // Get fresh OAuth token
    const token = await getEBayToken();
    if (!token) {
      console.log("⚠️ Could not obtain eBay OAuth token");
      return undefined;
    }

    // Build search query - ALWAYS use cardName, NEVER use ASIN for eBay (ASIN is for PSA cert lookup)
    const searchQuery = cardName;
    const url = `${EBAY_API_BASE}/item_summary/search?q=${encodeURIComponent(searchQuery)}&limit=50&filter=priceCurrency:MXN,saleCompletedFilter:Completed`;

    console.log(
      `🔍 Searching eBay for: "${searchQuery}" with ${certificator || "any"} ${grade || "any grade"}`,
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_MX",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `❌ eBay API error: ${response.status} ${response.statusText}`,
      );

      // For sandbox mode, return mock data for testing
      if (EBAY_IS_SANDBOX) {
        console.log("📦 Sandbox mode: Returning demo eBay data");
        return {
          price: 899.99,
          currency: "MXN",
          listingCount: 12,
          sourceUrl: "https://www.ebay.com.mx/sch/i.html?_nkw=Dark+Magician",
        };
      }

      return undefined;
    }

    const data = await response.json();
    let items = data.itemSummaries || [];

    console.log(`📦 Found ${items.length} items on eBay`);

    // Score all items based on match percentage
    const scoredItems = items
      .map((item: any) => {
        const { score, reasons } = calculateMatchPercentage(
          item.title,
          certificator,
          grade,
          cardName,
        );
        return {
          title: item.title,
          price: parseFloat(item.price?.value || 0),
          currency: item.price?.currency || "MXN",
          matchPercentage: score,
          matchReasons: reasons,
          itemWebUrl: item.itemWebUrl,
          imageUrl: item.image?.imageUrl,
        };
      })
      .filter((item: any) => item.price > 0) // Only items with valid prices
      .sort((a: any, b: any) => b.matchPercentage - a.matchPercentage) // Sort by match % descending
      .slice(0, 10); // Take top 10 results

    console.log(
      `✅ Found ${scoredItems.length} items with scoring (top matches first)`,
    );

    if (scoredItems.length > 0) {
      // Calculate average price from all results (not just top matches)
      const prices = scoredItems
        .map((item: any) => item.price)
        .filter((price: number) => price > 0);

      if (prices.length > 0) {
        const avgPrice =
          prices.reduce((a: number, b: number) => a + b, 0) / prices.length;

        return {
          price: convertUsdToMxn(avgPrice),
          currency: "MXN",
          listingCount: scoredItems.length,
          sourceUrl: scoredItems[0]?.itemWebUrl,
        };
      }
    } else if (items.length === 0 && EBAY_IS_SANDBOX) {
      // Sandbox mode with no results - return demo data
      console.log("📦 Sandbox mode: No results, returning demo eBay data");
      return {
        price: 899.99,
        currency: "MXN",
        listingCount: 12,
        sourceUrl: "https://www.ebay.com.mx/sch/i.html?_nkw=Dark+Magician",
      };
    }

    console.log(`⚠️ No valid eBay items found for ${certificator} ${grade}`);
    return undefined;
  } catch (error) {
    console.error("❌ eBay price check error:", error);
    return undefined;
  }
}

// Search eBay and return multiple matched results with percentages
async function searchEBayMultiple(
  title: string,
  asin?: string,
): Promise<EbayMatchResult[]> {
  try {
    // Parse title to extract certificator and grade
    const { certificator, grade, cardName } = parseCertificatorAndGrade(title);

    console.log(
      `🔍 Parsed title - Certificator: ${certificator}, Grade: ${grade}, Card: ${cardName}`,
    );

    // Get fresh OAuth token
    const token = await getEBayToken();
    if (!token) {
      console.log("⚠️ Could not obtain eBay OAuth token");
      return [];
    }

    // Build search query - ALWAYS use cardName, NEVER use ASIN for eBay (ASIN is for PSA cert lookup)
    const searchQuery = cardName;
    const url = `${EBAY_API_BASE}/item_summary/search?q=${encodeURIComponent(searchQuery)}&limit=50&filter=priceCurrency:MXN,saleCompletedFilter:Completed`;

    console.log(
      `🔍 Searching eBay for: "${searchQuery}" with ${certificator || "any"} ${grade || "any grade"}`,
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_MX",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `❌ eBay API error: ${response.status} ${response.statusText}`,
      );
      return [];
    }

    const data = await response.json();
    let items = data.itemSummaries || [];

    console.log(`📦 Found ${items.length} items on eBay`);

    // Score all items based on match percentage
    const scoredItems = items
      .map((item: any) => {
        const { score, reasons } = calculateMatchPercentage(
          item.title,
          certificator,
          grade,
          cardName,
        );
        return {
          title: item.title,
          price: convertUsdToMxn(parseFloat(item.price?.value || 0)),
          currency: "MXN",
          matchPercentage: score,
          matchReasons: reasons,
          itemWebUrl: item.itemWebUrl,
          imageUrl: item.image?.imageUrl,
        };
      })
      .filter((item: any) => item.price > 0) // Only items with valid prices
      .sort((a: any, b: any) => b.matchPercentage - a.matchPercentage) // Sort by match % descending
      .slice(0, 10); // Take top 10 results

    console.log(
      `✅ Scored ${scoredItems.length} items for display (top 10 matches)`,
    );

    return scoredItems;
  } catch (error) {
    console.error("❌ eBay multi-search error:", error);
    return [];
  }
}

// Search PSA for card information and pricing
async function searchPSA(title: string): Promise<PriceCheckResult["psa"]> {
  try {
    if (!PSA_API_KEY) {
      console.log("⚠️ PSA API key not configured");
      return undefined;
    }

    // For now, we'll skip PSA title search as the cert lookup handles it better
    // The cert lookup by ASIN (cert number) is more reliable
    console.log("ℹ️ PSA title search skipped - using cert lookup instead");
    return undefined;
  } catch (error) {
    console.log("⚠️ PSA search error:", error);
    return undefined;
  }
}

// Scrape PSA card details from cert page (backup when API fails)
async function scrapePSACardDetails(
  certNumber: string,
): Promise<PriceCheckResult["cardDetails"] | undefined> {
  try {
    const url = `https://www.psacard.com/cert/${certNumber}/psa`;
    console.log(
      `🕷️ Scraping PSA cert page: ${url} (attempting with multiple strategies)`,
    );

    // Strategy 1: Try with comprehensive browser headers
    let response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Cache-Control": "max-age=0",
        Pragma: "no-cache",
      },
    });

    if (!response.ok) {
      console.log(
        `⚠️ PSA scrape HTTP ${response.status}: ${response.statusText}. Attempting alternative approach...`,
      );

      // Strategy 2: Try the API endpoint with different format
      const apiUrl = `https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`;
      console.log(`🔄 Trying alternative PSA API endpoint: ${apiUrl}`);

      response = await fetch(apiUrl);

      if (!response.ok) {
        console.log(
          `⚠️ Alternative endpoint also failed (${response.status}). PSA data temporarily unavailable.`,
        );
        return undefined;
      }
    }

    const html = await response.text();

    // Try to parse as JSON first (in case we got API response)
    if (html.startsWith("{")) {
      try {
        const jsonData = JSON.parse(html);
        if (jsonData.CertNumber || jsonData.CardName) {
          const cardDetails = {
            certNumber: jsonData.CertNumber || certNumber,
            cardName: jsonData.CardName || "Unknown",
            gradeLabel: jsonData.GradeLabel || `PSA ${jsonData.Grade || "?"}`,
            grade: jsonData.Grade ? parseFloat(jsonData.Grade) : 0,
            setName: jsonData.SetName || "Unknown Set",
            year: jsonData.Year || new Date().getFullYear(),
            cardNumber: jsonData.CardNum || jsonData.CardNumber || certNumber,
            imageUrl: jsonData.ImageUrl,
          };

          console.log(
            `✅ Scraped PSA card (from API JSON): ${cardDetails.cardName}`,
          );

          // Cache the result
          psaCertCache.set(certNumber, {
            data: cardDetails,
            timestamp: Date.now(),
          });

          return cardDetails;
        }
      } catch (e) {
        // Not JSON, continue with HTML parsing
      }
    }

    // Extract card information from HTML
    // Look for JSON-LD data which is commonly used for structured data
    const jsonLdMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/i,
    );

    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData.name || jsonData.headline) {
          const cardDetails = {
            certNumber,
            cardName: jsonData.name || jsonData.headline || "Unknown",
            gradeLabel: jsonData.gradeLabel || "N/A",
            grade: jsonData.grade ? parseFloat(jsonData.grade) : 0,
            setName: jsonData.setName || "Unknown Set",
            year: jsonData.year
              ? parseInt(jsonData.year)
              : new Date().getFullYear(),
            cardNumber: jsonData.cardNumber || "N/A",
            imageUrl: jsonData.image?.[0] || jsonData.image,
          };

          console.log(
            `✅ Scraped PSA card (from JSON-LD): ${cardDetails.cardName}`,
          );

          // Cache the result
          psaCertCache.set(certNumber, {
            data: cardDetails,
            timestamp: Date.now(),
          });

          return cardDetails;
        }
      } catch (e) {
        console.log("⚠️ JSON-LD parsing error:", e);
      }
    }

    // Fallback: Extract from Open Graph meta tags
    const cardNameMatch = html.match(
      /<meta\s+property="og:title"\s+content="([^"]+)"/i,
    );
    const imageMatch = html.match(
      /<meta\s+property="og:image"\s+content="([^"]+)"/i,
    );

    // Extract grade from page content
    const gradeMatch = html.match(/(?:Grade|PSA)[:\s]*([0-9]+\.?[0-9]*)/i);

    // Extract set name
    const setMatch = html.match(/(?:Set|Card Set)[:\s]*([^<\n]+)</i);

    // Extract year
    const yearMatch =
      html.match(/Year[:\s]*([0-9]{4})/i) ||
      html.match(/([0-9]{4})\s*(?:Edition|Release)/i);

    if (cardNameMatch) {
      const cardDetails = {
        certNumber,
        cardName: cardNameMatch[1]?.trim() || "Unknown",
        gradeLabel: gradeMatch ? `PSA ${gradeMatch[1]}` : "N/A",
        grade: gradeMatch ? parseFloat(gradeMatch[1]) : 0,
        setName: setMatch ? setMatch[1]?.trim() : "Unknown Set",
        year: yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear(),
        cardNumber: certNumber,
        imageUrl: imageMatch ? imageMatch[1] : undefined,
      };

      console.log(`✅ Scraped PSA card (from HTML): ${cardDetails.cardName}`);

      // Cache the result
      psaCertCache.set(certNumber, {
        data: cardDetails,
        timestamp: Date.now(),
      });

      return cardDetails;
    }

    console.log(
      `⚠️ Could not extract card details from PSA page (page blocked or structure changed)`,
    );
    return undefined;
  } catch (error) {
    console.log(`⚠️ PSA scraping error: ${error}`);
    return undefined;
  }
}

// Get card details by PSA certification number (using ASIN as cert number)
async function getCardDetailsByCert(
  certNumber: string,
): Promise<PriceCheckResult["cardDetails"] | undefined> {
  try {
    if (!certNumber) {
      return undefined;
    }

    console.log(`🔍 Looking up card details for cert: ${certNumber}`);

    // Check cache first
    const cached = psaCertCache.get(certNumber);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📦 Using cached PSA data for cert: ${certNumber}`);
      return cached.data;
    }

    // PSA API endpoint: GET /cert/GetByCertNumber/{certNumber}
    const searchUrl = `${PSA_API_BASE}/cert/GetByCertNumber/${certNumber}`;

    // Retry logic for rate limiting
    let retries = 2;
    let response: Response | null = null;

    while (retries > 0) {
      response = await fetch(searchUrl, {
        method: "GET",
        headers: {
          Authorization: `bearer ${PSA_API_KEY}`,
          Accept: "application/json",
        },
      });

      if (response.status === 429 && retries > 0) {
        console.log(
          "⏳ PSA API rate limited, retrying cert lookup in 3 seconds...",
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
        retries--;
        continue;
      }

      break;
    }

    if (!response || !response.ok) {
      const statusText = await response?.text();
      console.log(`⚠️ PSA API Error ${response?.status}: ${statusText}`);
      console.log(`🕷️ Attempting to scrape PSA cert page as fallback...`);
      return await scrapePSACardDetails(certNumber);
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.log("⚠️ PSA response is not JSON, attempting scrape fallback");
      return await scrapePSACardDetails(certNumber);
    }

    // PSA API returns text error messages for rate limits and errors
    // Only check IsValidRequest if it exists (JSON response)
    if (typeof data === "string") {
      console.log(`⚠️ PSA API Error (text response): ${data}`);
      console.log(`🕷️ Attempting to scrape PSA cert page as fallback...`);
      return await scrapePSACardDetails(certNumber);
    }

    // Check for valid response - PSA returns IsValidRequest: false for errors
    if (data.IsValidRequest === false || !data.IsValidRequest) {
      console.log(
        `⚠️ PSA API declined request: ${data.ServerMessage || data.message || "Unknown error"}`,
      );
      console.log(`🕷️ Attempting to scrape PSA cert page as fallback...`);
      return await scrapePSACardDetails(certNumber);
    }

    // Extract card data from response
    const cardData = data;

    if (cardData.CertNumber) {
      console.log(
        `✅ Found PSA card: ${cardData.CardName} (Cert: ${cardData.CertNumber})`,
      );
      const cardDetails = {
        certNumber: cardData.CertNumber,
        cardName: cardData.CardName || "Unknown",
        gradeLabel: cardData.GradeLabel || "N/A",
        grade: cardData.Grade || 0,
        setName: cardData.SetName || "Unknown Set",
        year: cardData.Year || new Date().getFullYear(),
        cardNumber: cardData.CardNum || cardData.CardNumber || "N/A",
        imageUrl: cardData.ImageUrl,
      };

      // Cache the result
      psaCertCache.set(certNumber, {
        data: cardDetails,
        timestamp: Date.now(),
      });

      return cardDetails;
    }

    console.log("⚠️ PSA response missing CertNumber:", data);
    console.log(`🕷️ Attempting to scrape PSA cert page as fallback...`);
    return await scrapePSACardDetails(certNumber);
  } catch (error) {
    console.log("⚠️ Card detail lookup error:", error);
    console.log(`🕷️ Attempting to scrape PSA cert page as fallback...`);
    return await scrapePSACardDetails(certNumber);
  }
}

export async function POST(request: Request) {
  try {
    const { title, asin } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: "Product title is required" },
        { status: 400 },
      );
    }

    console.log(`🔍 Checking prices for: ${title}`);

    // Run searches in parallel
    let cardDetails: PriceCheckResult["cardDetails"] | undefined;

    const [ebayData, ebayResults, psaData] = await Promise.all([
      searchEBay(title, asin),
      searchEBayMultiple(title, asin),
      searchPSA(title),
    ]);

    // Also fetch card details if ASIN is provided
    if (asin) {
      cardDetails = await getCardDetailsByCert(asin);
    }

    // Determine recommended price
    let recommendedPrice: number | null = null;
    let source = "none";

    if (ebayData && psaData) {
      // If we have both, use PSA (more specific to collectibles)
      recommendedPrice = psaData.avgPrice;
      source = "psa";
    } else if (psaData) {
      recommendedPrice = psaData.avgPrice;
      source = "psa";
    } else if (ebayData) {
      recommendedPrice = ebayData.price;
      source = "ebay";
    }

    const result: PriceCheckResult = {
      ebay: ebayData,
      ebayResults:
        ebayResults && ebayResults.length > 0 ? ebayResults : undefined,
      psa: psaData,
      cardDetails: cardDetails,
      success: !!(
        ebayData ||
        psaData ||
        cardDetails ||
        (ebayResults && ebayResults.length > 0)
      ),
      message:
        ebayResults && ebayResults.length > 0
          ? `Found ${ebayResults.length} potential matches on eBay`
          : recommendedPrice
            ? `Found price data from ${source.toUpperCase()}: $${recommendedPrice}`
            : cardDetails
              ? `Found card details for cert ${asin}`
              : "No price data found from eBay or PSA",
    };

    return NextResponse.json({
      ...result,
      recommendedPrice,
      source,
    });
  } catch (error: any) {
    console.error("[POST /api/price-checker]", error);
    return NextResponse.json(
      { error: error.message || "Failed to check prices" },
      { status: 500 },
    );
  }
}
