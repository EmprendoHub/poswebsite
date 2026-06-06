import { options } from "@/app/api/auth/[...nextauth]/options";
import Order from "@/backend/models/Order";
import Product from "@/backend/models/Product";
import StockAdjustmentLog from "@/backend/models/StockAdjustmentLog";
import Store from "@/backend/models/Store";
import StoreInventory from "@/backend/models/StoreInventory";
import WorkOrder from "@/backend/models/WorkOrder";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["manager", "super_admin"];

/**
 * GET /api/pos/cardex?storeId=xxx&productId=yyy&variationId=zzz
 * GET /api/pos/cardex?storeId=xxx&q=search+term   (search products)
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
    const storeId = url.searchParams.get("storeId");
    const productId = url.searchParams.get("productId");
    const variationId = url.searchParams.get("variationId");
    const q = url.searchParams.get("q");

    if (!storeId) {
      return NextResponse.json(
        { error: "storeId es requerido" },
        { status: 400 },
      );
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return NextResponse.json(
        { error: "Sucursal no encontrada" },
        { status: 404 },
      );
    }

    /* ── Product search mode ── */
    if (q) {
      const regex = new RegExp(q.trim(), "i");
      const products = await Product.find({
        $or: [{ title: regex }, { ASIN: regex }, { brand: regex }],
        active: true,
      })
        .select("_id title ASIN brand variations images")
        .limit(20)
        .lean();
      return NextResponse.json({ products });
    }

    /* ── Cardex detail mode ── */
    if (!productId) {
      return NextResponse.json(
        { error: "productId es requerido" },
        { status: 400 },
      );
    }

    const product = (await Product.findById(productId)
      .select("_id title ASIN brand category variations images")
      .lean()) as any;

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      );
    }

    // Current stock for this store
    const inventoryFilter: any = { store: storeId, product: productId };
    if (variationId) inventoryFilter.variationId = variationId;

    const inventoryRecords = (await StoreInventory.find(
      inventoryFilter,
    ).lean()) as any[];

    // Branch values for order lookup
    const branchValues = [store.slug];
    if (store.branchLegacyName && store.branchLegacyName !== store.slug) {
      branchValues.push(store.branchLegacyName);
    }

    // All non-cancelled orders from this store that include this product
    const orders = (await Order.find({
      branch: { $in: branchValues },
      orderStatus: { $ne: "Cancelado" },
      "orderItems.product": productId,
      ...(variationId ? { "orderItems.variation": variationId } : {}),
    })
      .select(
        "_id orderId customerName phone createdAt orderStatus paymentInfo orderItems branch",
      )
      .sort({ createdAt: -1 })
      .lean()) as any[];

    // Completed work orders that include this product in source/destination store
    const workOrders = (await WorkOrder.find({
      status: "completed",
      "items.product": productId,
      ...(variationId ? { "items.variationId": variationId } : {}),
      $or: [{ fromStore: storeId }, { toStore: storeId }],
    })
      .select(
        "workOrderNumber type fromStore toStore completedAt createdAt items notes",
      )
      .populate({ path: "fromStore", model: Store, select: "name" })
      .populate({ path: "toStore", model: Store, select: "name" })
      .sort({ completedAt: -1, createdAt: -1 })
      .lean()) as any[];

    // Manual stock adjustment logs
    const adjustments = (await StockAdjustmentLog.find({
      store: storeId,
      product: productId,
      ...(variationId ? { variationId } : {}),
    })
      .select(
        "variationId delta previousQuantity newQuantity reason createdByName createdAt",
      )
      .sort({ createdAt: -1 })
      .lean()) as any[];

    // Build movement rows
    const movements: any[] = [];

    for (const order of orders) {
      const matchingItems = (order.orderItems as any[]).filter(
        (item: any) =>
          String(item.product) === String(productId) &&
          (!variationId || item.variation === variationId),
      );
      for (const item of matchingItems) {
        movements.push({
          type: "sale",
          date: order.createdAt,
          reference: `#${order.orderId}`,
          orderId: order.orderId,
          customerName: order.customerName || "—",
          phone: order.phone || "",
          orderStatus: order.orderStatus,
          payMethod: order.paymentInfo?.id ?? "—",
          variationId: item.variation,
          variationName: item.name,
          quantity: item.quantity,
          stockImpact: -Math.abs(Number(item.quantity) || 0),
          unitPrice: item.price,
          total: item.price * item.quantity,
          details: "Venta POS",
        });
      }
    }

    for (const wo of workOrders) {
      const matchingItems = (wo.items as any[]).filter(
        (item: any) =>
          String(item.product) === String(productId) &&
          (!variationId || item.variationId === variationId),
      );

      for (const item of matchingItems) {
        const qty = Number(item.quantity) || 0;
        const fromStoreId = wo.fromStore?._id
          ? String(wo.fromStore._id)
          : wo.fromStore
            ? String(wo.fromStore)
            : null;
        const toStoreId = wo.toStore?._id
          ? String(wo.toStore._id)
          : wo.toStore
            ? String(wo.toStore)
            : null;

        const fromStoreName = wo.fromStore?.name || "Origen";
        const toStoreName = wo.toStore?.name || "Destino";
        const movementDate = wo.completedAt || wo.createdAt;

        if (wo.type === "transfer") {
          if (fromStoreId === String(storeId)) {
            movements.push({
              type: "transfer_out",
              date: movementDate,
              reference: `OT-${wo.workOrderNumber}`,
              variationId: item.variationId,
              variationName: item.variationTitle || item.productTitle,
              quantity: qty,
              stockImpact: -Math.abs(qty),
              unitPrice: 0,
              total: 0,
              details: `Transferencia a ${toStoreName}`,
            });
          }

          if (toStoreId === String(storeId)) {
            movements.push({
              type: "transfer_in",
              date: movementDate,
              reference: `OT-${wo.workOrderNumber}`,
              variationId: item.variationId,
              variationName: item.variationTitle || item.productTitle,
              quantity: qty,
              stockImpact: Math.abs(qty),
              unitPrice: 0,
              total: 0,
              details: `Transferencia desde ${fromStoreName}`,
            });
          }
          continue;
        }

        // receive / adjustment / new_product -> incoming stock on destination store
        if (toStoreId === String(storeId)) {
          const type = wo.type === "adjustment" ? "adjustment" : "transfer_in";
          movements.push({
            type,
            date: movementDate,
            reference: `OT-${wo.workOrderNumber}`,
            variationId: item.variationId,
            variationName: item.variationTitle || item.productTitle,
            quantity: qty,
            stockImpact: Math.abs(qty),
            unitPrice: 0,
            total: 0,
            details:
              wo.type === "adjustment"
                ? `Ajuste por orden de trabajo${wo.notes ? `: ${wo.notes}` : ""}`
                : wo.type === "new_product"
                  ? "Alta de producto por orden de trabajo"
                  : "Recepción por orden de trabajo",
          });
        }
      }
    }

    for (const adj of adjustments) {
      const delta = Number(adj.delta) || 0;
      movements.push({
        type: "adjustment",
        date: adj.createdAt,
        reference: `ADJ-${String(adj._id).slice(-6).toUpperCase()}`,
        variationId: adj.variationId,
        variationName: "",
        quantity: Math.abs(delta),
        stockImpact: delta,
        unitPrice: 0,
        total: 0,
        details: `${adj.reason || "Ajuste manual"} · ${adj.createdByName || "—"}`,
      });
    }

    // Sort newest first
    movements.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return NextResponse.json({
      product,
      inventoryRecords,
      movements,
      storeName: store.name,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
