import { options } from "@/app/api/auth/[...nextauth]/options";
import Expense from "@/backend/models/Expense";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["manager", "director", "super_admin"];

// GET /api/finanzas/expenses?storeId=&category=&from=&to=&page=&perPage=
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
    const category = url.searchParams.get("category");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const page = Number(url.searchParams.get("page")) || 1;
    const perPage = Number(url.searchParams.get("perPage")) || 25;

    const query: any = {};
    if (storeId) query.store = storeId;
    if (category) query.category = category;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .populate("store", "name")
      .populate("createdBy", "name")
      .sort({ date: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    // Aggregate total for the filtered query
    const [agg] = await Expense.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    return NextResponse.json(
      { expenses, total, page, perPage, totalAmount: agg?.total ?? 0 },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/finanzas/expenses
export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await dbConnect();

    const data = await req.json();
    const userId = (session.user as any)?._id;

    const expense = await Expense.create({ ...data, createdBy: userId });
    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
