import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session || !["manager", "sucursal"].includes(session?.user?.role)) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const { productIds } = await request.json();

    if (!productIds || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No se seleccionaron productos" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Import required utilities
    const { optimizeProductsBatch } = await import("@/lib/aiOptimizer");
    const { mapProductsBatchToTikTok } = await import("@/lib/tiktokMapper");
    const { generateTikTokExcel, validateTikTokRows } = await import(
      "@/lib/excelGenerator"
    );

    // Fetch products from database
    const products = await Product.find({
      _id: { $in: productIds },
    }).lean();

    if (!products || products.length === 0) {
      return NextResponse.json(
        { success: false, error: "No se encontraron productos" },
        { status: 404 }
      );
    }

    // Prepare products for AI optimization
    const productsForAI = products.map((p: any) => ({
      title: p.title || "",
      description: p.description || "",
      category: p.category || "",
      brand: p.brand || "",
    }));

    // Optimize with AI
    const optimizedContents = await optimizeProductsBatch(productsForAI);

    // Map to TikTok format
    const tiktokRows = mapProductsBatchToTikTok(
      products as any,
      optimizedContents
    );

    // Validate rows
    const validationErrors = validateTikTokRows(tiktokRows);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Errores de validación: ${validationErrors.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Generate Excel file
    const fileName = `tiktok-products-${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    const buffer = generateTikTokExcel(tiktokRows, fileName);

    // Return the file directly as a download
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Products-Processed": products.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Error exporting to TikTok:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al exportar productos",
      },
      { status: 500 }
    );
  }
}
