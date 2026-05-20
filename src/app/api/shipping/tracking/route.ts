import { NextRequest, NextResponse } from "next/server";
import enviaService from "@/lib/envia";

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const trackingNumber = searchParams.get("trackingNumber");

    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, message: "Número de tracking requerido" },
        { status: 400 }
      );
    }

    const tracking = await enviaService.trackShipment(trackingNumber);

    return NextResponse.json({
      success: true,
      tracking,
    });
  } catch (error: any) {
    console.error("❌ Error obteniendo tracking:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener información de tracking",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
