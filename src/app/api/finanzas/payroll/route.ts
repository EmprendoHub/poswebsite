export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import PayrollEntry from "@/backend/models/PayrollEntry";
import User from "@/backend/models/User";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = ["manager", "director", "super_admin"];

// GET /api/finanzas/payroll?storeId=&isPaid=&from=&to=&page=&perPage=
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
    const isPaid = url.searchParams.get("isPaid");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const page = Number(url.searchParams.get("page")) || 1;
    const perPage = Number(url.searchParams.get("perPage")) || 25;

    const query: any = {};
    if (storeId) query.store = storeId;
    if (isPaid !== null && isPaid !== undefined && isPaid !== "")
      query.isPaid = isPaid === "true";
    if (from || to) {
      query.periodStart = {};
      if (from) query.periodStart.$gte = new Date(from);
      if (to) query.periodStart.$lte = new Date(to);
    }

    const total = await PayrollEntry.countDocuments(query);
    const entries = await PayrollEntry.find(query)
      .populate("employee", "name email")
      .populate("store", "name")
      .sort({ periodStart: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    const [agg] = await PayrollEntry.aggregate([
      { $match: query },
      { $group: { _id: null, totalNet: { $sum: "$netAmount" } } },
    ]);

    return NextResponse.json(
      { entries, total, page, perPage, totalNet: agg?.totalNet ?? 0 },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/finanzas/payroll
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
    const netAmount =
      (data.baseSalary || 0) + (data.bonuses || 0) - (data.deductions || 0);

    // Resolve or create a User record for this employee name so the
    // required `employee` ObjectId ref is always satisfied.
    const slug = (data.employeeName as string)
      .toLowerCase()
      .replace(/\s+/g, ".")
      .replace(/[^a-z0-9.]/g, "");
    const employeeUser = await User.findOneAndUpdate(
      { name: data.employeeName, role: "empleado" },
      {
        $setOnInsert: {
          name: data.employeeName,
          email: `${slug}@nomina.internal`,
          role: "empleado",
          active: true,
          password: "N/A",
        },
      },
      { upsert: true, new: true },
    );

    const entry = await PayrollEntry.create({
      ...data,
      employee: employeeUser._id,
      netAmount,
      ...(userId ? { createdBy: userId } : {}),
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/finanzas/payroll] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
