export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Product from "@/backend/models/Product";
import Store from "@/backend/models/Store";
import StoreInventory from "@/backend/models/StoreInventory";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/migrate-online-to-branch
 *
 * One-time migration: copies the stock from every online-available product's
 * variations into StoreInventory records for the target branch (Centro Magno).
 *
 * Body (optional): { storeSlug?: string, dryRun?: boolean }
 *  - storeSlug defaults to "centro-magno"
 *  - dryRun: true  → previews what would be created/updated, no writes
 *
 * Returns: { store, processed, created, updated, skipped, errors[], results[] }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    const user = session?.user as any;
    if (!session || !["manager", "super_admin"].includes(user?.role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json().catch(() => ({}));
    const storeSlug: string = body.storeSlug ?? "centro-magno";
    const dryRun: boolean = body.dryRun ?? false;

    // ── Resolve target branch ────────────────────────────────────────────────
    const store = await Store.findOne({
      $or: [
        { slug: { $regex: new RegExp(storeSlug, "i") } },
        { name: { $regex: new RegExp(storeSlug.replace(/-/g, " "), "i") } },
      ],
    }).lean();

    if (!store) {
      const allStores = await Store.find({}, { name: 1, slug: 1 }).lean();
      return NextResponse.json(
        {
          error: `Sucursal "${storeSlug}" no encontrada.`,
          availableStores: allStores,
        },
        { status: 404 },
      );
    }

    const storeId = (store as any)._id;

    // ── Fetch all online-available products ──────────────────────────────────
    const products = await Product.find(
      { "availability.online": true },
      {
        _id: 1,
        title: 1,
        slug: 1,
        stock: 1,
        variations: 1,
        availability: 1,
      },
    ).lean();

    let processed = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    const results: any[] = [];

    for (const product of products as any[]) {
      const productId = product._id;
      const variations: any[] = product.variations ?? [];

      if (variations.length === 0) {
        // Fallback: no variations — use product._id as variationId
        const qty: number = product.stock ?? 0;
        const entry = {
          store: storeId,
          product: productId,
          variationId: productId.toString(),
          quantity: qty,
          minStock: 1,
          lastUpdated: new Date(),
        };

        results.push({
          product: product.title,
          variationId: productId.toString(),
          quantity: qty,
          action: "no-variations-fallback",
        });

        if (!dryRun) {
          try {
            const existing = await StoreInventory.findOne({
              store: storeId,
              variationId: productId.toString(),
            });
            if (existing) {
              await StoreInventory.updateOne(
                { _id: existing._id },
                { $set: { quantity: qty, lastUpdated: new Date() } },
              );
              updated++;
            } else {
              await StoreInventory.create(entry);
              created++;
            }
          } catch (e: any) {
            errors.push(`${product.title}: ${e.message}`);
          }
        }
        processed++;
        continue;
      }

      for (const v of variations) {
        const variationId = v._id?.toString();
        if (!variationId) {
          skipped++;
          continue;
        }

        // Use variation.stock first, fall back to product-level stock
        const qty: number = v.stock ?? product.stock ?? 0;

        results.push({
          product: product.title,
          variationId,
          size: v.size || v.color || "—",
          quantity: qty,
          action: "pending",
        });

        if (!dryRun) {
          try {
            const existing = await StoreInventory.findOne({
              store: storeId,
              variationId,
            });
            if (existing) {
              await StoreInventory.updateOne(
                { _id: existing._id },
                {
                  $set: {
                    quantity: qty,
                    product: productId,
                    lastUpdated: new Date(),
                  },
                },
              );
              results[results.length - 1].action = "updated";
              updated++;
            } else {
              await StoreInventory.create({
                store: storeId,
                product: productId,
                variationId,
                quantity: qty,
                minStock: 1,
                lastUpdated: new Date(),
              });
              results[results.length - 1].action = "created";
              created++;
            }
          } catch (e: any) {
            results[results.length - 1].action = "error";
            errors.push(`${product.title} [${variationId}]: ${e.message}`);
          }
        }

        processed++;
      }
    }

    return NextResponse.json(
      {
        dryRun,
        store: {
          _id: storeId,
          name: (store as any).name,
          slug: (store as any).slug,
        },
        processed,
        created: dryRun ? 0 : created,
        updated: dryRun ? 0 : updated,
        skipped,
        errorCount: errors.length,
        errors,
        results,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("migrate-online-to-branch error:", error);
    return NextResponse.json(
      { error: error?.message || "Error en la migración" },
      { status: 500 },
    );
  }
}
