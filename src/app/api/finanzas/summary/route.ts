import { options } from "@/app/api/auth/[...nextauth]/options";
import Expense from "@/backend/models/Expense";
import PayrollEntry from "@/backend/models/PayrollEntry";
import Order from "@/backend/models/Order";
import WorkOrder from "@/backend/models/WorkOrder";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["manager", "director", "super_admin"];

// GET /api/finanzas/summary?year=2026&month=5
export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();

    const url = new URL(req.url);
    const year =
      Number(url.searchParams.get("year")) || new Date().getFullYear();
    const month =
      Number(url.searchParams.get("month")) || new Date().getMonth() + 1;

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    // All expenses grouped by category
    const expensesByCategory = await Expense.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Helper to pull a total for a specific category from the grouped result
    const categoryTotal = (cat: string) =>
      expensesByCategory.find((r: any) => r._id === cat)?.total ?? 0;

    const totalRenta = categoryTotal("renta");
    // Expenses excluding renta (shown separately) and nomina (tracked via PayrollEntry)
    const EXCLUDED_FROM_OTROS = ["renta", "nomina"];
    const totalOtrosGastos = expensesByCategory
      .filter((r: any) => !EXCLUDED_FROM_OTROS.includes(r._id))
      .reduce((sum: number, r: any) => sum + r.total, 0);
    // Full total still used for Margen Neto
    const totalExpenses = expensesByCategory.reduce(
      (sum: number, r: any) => sum + r.total,
      0,
    );

    // Payroll total this month
    const [payAgg] = await PayrollEntry.aggregate([
      { $match: { periodStart: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$netAmount" } } },
    ]);

    // Revenue from orders this month (paid/delivered)
    const [revAgg] = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          orderStatus: {
            $in: ["Pagado", "Entregado", "Enviado", "Procesando"],
          },
        },
      },
      { $group: { _id: null, total: { $sum: "$paymentInfo.amountPaid" } } },
    ]);

    // COGS: sum of unitCost × quantity from completed "receive" work orders
    // (ordenes de compra) completed in this period
    const [cogsAgg] = await WorkOrder.aggregate([
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

    // Monthly trend: last 6 months of expenses + payroll
    const sixMonthsAgo = new Date(year, month - 7, 1);
    const monthlyExpenses = await Expense.aggregate([
      { $match: { date: { $gte: sixMonthsAgo, $lte: end } } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          expenses: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthlyPayroll = await PayrollEntry.aggregate([
      { $match: { periodStart: { $gte: sixMonthsAgo, $lte: end } } },
      {
        $group: {
          _id: {
            year: { $year: "$periodStart" },
            month: { $month: "$periodStart" },
          },
          payroll: { $sum: "$netAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return NextResponse.json({
      month: { year, month },
      totalExpenses,
      totalRenta,
      totalOtrosGastos,
      totalPayroll: payAgg?.total ?? 0,
      totalRevenue: revAgg?.total ?? 0,
      totalCOGS: cogsAgg?.total ?? 0,
      expensesByCategory,
      monthlyExpenses,
      monthlyPayroll,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
