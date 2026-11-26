export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const ALLOWED_ROLES = [
  "manager",
  "director",
  "super_admin",
  "admin",
  "sucursal",
  "pos",
  "organizer",
  "empleado",
  "supervisor",
];

/**
 * POST /api/admin/cache-revalidate
 * Force revalidate all inventory-related caches
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Revalidate all admin and product-related paths
    console.log(
      "[POST /api/admin/cache-revalidate] Starting cache revalidation...",
    );

    // Admin section
    revalidatePath("/admin/productos", "page");
    revalidatePath("/(manager)/admin/productos", "layout");
    revalidatePath("/admin/inventario", "page");
    revalidatePath("/(manager)/admin/inventario", "layout");
    revalidatePath("/admin/ajuste-discrepancias", "page");
    revalidatePath("/(manager)/admin/ajuste-discrepancias", "layout");

    // Public store pages
    revalidatePath("/tienda", "page");
    revalidatePath("/(home)/tienda", "layout");

    // Product pages
    revalidatePath("/producto", "page");
    revalidatePath("/(home)/producto", "layout");

    // Shopping cart
    revalidatePath("/carrito", "page");
    revalidatePath("/(home)/carrito", "layout");

    // POS pages
    revalidatePath("/(pos)/puntodeventa", "layout");

    console.log(
      "[POST /api/admin/cache-revalidate] Cache revalidation completed",
    );

    return NextResponse.json(
      { success: true, message: "Cache revalidated successfully" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[POST /api/admin/cache-revalidate] Error:", error);
    return NextResponse.json(
      { error: error.message || "Error during cache revalidation" },
      { status: 500 },
    );
  }
}
