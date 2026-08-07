export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Order from "@/backend/models/Order";
import Product from "@/backend/models/Product";
import StockAdjustmentLog from "@/backend/models/StockAdjustmentLog";
import Store from "@/backend/models/Store";
import StoreInventory from "@/backend/models/StoreInventory";
import WorkOrder from "@/backend/models/WorkOrder";
import CashRegisterMovement from "@/backend/models/CashRegisterMovement";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = [
  "manager",
  "super_admin",
  "pos",
  "organizer",
  "empleado",
  "sucursal",
  "supervisor",
];

/**
 * GET /api/pos/cardex?productId=yyy&variationId=zzz
 * GET /api/pos/cardex?q=search+term   (search products)
 *
 * Accessible to POS users after manager code verification
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
    const productId = url.searchParams.get("productId");
    const variationId = url.searchParams.get("variationId");
    const q = url.searchParams.get("q");

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

    /* ── Cardex detail mode (all stores) ── */
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

    // Get all inventory records for this product (all stores)
    const inventoryFilter: any = { product: productId };
    if (variationId) inventoryFilter.variationId = variationId;

    const inventoryRecords = (await StoreInventory.find(inventoryFilter)
      .populate("store", "name")
      .lean()) as any[];

    // Build storeStockMap: { storeName: { variationId: quantity } }
    const storeStockMap: {
      [storeName: string]: { [variationId: string]: number };
    } = {};
    for (const inv of inventoryRecords) {
      const storeName = inv.store?.name || "Desconocida";
      if (!storeStockMap[storeName]) {
        storeStockMap[storeName] = {};
      }
      storeStockMap[storeName][inv.variationId] = inv.quantity || 0;
    }

    // Get all orders (any branch, including cancelled) that include this product
    const orders = (await Order.find({
      "orderItems.product": productId,
      ...(variationId ? { "orderItems.variation": variationId } : {}),
    })
      .select(
        "_id orderId customerName phone createdAt orderStatus paymentInfo orderItems branch user",
      )
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .lean()) as any[];

    // Get all completed work orders (any store combination) with this product
    const workOrders = (await WorkOrder.find({
      status: "completed",
      "items.product": productId,
      ...(variationId ? { "items.variationId": variationId } : {}),
    })
      .select(
        "workOrderNumber type fromStore toStore completedAt createdAt items notes requestedBy",
      )
      .populate({ path: "fromStore", model: Store, select: "name" })
      .populate({ path: "toStore", model: Store, select: "name" })
      .populate("requestedBy", "name")
      .sort({ completedAt: -1, createdAt: -1 })
      .lean()) as any[];

    // Get manual stock adjustments
    const adjustments = (await StockAdjustmentLog.find({
      product: productId,
      ...(variationId ? { variationId } : {}),
    })
      .select(
        "variationId delta previousQuantity newQuantity reason createdByName createdAt store",
      )
      .populate("store", "name")
      .sort({ createdAt: -1 })
      .lean()) as any[];

    // Build movement rows with authorizedBy and branches
    const movements: any[] = [];

    for (const order of orders) {
      const matchingItems = (order.orderItems as any[]).filter(
        (item: any) =>
          String(item.product) === String(productId) &&
          (!variationId || item.variation === variationId),
      );
      for (const item of matchingItems) {
        const discount = Number(item.discountPercentage) || 0;
        const discountedPrice = item.price * (1 - discount / 100);
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
          unitPrice: discountedPrice,
          total: discountedPrice * item.quantity,
          details: `Venta POS${discount > 0 ? ` (-${discount}%)` : ""}`,
          authorizedBy: order.user?.name || "Sistema",
          branches: [order.branch || "Desconocida"],
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
          if (fromStoreId === String(fromStoreId)) {
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
              authorizedBy: wo.requestedBy?.name || "Sistema",
              branches: [fromStoreName, toStoreName].filter(Boolean),
            });
          }

          if (toStoreId === String(toStoreId)) {
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
              authorizedBy: wo.requestedBy?.name || "Sistema",
              branches: [fromStoreName, toStoreName].filter(Boolean),
            });
          }
          continue;
        }

        // receive / adjustment / new_product -> incoming stock on destination store
        if (toStoreId === String(toStoreId)) {
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
            authorizedBy: wo.requestedBy?.name || "Sistema",
            branches: [toStoreName].filter(Boolean),
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
        details: `${adj.reason || "Ajuste manual"}`,
        authorizedBy: adj.createdByName || "Sistema",
        branches: [adj.store?.name || "Desconocida"].filter(Boolean),
      });
    }

    // Get all cancellation movements (manual_in from cancelled orders)
    const cancellationMovements = (await CashRegisterMovement.find({
      type: "manual_in",
      notes: { $regex: "Pedido Cancelado" },
      order: { $exists: true },
    })
      .populate("order", "orderItems")
      .populate("store", "name")
      .sort({ createdAt: -1 })
      .lean()) as any[];

    for (const move of cancellationMovements) {
      const order = move.order as any;
      if (!order || !order.orderItems) continue;

      const matchingItems = (order.orderItems as any[]).filter(
        (item: any) =>
          String(item.product) === String(productId) &&
          (!variationId || item.variation === variationId),
      );

      for (const item of matchingItems) {
        const discount = Number(item.discountPercentage) || 0;
        const discountedPrice = item.price * (1 - discount / 100);
        movements.push({
          type: "adjustment", // Show as adjustment to distinguish from regular sales
          date: move.createdAt,
          reference: `#${String(order._id).slice(-6).toUpperCase()}`,
          variationId: item.variation,
          variationName: item.name,
          quantity: item.quantity,
          stockImpact: Math.abs(Number(item.quantity) || 0), // Returning to stock
          unitPrice: discountedPrice,
          total: discountedPrice * item.quantity,
          details: `Retorno - ${move.notes || "Pedido Cancelado"}`,
          authorizedBy: move.authorizedByName || "Sistema",
          branches: [move.store?.name || "Desconocida"].filter(Boolean),
        });
      }
    }

    // Sort newest first
    movements.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return NextResponse.json({
      product,
      inventoryRecords,
      movements,
      storeName: "Todas las sucursales",
      storeStockMap,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
