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
import mongoose from "mongoose";

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
    const category = url.searchParams.get("category");
    const brand = url.searchParams.get("brand");
    const gender = url.searchParams.get("gender");

    // Parse "YYYY-MM-DD" strings as LOCAL midnight to avoid the UTC-parse + local
    // setHours mismatch that causes same-day ranges to return zero results.
    const parseLocalDay = (s: string): Date => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d); // local midnight
    };

    const startDay = from
      ? parseLocalDay(from)
      : new Date(new Date().getFullYear(), 0, 1);
    const start = new Date(
      startDay.getFullYear(),
      startDay.getMonth(),
      startDay.getDate(),
      0,
      0,
      0,
      0,
    );

    const endDay = to ? parseLocalDay(to) : new Date();
    const end = new Date(
      endDay.getFullYear(),
      endDay.getMonth(),
      endDay.getDate(),
      23,
      59,
      59,
      999,
    );

    // For monthly trend: from Jan 1 of current year to selected "hasta" date
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const monthlyTrendStart = new Date(
      yearStart.getFullYear(),
      yearStart.getMonth(),
      yearStart.getDate(),
      0,
      0,
      0,
      0,
    );
    const monthlyTrendEnd = end; // Use the same end date as the selected range

    // Calculate date ranges for dashboard metrics
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday of current week
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const yearStart_Dashboard = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    const result: any = {};

    // Convert storeId to ObjectId if provided
    let storeObjId: mongoose.Types.ObjectId | null = null;
    if (storeId) {
      try {
        storeObjId = new mongoose.Types.ObjectId(storeId);
      } catch (err) {
        console.log("⚠️ Invalid storeId format:", storeId);
      }
    }

    // Resolve storeId → branch values used in Order.branch field.
    // Orders store branch as store.slug (sometimes branchLegacyName), NOT the _id.
    let branchFilter: string[] | null = null;
    if (storeId) {
      const storeDoc = await Store.findById(storeId)
        .select("slug branchLegacyName")
        .lean<any>();
      if (storeDoc) {
        branchFilter = [storeDoc.slug];
        if (
          storeDoc.branchLegacyName &&
          storeDoc.branchLegacyName !== storeDoc.slug
        ) {
          branchFilter.push(storeDoc.branchLegacyName);
        }
      }
    }

    // Build product filter for category, brand, gender
    let productFilter: any = {};
    if (category) productFilter.category = category;
    if (brand) productFilter.brand = brand;
    if (gender) productFilter.gender = gender;

    // Get filtered product IDs if any filters are applied
    let filteredProductIds: string[] | null = null;
    if (Object.keys(productFilter).length > 0) {
      const filteredProducts = await Product.find(productFilter)
        .select("_id")
        .lean<any>();
      filteredProductIds = filteredProducts.map((p: any) => p._id.toString());
    } else {
      console.log("📊 No product filters applied - showing all products");
    }

    // ── VENTAS ───────────────────────────────────────────────────────────────────────────────
    if (section === "all" || section === "ventas") {
      const orderMatch: any = {
        createdAt: { $gte: start, $lte: end },
        orderStatus: { $ne: "Cancelado" },
      };
      if (branchFilter) orderMatch.branch = { $in: branchFilter };
      if (filteredProductIds && filteredProductIds.length > 0) {
        // Use $elemMatch to properly match array elements
        orderMatch.orderItems = {
          $elemMatch: { product: { $in: filteredProductIds } },
        };
      }

      // Count matching orders for debugging
      const orderCount = await Order.countDocuments(orderMatch);

      // Build simplified aggregation match (used for ALL aggregations in this section)
      let matchingOrderIds: any[] = [];
      if (filteredProductIds && filteredProductIds.length > 0) {
        const orders = await Order.find(orderMatch).select("_id").lean<any>();
        matchingOrderIds = orders.map((o: any) => o._id);
      }

      const aggMatch: any = {
        createdAt: { $gte: start, $lte: end },
        orderStatus: { $ne: "Cancelado" },
      };
      if (branchFilter) aggMatch.branch = { $in: branchFilter };
      if (matchingOrderIds.length > 0) {
        aggMatch._id = { $in: matchingOrderIds };
      }

      // Summary
      let venSummary: any = null;
      try {
        const venSummaryResults = await Order.aggregate([
          { $match: aggMatch },
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: {
                  $cond: [
                    { $isNumber: "$paymentInfo.amountPaid" },
                    "$paymentInfo.amountPaid",
                    0,
                  ],
                },
              },
              totalOrders: { $sum: 1 },
              totalItems: { $sum: { $size: "$orderItems" } },
            },
          },
        ]);

        if (venSummaryResults.length > 0) {
          [venSummary] = venSummaryResults;
        } else {
          console.warn("⚠️ Aggregation returned empty array");
          // Fallback: count orders manually
          const orderCount = await Order.countDocuments(aggMatch);

          venSummary = {
            totalRevenue: 0,
            totalOrders: orderCount,
            totalItems: 0,
          };
        }
      } catch (aggErr: any) {
        console.error("❌ Ventas Summary aggregation error:", aggErr.message);
        console.error("❌ Error details:", aggErr);
        venSummary = null;
      }

      // By status
      let byStatus: any[] = [];
      try {
        byStatus = await Order.aggregate([
          { $match: aggMatch },
          {
            $group: {
              _id: "$orderStatus",
              count: { $sum: 1 },
              total: {
                $sum: {
                  $cond: [
                    { $isNumber: "$paymentInfo.amountPaid" },
                    "$paymentInfo.amountPaid",
                    0,
                  ],
                },
              },
            },
          },
          { $sort: { total: -1 } },
        ]);
      } catch (err: any) {
        console.error("❌ byStatus aggregation error:", err.message);
      }

      // By branch
      let byBranch: any[] = [];
      try {
        byBranch = await Order.aggregate([
          { $match: aggMatch },
          {
            $group: {
              _id: "$branch",
              count: { $sum: 1 },
              total: {
                $sum: {
                  $cond: [
                    { $isNumber: "$paymentInfo.amountPaid" },
                    "$paymentInfo.amountPaid",
                    0,
                  ],
                },
              },
            },
          },
          { $sort: { total: -1 } },
        ]);
      } catch (err: any) {
        console.error("❌ byBranch aggregation error:", err.message);
      }

      // Top products
      let topProducts: any[] = [];
      try {
        topProducts = await Order.aggregate([
          { $match: aggMatch },
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
          { $limit: 7 },
        ]);
      } catch (err: any) {
        console.error("❌ topProducts aggregation error:", err.message);
      }

      // Monthly trend (from Jan 1 of current year to selected "hasta" date)
      let monthlyTrend: any[] = [];
      try {
        monthlyTrend = await Order.aggregate([
          {
            $match: {
              ...aggMatch,
              createdAt: { $gte: monthlyTrendStart, $lte: monthlyTrendEnd },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              revenue: {
                $sum: {
                  $cond: [
                    { $isNumber: "$paymentInfo.amountPaid" },
                    "$paymentInfo.amountPaid",
                    0,
                  ],
                },
              },
              orders: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]);
      } catch (err: any) {
        console.error("❌ monthlyTrend aggregation error:", err.message);
      }

      // Daily trend (sales per day)
      let dailyTrend: any[] = [];
      try {
        dailyTrend = await Order.aggregate([
          { $match: aggMatch },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
                day: { $dayOfMonth: "$createdAt" },
              },
              revenue: {
                $sum: {
                  $cond: [
                    { $isNumber: "$paymentInfo.amountPaid" },
                    "$paymentInfo.amountPaid",
                    0,
                  ],
                },
              },
              orders: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
        ]);
      } catch (err: any) {
        console.error("❌ dailyTrend aggregation error:", err.message);
      }

      // By payment method — 3 buckets: Efectivo / Mixto / Terminal
      let byPayMethod: any[] = [];
      try {
        byPayMethod = await Order.aggregate([
          { $match: aggMatch },
          {
            $group: {
              _id: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ["$paymentInfo.id", "EFECTIVO"] },
                      then: "Efectivo",
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: { $ifNull: ["$paymentInfo.id", ""] },
                          regex: "^MIXTO",
                        },
                      },
                      then: "Mixto",
                    },
                  ],
                  default: "Terminal",
                },
              },
              total: {
                $sum: {
                  $cond: [
                    { $isNumber: "$paymentInfo.amountPaid" },
                    "$paymentInfo.amountPaid",
                    0,
                  ],
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
        ]);
      } catch (err: any) {
        console.error("❌ byPayMethod aggregation error:", err.message);
      }

      // Detailed per-order list (include cancelled in list for full picture, but will skip when calculating totals)
      const orderListMatch: any = { createdAt: { $gte: start, $lte: end } };
      if (branchFilter) orderListMatch.branch = { $in: branchFilter };
      if (matchingOrderIds.length > 0) {
        orderListMatch._id = { $in: matchingOrderIds };
      } else if (
        filteredProductIds &&
        filteredProductIds.length > 0 &&
        matchingOrderIds.length === 0
      ) {
        // If product filters were applied but no matching orders found, return empty list
        orderListMatch._id = { $in: [] };
      }

      // Fetch ALL orders matching the filter (no limit) for accurate revenue calculations
      const orderList = await Order.find(orderListMatch)
        .select("orderId customerName branch createdAt paymentInfo orderStatus")
        .sort({ createdAt: -1 })
        .lean();

      // Split MIXTO cash vs terminal components from orderList
      const _parseMixto = (id: string) => ({
        cash: +(id.match(/CASH:([\.\d]+)/)?.[1] ?? 0),
        card: +(id.match(/CARD:([\.\d]+)/)?.[1] ?? 0),
      });
      let revenueEfectivo = 0;
      let revenueTerminal = 0;
      for (const o of orderList as any[]) {
        if (o.orderStatus === "Cancelado") continue;
        const pid: string = o.paymentInfo?.id ?? "";
        const amt: number = o.paymentInfo?.amountPaid ?? 0;
        if (pid === "EFECTIVO") {
          revenueEfectivo += amt;
        } else if (pid.startsWith("MIXTO")) {
          const { cash, card } = _parseMixto(pid);
          revenueEfectivo += cash;
          revenueTerminal += card;
        } else {
          revenueTerminal += amt;
        }
      }
      revenueEfectivo = Math.round(revenueEfectivo * 100) / 100;
      revenueTerminal = Math.round(revenueTerminal * 100) / 100;

      // Calculate period-specific revenues for dashboard
      const calculatePeriodRevenue = async (matchCriteria: any) => {
        try {
          const results = await Order.aggregate([
            { $match: { ...matchCriteria, orderStatus: { $ne: "Cancelado" } } },
            {
              $group: {
                _id: null,
                totalRevenue: {
                  $sum: {
                    $cond: [
                      { $isNumber: "$paymentInfo.amountPaid" },
                      "$paymentInfo.amountPaid",
                      0,
                    ],
                  },
                },
              },
            },
          ]);
          return results[0]?.totalRevenue ?? 0;
        } catch (err) {
          console.error("Error calculating period revenue:", err);
          return 0;
        }
      };

      // Calculate revenues for different periods
      const baseMatch: any = { orderStatus: { $ne: "Cancelado" } };
      if (branchFilter) baseMatch.branch = { $in: branchFilter };
      if (matchingOrderIds.length > 0)
        baseMatch._id = { $in: matchingOrderIds };

      const todayRevenue = await calculatePeriodRevenue({
        ...baseMatch,
        createdAt: { $gte: todayStart, $lte: todayEnd },
      });

      const weekRevenue = await calculatePeriodRevenue({
        ...baseMatch,
        createdAt: { $gte: weekStart, $lte: todayEnd },
      });

      const monthRevenue = await calculatePeriodRevenue({
        ...baseMatch,
        createdAt: { $gte: monthStart, $lte: monthEnd },
      });

      const yearRevenue = await calculatePeriodRevenue({
        ...baseMatch,
        createdAt: { $gte: yearStart_Dashboard, $lte: yearEnd },
      });

      result.ventas = {
        totalRevenue: venSummary?.totalRevenue ?? 0,
        totalOrders: venSummary?.totalOrders ?? 0,
        totalItems: venSummary?.totalItems ?? 0,
        revenueEfectivo,
        revenueTerminal,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        yearRevenue,
        byStatus,
        byBranch,
        byPayMethod,
        topProducts,
        monthlyTrend,
        dailyTrend,
        orderList,
      };
    }

    // ── FINANZAS ──────────────────────────────────────────────────────────────
    if (section === "all" || section === "finanzas") {
      // Expenses and Payroll can be filtered by store when selected
      const expMatch: any = { date: { $gte: start, $lte: end } };
      if (storeObjId) expMatch.store = storeObjId;

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
      if (storeObjId) payMatch.store = storeObjId;

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

      const cogsMatch: any = {
        type: "receive",
        status: "completed",
        completedAt: { $gte: start, $lte: end },
      };
      if (storeObjId) cogsMatch.toStore = storeObjId;

      const cogsResult = await WorkOrder.aggregate([
        { $match: cogsMatch },
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

      const cogsTotal = cogsResult[0];
      const totalExpenses = expTotal?.total ?? 0;
      const totalPayroll = payTotal?.total ?? 0;
      const totalCOGS = cogsTotal?.total ?? 0;
      const totalRevForMargin = result.ventas?.totalRevenue ?? 0;

      result.finanzas = {
        totalRevForMargin,
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
      if (storeObjId) invMatch.store = storeObjId;
      if (filteredProductIds && filteredProductIds.length > 0) {
        invMatch.product = { $in: filteredProductIds };
      }

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
      if (storeObjId) payMatch.store = storeObjId;

      const entries = await PayrollEntry.find(payMatch)
        .sort({ periodStart: -1 })
        .lean();

      const payAggResult = await PayrollEntry.aggregate([
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

      const payAgg = payAggResult[0];

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
      if (storeObjId) expMatch.store = storeObjId;

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

      const expTotalsResult = await Expense.aggregate([
        { $match: expMatch },
        {
          $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ]);

      const expTotals = expTotalsResult[0];

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
      if (branchFilter) orderMatch.branch = { $in: branchFilter };

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
