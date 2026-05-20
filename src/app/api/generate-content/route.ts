import { NextResponse } from "next/server";
import { chatSession } from "@/backend/models/AIModel";

export async function POST(req: any) {
  try {
    const { finalAiPrompt } = await req.json();

    const result = await chatSession.sendMessage(finalAiPrompt);
    return NextResponse.json(
      {
        success: "Éxito al crear Publicación",
        result: result.response.text(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: `Error al crear Publicación ${error}`,
      },
      { status: 500 }
    );
  }
}
