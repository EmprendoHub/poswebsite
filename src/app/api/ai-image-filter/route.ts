export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import OpenAi from "openai";

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

  const { productTitle, candidateImages } = await request.json();

  try {
    console.log(
      `🤖 AI super-strict filtering ${candidateImages.length} candidates for: "${productTitle}"`
    );

    const prompt = `
You are an EXTREMELY STRICT quality control expert for trading card image matching. Your job is to REJECT most images and only keep PERFECT matches.

PRODUCT: "${productTitle}"

CANDIDATE IMAGES (already pre-filtered by rules):
${candidateImages
  .map((img: string, index: number) => `${index + 1}. ${img}`)
  .join("\n")}

SUPER STRICT FILTERING - REJECT IF ANY OF THESE:

❌ CHARACTER MISMATCH: Different character entirely
❌ SET MISMATCH: Different trading card set/series 
❌ CARD CODE MISMATCH: Different card numbers
❌ FRANCHISE MISMATCH: Wrong game/anime/sport
❌ GRADING MISMATCH: Different grading company or grade
❌ YEAR MISMATCH: Significantly different years

EXAMPLES OF WHAT TO REJECT:

For "2017-23 DBS PROMOS #RUSH ATTACK SSB VEGETA P PRISTINE 10":
❌ REJECT: "2024_DBS_FUSION_WORLD_VEGETA_CELEBRATION_10_91623773_01.png" (FUSION WORLD ≠ RUSH ATTACK)
❌ REJECT: "2024_DBS_RUSH_ATTACK_GOKU_PRISTINE_10_01.png" (GOKU ≠ VEGETA)

For "2022 ONE PIECE ROMANCE DAWN #OP01002 TRAFALGAR LAW":
❌ REJECT: "2022_ONE_PIECE_JPN_TRAFALGAR_LAW_OP01ALTERNATE_ART_PSA_10_01.png" (JPN ALTERNATE ART ≠ ROMANCE DAWN)
❌ REJECT: "2022_ONE_PIECE_ROMANCE_DAWN_OP01001_LUFFY_01.png" (OP01001 ≠ OP01002, LUFFY ≠ TRAFALGAR LAW)

For "2012 Home Court Lebron James Firmada Mint 9":
❌ REJECT: "2012_Home_Court_Michael_Jordan_Mint_9_01.png" (MICHAEL JORDAN ≠ LEBRON JAMES)

WHAT TO KEEP:
✅ EXACT character + EXACT set + EXACT card code + similar year + similar grade
✅ Multiple variations of the SAME card (_01, _02, _03, etc.)

BE RUTHLESS: If you have ANY doubt about whether an image matches perfectly, REJECT it.

RESPONSE: Return only the filenames that are PERFECT matches, one per line. If none are perfect, return "NO_MATCH".
`;

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4",
      max_tokens: 300,
      temperature: 0.0, // Maximum consistency
      messages: [
        {
          role: "system",
          content:
            "You are a ruthless quality control filter. REJECT 95% of candidates. Only keep PERFECT matches. When in doubt, ALWAYS reject.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const response = chatCompletion.choices[0].message.content?.trim();
    console.log(`🤖 AI Filter Response:`, response);

    if (!response || response === "NO_MATCH") {
      console.log(`🤖 AI Filter: ALL candidates REJECTED`);
      return NextResponse.json({ matches: [] }, { status: 200 });
    }

    // Parse the response to get filenames
    const approvedFiles = response
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.endsWith(".png"))
      .filter((filename) => candidateImages.includes(filename));

    const rejectionRate = Math.round(
      (1 - approvedFiles.length / candidateImages.length) * 100
    );
    console.log(
      `🤖 AI Filter: ${candidateImages.length} → ${approvedFiles.length} (${rejectionRate}% rejected)`
    );

    // Log what was approved for debugging
    if (approvedFiles.length > 0) {
      console.log(`✅ AI approved:`, approvedFiles);
    }

    return NextResponse.json({ matches: approvedFiles }, { status: 200 });
  } catch (error) {
    console.error("Error with AI image filtering:", error);
    // Conservative fallback: return empty array
    return NextResponse.json({ matches: [] }, { status: 500 });
  }
}
