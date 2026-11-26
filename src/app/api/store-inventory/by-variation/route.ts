export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import StoreInventory from "@/backend/models/StoreInventory";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = [
  "manager",
  "super_admin",
  "sucursal",
  "pos",
  "director",
  "admin",
];

/**
 * GET /api/store-inventory/by-variation?variationId=xxx
 * Get inventory by variationId instead of productId
 * Used by modals that need to show stock for a specific variation
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const url = new URL(req.url);
    const variationId = url.searchParams.get("variationId");
    const storeId = url.searchParams.get("storeId");

    if (!variationId) {
      return NextResponse.json(
        { error: "Se requiere variationId" },
        { status: 400 },
      );
    }

    // Build query - search by variationId
    const query: any = { variationId };
    if (storeId) query.store = storeId;

    const inventory = await StoreInventory.find(query)
      .populate("product", "title images price variations slug")
      .populate("store", "name slug type")
      .sort({ lastUpdated: -1 });

    console.log(
      `[GET /api/store-inventory/by-variation] variationId=${variationId}, found ${inventory.length} records`,
    );
    if (inventory.length > 0) {
      inventory.slice(0, 2).forEach((inv: any) => {
        console.log(`  - Store: ${inv.store?.name}, Quantity: ${inv.quantity}`);
      });
    }

    return NextResponse.json(inventory, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/store-inventory/by-variation] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
