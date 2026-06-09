import { options } from "@/app/api/auth/[...nextauth]/options";
import Product from "@/backend/models/Product";
import StoreInventory from "@/backend/models/StoreInventory";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

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
  return aw.filter((w) => bw.has(w)).length / aw.length;
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
      storeId,
      rowActions,
    }: {
      rows: CsvRow[];
      preview: boolean;
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
      { _id: 1, title: 1, ASIN: 1, stock: 1, price: 1, variations: 1 },
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
      const newStock = parseInt(row.existencia, 10) || 0;
      const newPrice = parseFloat(row.p_venta) || 0;
      const newCost = parseFloat(row.p_costo) || 0;
      const codigoClean = row.codigo?.trim().toUpperCase();

      let matched: any = null;
      let matchMethod: "asin" | "name" | "none" = "none";
      let similarity = 0;

      // 1. Try exact ASIN match
      if (codigoClean) {
        matched = (allProducts as any[]).find(
          (p) => p.ASIN?.toUpperCase() === codigoClean,
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

      // Current stock: prefer branch stock if storeId provided
      const currentStock = matched
        ? storeId
          ? (storeStockMap.get(matched._id.toString()) ?? matched.stock ?? null)
          : (matched.stock ?? null)
        : null;

      const currentPrice = matched ? (matched.price ?? null) : null;
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
    if (!storeId) {
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
                stock: r.newStock,
                ...(r.newPrice > 0 ? { price: r.newPrice } : {}),
                ...(r.newCost > 0 ? { cost: r.newCost } : {}),
                ...(r.newAsin ? { ASIN: r.newAsin } : {}),
              },
            },
          );

          // Upsert StoreInventory per variation (or product id as fallback)
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

          r.updated = true;
          updatedCount++;

          // Revalidate this product's detail page
          if (prod?.slug) revalidatePath(`/producto/${prod.slug}`);
        } catch (e) {
          console.error(`Error updating product ${r.matchedId}:`, e);
        }
      }

      // ── CREATE new product ───────────────────────────────────────────────
      if (effectiveAction === "create" && !r.matchedId) {
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

          const newProduct = await Product.create({
            title,
            slug,
            ASIN: r.newAsin || undefined,
            price: salePrice, // marked-up sale price (+10%)
            currentPrice: salePrice,
            originalPrice: r.newPrice || 0, // original CSV price kept for reference
            cost: r.newCost || 0,
            stock: r.newStock,
            category: r.departamento || "General",
            gender: r.departamento || "Otro",
            availability: { branch: true, online: false, instagram: false },
            active: true,
            published: false, // draft — requires manual review before going live
            user: userId,
            variations: [
              {
                title: "Default",
                stock: r.newStock,
                price: salePrice,
                cost: r.newCost || 0,
                quantity: r.newStock,
              },
            ],
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
    revalidatePath("/tienda");
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
