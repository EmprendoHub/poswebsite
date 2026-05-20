/**
 * AI SEO Optimization Utility
 * Uses OpenAI to optimize product titles and descriptions
 */

import OpenAI from "openai";
import { AIOptimizedContent } from "@/types/tiktok";

// Initialize the OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
});

/**
 * Optimizes product title and description for SEO and TikTok Shop
 * @param title - Original product title
 * @param description - Original product description
 * @param category - Product category
 * @param brand - Product brand
 * @returns Optimized title and description
 */
export async function optimizeProductForSEO(
  title: string,
  description: string,
  category?: string,
  brand?: string
): Promise<AIOptimizedContent> {
  try {
    const prompt = `Eres un experto en copywriting y SEO para e-commerce, especializado en TikTok Shop México.

Información del producto:
- Título: ${title}
- Descripción: ${description || "Sin descripción"}
- Categoría: ${category || "General"}
- Marca: ${brand || "Desconocida"}

Optimiza este producto para TikTok Shop con los siguientes requisitos:

1. TÍTULO OPTIMIZADO (máximo 255 caracteres) EN ESPAÑOL MEXICANO:
   - Claro, atractivo y rico en palabras clave
   - Incluir marca si está disponible
   - Destacar características o beneficios clave
   - Apelar al público joven de TikTok México
   - Usar palabras de poder y gatillos emocionales
   - Lenguaje coloquial mexicano apropiado
   - Evitar anglicismos innecesarios

2. DESCRIPCIÓN OPTIMIZADA (máximo 5000 caracteres) EN ESPAÑOL MEXICANO:
   - Tono conversacional y cercano, como habla un mexicano
   - Viñetas para características principales
   - Incluir keywords de forma natural
   - Responder preguntas frecuentes de clientes mexicanos
   - Crear urgencia o FOMO si es apropiado
   - Usar emojis con moderación pero efectivamente
   - Enfocarse en beneficios sobre características
   - Formato amigable para móvil
   - Usar expresiones mexicanas cuando sea apropiado (ej: "está padrísimo", "súper padre", "de lujo")
   - Mencionar si aplica envío a toda la República Mexicana

Devuelve ÚNICAMENTE un objeto JSON con esta estructura exacta (sin markdown, sin explicaciones):
{
  "optimizedTitle": "tu título optimizado aquí",
  "optimizedDescription": "tu descripción optimizada aquí"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Eres un experto en copywriting de e-commerce para el mercado mexicano. Responde únicamente con JSON válido en español mexicano.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    // Remove any markdown code blocks if present
    let cleanedText = content.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/```\n?/g, "");
    }

    // Additional cleaning to fix control characters
    cleanedText = cleanedText.trim();

    // Try to parse, and if it fails due to control characters, sanitize and retry
    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseError) {
      console.warn("Initial JSON parse failed, attempting to sanitize...");
      // Sanitize the JSON by escaping control characters properly
      // This regex finds unescaped control characters within string values
      cleanedText = cleanedText.replace(
        /[\u0000-\u001F\u007F-\u009F]/g,
        (match) => {
          // Map common control characters to their escape sequences
          const escapeMap: { [key: string]: string } = {
            "\n": "\\n",
            "\r": "\\r",
            "\t": "\\t",
            "\b": "\\b",
            "\f": "\\f",
          };
          return escapeMap[match] || "";
        }
      );

      parsed = JSON.parse(cleanedText);
    }

    return {
      optimizedTitle: parsed.optimizedTitle || title,
      optimizedDescription: parsed.optimizedDescription || description,
    };
  } catch (error) {
    console.error("AI Optimization Error:", error);
    // Fallback to original content if AI fails
    return {
      optimizedTitle: title,
      optimizedDescription: description || title,
    };
  }
}

/**
 * Batch optimize multiple products
 * Includes rate limiting and error handling
 */
export async function optimizeProductsBatch(
  products: Array<{
    title: string;
    description: string;
    category?: string;
    brand?: string;
  }>,
  onProgress?: (current: number, total: number) => void
): Promise<AIOptimizedContent[]> {
  const results: AIOptimizedContent[] = [];
  const delayBetweenCalls = 1000; // 1 second delay to avoid rate limits

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    try {
      const optimized = await optimizeProductForSEO(
        product.title,
        product.description,
        product.category,
        product.brand
      );
      results.push(optimized);

      if (onProgress) {
        onProgress(i + 1, products.length);
      }

      // Add delay between calls except for the last one
      if (i < products.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenCalls));
      }
    } catch (error) {
      console.error(`Failed to optimize product ${i + 1}:`, error);
      // Use original content as fallback
      results.push({
        optimizedTitle: product.title,
        optimizedDescription: product.description || product.title,
      });
    }
  }

  return results;
}
