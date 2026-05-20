import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET(request: any) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log("cron log error");
    return new Response("Unauthorized", {
      status: 401,
    });
  }
  try {
    // analyze previous posts to extract brand voice and brand feeling

    // Auto Generate a new SEO blog post title, keywords, metadata and copy with GTP
    const openai = new OpenAI({
      apiKey: process.env.OPEN_AI_KEY,
    });

    const aiPromptRequest = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
                Eres un asistente experto en ventas en vivo que ayuda a evaluar la intención de compra de los clientes en un live stream. Tu tarea principal es analizar los mensajes enviados por los clientes en español para determinar si están expresando una intención de compra, y si es así, identificar los detalles clave del mensaje como:
          
                1. Producto mencionado (si corresponde).
                2. Cantidad o precio indicado.
                3. Nombre o referencia personal (si se menciona, por ejemplo, "yo," "mía," "mío").
          
                Ejemplo:
                - Mensaje: "yo camisa negra" -> Respuesta: { intención: "compra", producto: "camisa negra", cantidad: 1 }
                - Mensaje: "mia bolsa 150" -> Respuesta: { intención: "compra", producto: "bolsa", precio: 150 }
                - Mensaje: "solo mirando" -> Respuesta: { intención: "sin compra" }
          
                Si no hay suficiente información para determinar una intención clara o detalles del producto, responde con: { intención: "indeterminada" }.
          
                Sé preciso y utiliza un formato JSON en tus respuestas. Contesta siempre en Ingles Americano y mantén la información directa y profesional si se determina que si existe una intencion de compra en el mensaje marca intent: purchase.
                `,
        },
        {
          role: "user",
          content: "message",
        },
      ],
      model: "gpt-3.5-turbo-0125",
    });

    if (aiPromptRequest.choices[0].message.content) {
      const responseJson = JSON.parse(
        aiPromptRequest.choices[0].message.content || "none"
      );
      const intent = responseJson.intention;
      console.log("intent", intent);
    }
    const blogSummary = "";
    const pageId = "107551511895797";

    // generate post image with midjourney
    const postImage =
      "https://img.midjourneyapi.xyz/mj/28e5ba4b-46c0-4577-9950-e2efb3dbc670.png";

    const temp = [
      `https://graph.facebook.com/v21.0/${pageId}/photos`,
      "POST",
      {
        message: blogSummary,
        published: true,
        url: postImage,
      },
    ];

    return NextResponse.json({
      message: "Pedidos Cron actualizados exitosamente",
      success: true,
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        error: "Error al crear Publicación",
      },
      { status: 500 }
    );
  }
}
