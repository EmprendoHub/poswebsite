export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Product from "@/backend/models/Product";
import StoreInventory from "@/backend/models/StoreInventory";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Parse a price/number string from a CSV cell robustly.
 *
 * Handles all common formats:
 *   "45.00"       → 45.00   (US decimal)
 *   "2,000.00"    → 2000.00 (US/MX thousands + decimal)
 *   "$2,000.00"   → 2000.00 (US with currency symbol)
 *   "2,000"       → 2000    (US thousands, no decimals)
 *   "45,00"       → 45.00   (EU decimal comma)
 *   "1.234,56"    → 1234.56 (EU thousands dot + decimal comma)
 *   "2.000"       → 2000    (EU thousands dot, no decimals)
 *   "1,234,567"   → 1234567 (multiple comma thousands)
 *   "1.234.567"   → 1234567 (multiple dot thousands)
 *
 * Rule: when both separators are present, the LAST one is the decimal separator.
 * When only one separator is present, 3 digits after it = thousands, ≤2 = decimal.
 */
function parseCsvNumber(raw: string | undefined): number {
  if (!raw) return 0;
  // Strip currency symbols, spaces, and non-breaking spaces
  let s = raw.trim().replace(/[$\s\u00A0]/g, "");
  if (!s) return 0;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const commaCount = (s.match(/,/g) || []).length;
  const dotCount = (s.match(/\./g) || []).length;

  if (commaCount === 0 && dotCount === 0) {
    // Pure integer: "1234" — leave as-is
  } else if (commaCount === 0 && dotCount === 1) {
    // Single dot: decimal "45.00" or EU thousands "2.000"
    if (s.slice(lastDot + 1).length === 3) {
      // EU thousands: "2.000" → 2000
      s = s.replace(".", "");
    }
    // else standard decimal "45.00" — leave as-is
  } else if (commaCount === 1 && dotCount === 0) {
    // Single comma: EU decimal "45,00" or US thousands "2,000"
    if (s.slice(lastComma + 1).length === 3) {
      // US/MX thousands: "2,000" → 2000
      s = s.replace(",", "");
    } else {
      // EU decimal: "45,00" → 45.00
      s = s.replace(",", ".");
    }
  } else if (commaCount >= 1 && dotCount >= 1) {
    // Both present — last separator is the decimal
    if (lastDot > lastComma) {
      // Dot is decimal, commas are thousands: "2,000.00" / "1,234.56"
      s = s.replace(/,/g, "");
    } else {
      // Comma is decimal, dots are thousands: "1.234,56" / "2.000,00"
      s = s.replace(/\./g, "").replace(",", ".");
    }
  } else if (commaCount > 1) {
    // Multiple commas, no dots: "1,234,567" — all thousands
    s = s.replace(/,/g, "");
  } else {
    // Multiple dots, no commas: "1.234.567" — all thousands
    s = s.replace(/\./g, "");
  }

  const n = parseFloat(s);
  return isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

// POST /api/products/inventory-update
// Body: { rows, preview: true, storeId? }               → match results only
// Body: { rows, preview: false, storeId, rowActions }   → applies updates/creates

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
    const user = session?.user as any;
    if (
      !session ||
      !["manager", "sucursal", "super_admin"].includes(user?.role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const {
      rows,
      preview,
      pricesOnly = false,
      storeId,
      rowActions,
    }: {
      rows: CsvRow[];
      preview: boolean;
      pricesOnly?: boolean;
      storeId?: string;
      rowActions?: Record<string, "update" | "create" | "skip">;
    } = await req.json();

    if (!rows?.length) {
      return NextResponse.json(
        { error: "No hay filas para procesar" },
        { status: 400 },
      );
    }

    // Load all products once (only fields we need)
    const allProducts = await Product.find(
      {},
      {
        _id: 1,
        title: 1,
        ASIN: 1,
        stock: 1,
        price: 1,
        currentPrice: 1,
        variations: 1,
      },
    ).lean();

    // Build branch-stock map from StoreInventory if storeId is provided
    const storeStockMap = new Map<string, number>();
    if (storeId) {
      const inv = await StoreInventory.find(
        { store: storeId },
        { product: 1, quantity: 1 },
      ).lean();
      for (const entry of inv as any[]) {
        const pid = entry.product.toString();
        storeStockMap.set(
          pid,
          Math.max(storeStockMap.get(pid) ?? 0, entry.quantity),
        );
      }
    }

    const results: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const newStock = Math.floor(parseCsvNumber(row.existencia));
      const newPrice = parseCsvNumber(row.p_venta);
      const newCost = parseCsvNumber(row.p_costo);
      const codigoClean = row.codigo?.trim().toUpperCase();

      let matched: any = null;
      let matchMethod: "asin" | "name" | "none" = "none";
      let similarity = 0;

      // 1. Exact ASIN match (priority)
      if (codigoClean) {
        matched = (allProducts as any[]).find(
          (p) => p.ASIN?.toUpperCase() === codigoClean,
        );
        if (matched) {
          matchMethod = "asin";
          similarity = 1;
        }
      }

      // 2. Fallback: exact (case-insensitive) title match only
      if (!matched && row.producto?.trim()) {
        const needle = row.producto.trim().toLowerCase();
        const exact = (allProducts as any[]).find(
          (p) => (p.title ?? "").toLowerCase() === needle,
        );
        if (exact) {
          matched = exact;
          matchMethod = "name";
          similarity = 1;
        }
      }

      // Current stock: prefer branch stock if storeId provided
      const currentStock = matched
        ? storeId
          ? (storeStockMap.get(matched._id.toString()) ?? matched.stock ?? null)
          : (matched.stock ?? null)
        : null;

      const currentPrice = matched
        ? (matched.currentPrice ?? matched.price ?? null)
        : null;
      const defaultAction: "update" | "create" = matched ? "update" : "create";
      // 10% markup applied to sale price for new (unmatched) products
      const markedUpPrice =
        defaultAction === "create" && newPrice > 0
          ? Math.round(newPrice * 1.1 * 100) / 100
          : newPrice;

      results.push({
        rowIndex: i,
        codigo: row.codigo,
        producto: row.producto,
        departamento: row.departamento ?? "",
        inv_minimo: row.inv_minimo ?? "1",
        matchedId: matched?._id?.toString() ?? null,
        matchedTitle: matched?.title ?? null,
        matchMethod,
        similarity: Math.round(similarity * 100) / 100,
        currentStock,
        newStock,
        currentPrice,
        newPrice,
        markedUpPrice,
        newCost,
        newAsin: codigoClean || null,
        action: defaultAction,
        updated: false,
        created: false,
        createError: null as string | null,
      });
    }

    // Preview: return without writing
    if (preview) {
      return NextResponse.json({ results }, { status: 200 });
    }

    // ── Apply ──────────────────────────────────────────────────────────────
    if (!storeId && !pricesOnly) {
      return NextResponse.json(
        { error: "Selecciona una sucursal antes de aplicar los cambios" },
        { status: 400 },
      );
    }

    let updatedCount = 0;
    let createdCount = 0;

    for (const r of results) {
      const effectiveAction = rowActions?.[String(r.rowIndex)] ?? r.action;
      if (effectiveAction === "skip") continue;

      // ── UPDATE existing product ──────────────────────────────────────────
      if (effectiveAction === "update" && r.matchedId) {
        try {
          const prod = (await Product.findById(r.matchedId).lean()) as any;

          await Product.updateOne(
            { _id: r.matchedId },
            {
              $set: {
                ...(!pricesOnly ? { stock: r.newStock } : {}),
                ...(r.newPrice > 0
                  ? {
                      price: r.newPrice,
                      currentPrice: r.newPrice,
                      "variations.$[].price": r.newPrice,
                    }
                  : {}),
                ...(r.newCost > 0
                  ? {
                      cost: r.newCost,
                      "variations.$[].cost": r.newCost,
                    }
                  : {}),
                ...(r.newAsin ? { ASIN: r.newAsin } : {}),
              },
            },
          );

          // Upsert StoreInventory per variation (or product id as fallback)
          if (!pricesOnly) {
            const variations = prod?.variations ?? [];
            if (variations.length > 0) {
              for (const v of variations) {
                const vId = v._id?.toString();
                if (!vId) continue;
                await StoreInventory.findOneAndUpdate(
                  { store: storeId, product: r.matchedId, variationId: vId },
                  { $set: { quantity: r.newStock, lastUpdated: new Date() } },
                  { upsert: true, new: true },
                );
              }
            } else {
              await StoreInventory.findOneAndUpdate(
                {
                  store: storeId,
                  product: r.matchedId,
                  variationId: r.matchedId,
                },
                { $set: { quantity: r.newStock, lastUpdated: new Date() } },
                { upsert: true, new: true },
              );
            }
          }

          r.updated = true;
          updatedCount++;

          // Revalidate this product's detail page
          if (prod?.slug) revalidatePath(`/producto/${prod.slug}`);
        } catch (e) {
          console.error(`Error updating product ${r.matchedId}:`, e);
        }
      }

      // ── CREATE new product ───────────────────────────────────────────────
      if (effectiveAction === "create" && !r.matchedId && !pricesOnly) {
        try {
          const baseTitle = r.producto?.trim() || `Producto ${r.codigo}`;

          // Ensure unique slug
          let slug = toSlug(baseTitle);
          let slugAttempt = 0;
          while (await Product.exists({ slug })) {
            slugAttempt++;
            slug = `${toSlug(baseTitle)}-${slugAttempt}`;
          }

          // Ensure unique title (schema has unique:true on title)
          let title = baseTitle;
          let titleAttempt = 0;
          while (await Product.exists({ title })) {
            titleAttempt++;
            title = `${baseTitle} (${titleAttempt})`;
          }

          // NextAuth exposes `id`, Mongoose documents use `_id`
          const userId = user._id ?? user.id;
          const salePrice = r.markedUpPrice || r.newPrice || 0;
          const DEFAULT_IMAGE =
            "https://minio.salvawebpro.com:9000/supercollectibles/Product-inside.png";
          const category = r.departamento || "General";

          const newProduct = await Product.create({
            type: "variation",
            title,
            slug,
            description: title,
            ASIN: r.newAsin || undefined,
            brand: "",
            category,
            gender: category,
            price: salePrice,
            currentPrice: salePrice,
            originalPrice: r.newPrice || 0,
            cost: r.newCost || 0,
            stock: r.newStock,
            isOutOfStock: r.newStock === 0,
            rating: 0,
            active: true,
            published: true,
            featured: false,
            quantity: 1,
            weight: 0.5,
            dimensions: { length: 15, width: 15, height: 10 },
            availability: { online: false, stock: r.newStock },
            images: [{ url: DEFAULT_IMAGE }],
            variations: [
              {
                stock: r.newStock,
                color: "",
                colorHex: "",
                colorHexTwo: "",
                colorHexThree: "",
                size: category,
                cost: r.newCost || 0,
                price: salePrice,
                image: DEFAULT_IMAGE,
                quantity: 1,
              },
            ],
            colors: [{ value: "", label: "" }],
            sizes: [],
            tags: [],
            details: [],
            default: [],
            user: userId,
          });

          const varId = (newProduct as any).variations?.[0]?._id?.toString();
          if (varId) {
            await StoreInventory.create({
              store: storeId,
              product: newProduct._id,
              variationId: varId,
              quantity: r.newStock,
              minStock: parseInt(r.inv_minimo || "1", 10) || 1,
            });
          }

          r.created = true;
          r.matchedId = newProduct._id.toString();
          r.matchedTitle = (newProduct as any).title;
          createdCount++;

          // Revalidate this product's detail page
          revalidatePath(`/producto/${slug}`);
        } catch (e: any) {
          console.error(
            `Error creating product for row ${r.rowIndex}:`,
            e.message,
          );
          r.createError = e.message ?? "Error desconocido";
        }
      }
    }

    // Flush Next.js page cache so newly created / updated products are visible
    revalidateTag("tienda-products");
    revalidatePath("/admin/productos");
    revalidatePath("/producto/[slug]", "page");

    return NextResponse.json(
      { results, updatedCount, createdCount },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("inventory-update error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar" },
      { status: 500 },
    );
  }
}
