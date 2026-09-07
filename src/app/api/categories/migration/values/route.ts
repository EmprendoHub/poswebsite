export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const NO_VALUE = "(sin valor)";

// GET /api/categories/migration/values
// Returns every distinct (gender, category) combination still in use by
// products, with counts and migration progress, so an admin can see exactly
// which group of products a given mapping will affect before applying it.
export async function GET() {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !["manager", "super_admin"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const rows = await Product.aggregate([
      {
        $match: {
          $or: [
            { gender: { $nin: [null, ""] } },
            { category: { $nin: [null, ""] } },
          ],
        },
      },
      {
        $group: {
          _id: {
            gender: { $ifNull: ["$gender", NO_VALUE] },
            category: { $ifNull: ["$category", NO_VALUE] },
          },
          count: { $sum: 1 },
          migratedMain: {
            $sum: { $cond: [{ $ifNull: ["$subCategory", false] }, 1, 0] },
          },
          migratedAttributes: {
            $sum: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ["$attributes", []] } }, 0] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const groups = rows.map((r) => ({
      gender: r._id.gender,
      category: r._id.category,
      count: r.count,
      migratedMain: r.migratedMain,
      migratedAttributes: r.migratedAttributes,
    }));

    return NextResponse.json({ success: true, groups }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching migration values:", error);
    return NextResponse.json(
      { error: error.message || "Error fetching migration values" },
      { status: 500 },
    );
  }
}
