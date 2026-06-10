export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Order from "@/backend/models/Order";
import Expense from "@/backend/models/Expense";
import PayrollEntry from "@/backend/models/PayrollEntry";
import WorkOrder from "@/backend/models/WorkOrder";
import Product from "@/backend/models/Product";
import StoreInventory from "@/backend/models/StoreInventory";
import Store from "@/backend/models/Store";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["manager", "director", "super_admin"];

/**
 * GET /api/reports/full?from=2026-01-01&to=2026-05-31&storeId=xxx&section=all|ventas|finanzas|inventario|nomina
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
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const storeId = url.searchParams.get("storeId");
    const section = url.searchParams.get("section") || "all";

    const start = from
      ? new Date(from)
      : new Date(new Date().getFullYear(), 0, 1);
    const end = to
      ? new Date(new Date(to).setHours(23, 59, 59, 999))
      : new Date();

    const result: any = {};

    // ── VENTAS ────────────────────────────────────────────────────────────────
    if (section === "all" || section === "ventas") {
      const orderMatch: any = {
        createdAt: { $gte: start, $lte: end },
        orderStatus: { $ne: "Cancelado" },
      };
      if (storeId) orderMatch.branch = storeId;

      // Summary
      const [venSummary] = await Order.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$paymentInfo.amountPaid" },
            totalOrders: { $sum: 1 },
            totalItems: { $sum: { $size: "$orderItems" } },
          },
        },
      ]);

      // By status
      const byStatus = await Order.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: "$orderStatus",
            count: { $sum: 1 },
            total: { $sum: "$paymentInfo.amountPaid" },
          },
        },
        { $sort: { total: -1 } },
      ]);

      // By branch
      const byBranch = await Order.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: "$branch",
            count: { $sum: 1 },
            total: { $sum: "$paymentInfo.amountPaid" },
          },
        },
        { $sort: { total: -1 } },
      ]);

      // Top products
      const topProducts = await Order.aggregate([
        { $match: orderMatch },
        { $unwind: "$orderItems" },
        {
          $group: {
            _id: "$orderItems.product",
            name: { $first: "$orderItems.name" },
            totalQty: { $sum: "$orderItems.quantity" },
            totalRevenue: {
              $sum: {
                $multiply: ["$orderItems.price", "$orderItems.quantity"],
              },
            },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
      ]);

      // Monthly trend
      const monthlyTrend = await Order.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            revenue: { $sum: "$paymentInfo.amountPaid" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);

      result.ventas = {
        totalRevenue: venSummary?.totalRevenue ?? 0,
        totalOrders: venSummary?.totalOrders ?? 0,
        totalItems: venSummary?.totalItems ?? 0,
        byStatus,
        byBranch,
        topProducts,
        monthlyTrend,
      };
    }

    // ── FINANZAS ──────────────────────────────────────────────────────────────
    if (section === "all" || section === "finanzas") {
      const expMatch: any = { date: { $gte: start, $lte: end } };
      if (storeId) expMatch.store = storeId;

      const expByCategory = await Expense.aggregate([
        { $match: expMatch },
        {
          $group: {
            _id: "$category",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]);

      const [expTotal] = await Expense.aggregate([
        { $match: expMatch },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      const payMatch: any = { periodStart: { $gte: start, $lte: end } };
      if (storeId) payMatch.store = storeId;

      const [payTotal] = await PayrollEntry.aggregate([
        { $match: payMatch },
        { $group: { _id: null, total: { $sum: "$netAmount" } } },
      ]);

      const payByEmployee = await PayrollEntry.aggregate([
        { $match: payMatch },
        {
          $group: {
            _id: "$employeeName",
            total: { $sum: "$netAmount" },
            periods: { $sum: 1 },
            paid: { $sum: { $cond: ["$isPaid", 1, 0] } },
          },
        },
        { $sort: { total: -1 } },
      ]);

      const [cogsTotal] = await WorkOrder.aggregate([
        {
          $match: {
            type: "receive",
            status: "completed",
            completedAt: { $gte: start, $lte: end },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $multiply: [
                  { $ifNull: ["$items.unitCost", 0] },
                  "$items.quantity",
                ],
              },
            },
          },
        },
      ]);

      const totalExpenses = expTotal?.total ?? 0;
      const totalPayroll = payTotal?.total ?? 0;
      const totalCOGS = cogsTotal?.total ?? 0;
      const totalRevForMargin = result.ventas?.totalRevenue ?? 0;

      result.finanzas = {
        totalExpenses,
        totalPayroll,
        totalCOGS,
        netMargin: totalRevForMargin - totalExpenses - totalPayroll - totalCOGS,
        expByCategory,
        payByEmployee,
      };
    }

    // ── INVENTARIO ────────────────────────────────────────────────────────────
    if (section === "all" || section === "inventario") {
      const invMatch: any = {};
      if (storeId) invMatch.store = storeId;

      const inventoryByStore = await StoreInventory.aggregate([
        { $match: invMatch },
        {
          $group: {
            _id: "$store",
            totalItems: { $sum: 1 },
            totalQty: { $sum: "$quantity" },
            lowStock: {
              $sum: { $cond: [{ $lte: ["$quantity", "$minStock"] }, 1, 0] },
            },
          },
        },
        {
          $lookup: {
            from: "stores",
            localField: "_id",
            foreignField: "_id",
            as: "storeData",
          },
        },
        { $unwind: { path: "$storeData", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            storeName: { $ifNull: ["$storeData.name", "Sin sucursal"] },
            totalItems: 1,
            totalQty: 1,
            lowStock: 1,
          },
        },
      ]);

      // Work orders summary in range
      const woMatch: any = { createdAt: { $gte: start, $lte: end } };
      const woSummary = await WorkOrder.aggregate([
        { $match: woMatch },
        {
          $group: {
            _id: { type: "$type", status: "$status" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.type": 1 } },
      ]);

      // Receive work orders (purchase orders) in range
      const purchaseOrders = await WorkOrder.find({
        type: "receive",
        createdAt: { $gte: start, $lte: end },
      })
        .populate({ path: "toStore", model: Store, select: "name" })
        .select("workOrderNumber status completedAt items notes createdAt")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const purchaseSummary = purchaseOrders.map((wo: any) => ({
        workOrderNumber: wo.workOrderNumber,
        store: wo.toStore?.name ?? "—",
        status: wo.status,
        totalCost: wo.items.reduce(
          (s: number, i: any) => s + (i.unitCost || 0) * i.quantity,
          0,
        ),
        totalUnits: wo.items.reduce((s: number, i: any) => s + i.quantity, 0),
        createdAt: wo.createdAt,
        completedAt: wo.completedAt,
      }));

      result.inventario = { inventoryByStore, woSummary, purchaseSummary };
    }

    // ── NÓMINA ────────────────────────────────────────────────────────────────
    if (section === "all" || section === "nomina") {
      const payMatch: any = { periodStart: { $gte: start, $lte: end } };
      if (storeId) payMatch.store = storeId;

      const entries = await PayrollEntry.find(payMatch)
        .sort({ periodStart: -1 })
        .lean();

      const [payAgg] = await PayrollEntry.aggregate([
        { $match: payMatch },
        {
          $group: {
            _id: null,
            totalNet: { $sum: "$netAmount" },
            totalPaid: { $sum: { $cond: ["$isPaid", "$netAmount", 0] } },
            totalPending: { $sum: { $cond: ["$isPaid", 0, "$netAmount"] } },
            count: { $sum: 1 },
          },
        },
      ]);

      result.nomina = {
        entries,
        totalNet: payAgg?.totalNet ?? 0,
        totalPaid: payAgg?.totalPaid ?? 0,
        totalPending: payAgg?.totalPending ?? 0,
        count: payAgg?.count ?? 0,
      };
    }

    // ── GASTOS ────────────────────────────────────────────────────────────────
    if (section === "all" || section === "gastos") {
      const expMatch: any = { date: { $gte: start, $lte: end } };
      if (storeId) expMatch.store = storeId;

      const expenseList = await Expense.find(expMatch)
        .populate({ path: "store", model: Store, select: "name" })
        .sort({ date: -1 })
        .lean();

      const expByCategory = await Expense.aggregate([
        { $match: expMatch },
        {
          $group: {
            _id: "$category",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]);

      const expMonthlyTrend = await Expense.aggregate([
        { $match: expMatch },
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" },
              category: "$category",
            },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);

      const [expTotals] = await Expense.aggregate([
        { $match: expMatch },
        {
          $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ]);

      result.gastos = {
        total: expTotals?.total ?? 0,
        count: expTotals?.count ?? 0,
        expByCategory,
        expMonthlyTrend,
        expenseList: expenseList.map((e: any) => ({
          _id: e._id,
          date: e.date,
          category: e.category,
          description: e.description,
          amount: e.amount,
          storeName: (e.store as any)?.name ?? "General",
          receiptUrl: e.receiptUrl,
        })),
      };
    }

    // ── IMPUESTOS ─────────────────────────────────────────────────────────────
    if (section === "all" || section === "impuestos") {
      const orderMatch: any = {
        createdAt: { $gte: start, $lte: end },
        orderStatus: { $ne: "Cancelado" },
        "paymentInfo.taxPaid": { $gt: 0 },
      };
      if (storeId) orderMatch.branch = storeId;

      const [ivaSummary] = await Order.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: null,
            totalIVA: { $sum: "$paymentInfo.taxPaid" },
            totalRevenue: { $sum: "$paymentInfo.amountPaid" },
            count: { $sum: 1 },
          },
        },
      ]);

      const ivaByMonth = await Order.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            totalIVA: { $sum: "$paymentInfo.taxPaid" },
            totalRevenue: { $sum: "$paymentInfo.amountPaid" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);

      const ivaByBranch = await Order.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: "$branch",
            totalIVA: { $sum: "$paymentInfo.taxPaid" },
            totalRevenue: { $sum: "$paymentInfo.amountPaid" },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalIVA: -1 } },
      ]);

      // Detailed list — last 200 orders with taxPaid
      const ivaOrders = await Order.find(orderMatch)
        .select(
          "orderId customerName branch createdAt paymentInfo.amountPaid paymentInfo.taxPaid orderStatus",
        )
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();

      result.impuestos = {
        totalIVA: ivaSummary?.totalIVA ?? 0,
        totalRevenue: ivaSummary?.totalRevenue ?? 0,
        count: ivaSummary?.count ?? 0,
        ivaByMonth,
        ivaByBranch,
        ivaOrders,
      };
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[GET /api/reports/full] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
