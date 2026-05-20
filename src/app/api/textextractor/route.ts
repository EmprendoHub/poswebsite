import { NextResponse } from "next/server";
import OpenAi from "openai";

export async function POST(request: any) {
  const cookie = await request.headers.get("cookie");
  if (!cookie) {
    // Not Signed in
    const notAuthorized = "You are not authorized no no no";
    return new Response(JSON.stringify(notAuthorized), {
      status: 400,
    });
  }
  const openai = new OpenAi({
    apiKey: process.env.OPEN_AI_KEY,
  });

  const { imageText } = await request.json();

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4", // or 'gpt-4' based on your API access
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `You are a Search Engine Optimization expert that writes engaging copy and generates an SEO-optimized title and description for a product based on that text.`,
        },
        {
          role: "user",
          content: `Analyze this text: ${imageText} first unjumble and extract the known english words and then generate a search engine optimized title and description for the product.`,
        },
      ],
    });

    const { content }: any = chatCompletion.choices[0].message;
    console.log("content", content);

    let title = content.match(/Title:\s*(.*)/)?.[1];
    let description = content.match(/Description:\s*(.*)/)?.[1];
    if (title && description) {
      // Use a regular expression with the global flag to replace all occurrences of "
      title = title.replace(/"/g, "");
      description = description.replace(/"/g, "");
      title = title.replace(/:/g, "");
      description = description.replace(/:/g, "");
    } else {
      title = "No se encontró el titulo";
      description = "No se genero descripción";
    }

    return NextResponse.json(
      {
        title: title,
        description: description,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error analyzing image with OpenAI API:", error);
    return NextResponse.json(
      { message: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
