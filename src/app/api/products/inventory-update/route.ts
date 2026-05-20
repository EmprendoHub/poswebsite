import { options } from "@/app/api/auth/[...nextauth]/options";
import Product from "@/backend/models/Product";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// Simple similarity: what % of words in `needle` appear in `haystack`
function wordSimilarity(a: string, b: string): number {
  const words = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);
  const aw = words(a);
  const bw = new Set(words(b));
  if (aw.length === 0) return 0;
  const matches = aw.filter((w) => bw.has(w)).length;
  return matches / aw.length;
}

// ── PREVIEW ──────────────────────────────────────────────────────────────────
// POST /api/products/inventory-update
// Body: { rows: CsvRow[], preview: true }  → returns match results without saving
// Body: { rows: CsvRow[], preview: false } → applies updates and returns results

export interface CsvRow {
  codigo: string; // Código  (used as ASIN)
  producto: string; // Producto (used for name matching fallback)
  p_costo: string;
  p_venta: string;
  p_mayoreo: string;
  existencia: string;
  inv_minimo: string;
  inv_maximo: string;
  departamento: string;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    if (
      !session ||
      !["manager", "sucursal"].includes((session.user as any)?.role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const { rows, preview }: { rows: CsvRow[]; preview: boolean } =
      await req.json();

    if (!rows?.length) {
      return NextResponse.json(
        { error: "No hay filas para procesar" },
        { status: 400 },
      );
    }

    // Load all products once (only fields we need)
    const allProducts = await Product.find(
      {},
      { _id: 1, title: 1, ASIN: 1, stock: 1 },
    ).lean();

    // DEBUG: log sample of received codes and DB ASINs
    const sampleCodes = rows.slice(0, 5).map((r) => r.codigo?.trim());
    const sampleAsins = (allProducts as any[])
      .slice(0, 10)
      .map((p: any) => p.ASIN);
    console.log("[inventory-update] Sample CSV codes:", sampleCodes);
    console.log("[inventory-update] Sample DB ASINs:", sampleAsins);
    console.log("[inventory-update] Total products in DB:", allProducts.length);

    const results: {
      rowIndex: number;
      codigo: string;
      producto: string;
      matchedId: string | null;
      matchedTitle: string | null;
      matchMethod: "asin" | "name" | "none";
      similarity: number;
      currentStock: number | null;
      newStock: number;
      newAsin: string | null;
      updated?: boolean;
    }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const newStock = parseInt(row.existencia, 10) || 0;
      const codigoClean = row.codigo?.trim().toUpperCase();

      let matched: any = null;
      let matchMethod: "asin" | "name" | "none" = "none";
      let similarity = 0;

      // 1. Try exact ASIN match
      if (codigoClean) {
        matched = allProducts.find(
          (p: any) => p.ASIN?.toUpperCase() === codigoClean,
        );
        if (matched) {
          matchMethod = "asin";
          similarity = 1;
        }
      }

      // 2. Fallback: name similarity (threshold ≥ 0.95)
      if (!matched && row.producto?.trim()) {
        let best = 0;
        let bestProduct: any = null;
        for (const p of allProducts as any[]) {
          const sim = wordSimilarity(row.producto, p.title ?? "");
          if (sim > best) {
            best = sim;
            bestProduct = p;
          }
        }
        if (best >= 0.95) {
          matched = bestProduct;
          matchMethod = "name";
          similarity = best;
        }
      }

      const currentStock = matched ? (matched.stock ?? null) : null;

      results.push({
        rowIndex: i,
        codigo: row.codigo,
        producto: row.producto,
        matchedId: matched?._id?.toString() ?? null,
        matchedTitle: matched?.title ?? null,
        matchMethod,
        similarity: Math.round(similarity * 100) / 100,
        currentStock,
        newStock,
        newAsin: codigoClean || null,
        updated: false,
      });
    }

    // If only preview, return now
    if (preview) {
      return NextResponse.json({ results }, { status: 200 });
    }

    // Apply updates
    let updatedCount = 0;
    for (const r of results) {
      if (!r.matchedId) continue;
      try {
        // Update stock and ASIN only
        await Product.updateOne(
          { _id: r.matchedId },
          {
            $set: {
              stock: r.newStock,
              ...(r.newAsin ? { ASIN: r.newAsin } : {}),
            },
          },
        );

        r.updated = true;
        updatedCount++;
      } catch (e) {
        console.error(`Error updating product ${r.matchedId}:`, e);
      }
    }

    return NextResponse.json({ results, updatedCount }, { status: 200 });
  } catch (error: any) {
    console.error("inventory-update error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar" },
      { status: 500 },
    );
  }
}
