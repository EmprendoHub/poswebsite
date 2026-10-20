export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Order from "@/backend/models/Order";
import Product from "@/backend/models/Product";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

const ALLOWED_ROLES = ["manager", "director", "super_admin"];

/**
 * GET /api/reports/by-product?from=2026-01-01&to=2026-05-31&storeId=xxx
 * Returns detailed product-level sales analytics
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
    const sortBy = url.searchParams.get("sortBy") || "units"; // units, revenue, profit
    const sortOrder = url.searchParams.get("sortOrder") || "desc"; // asc, desc

    // Parse dates
    const parseLocalDay = (s: string): Date => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d);
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

    // Build match condition
    const aggMatch: any = {
      createdAt: { $gte: start, $lte: end },
      orderStatus: { $ne: "Cancelado" },
    };

    if (storeId && storeId !== "") {
      const storeObjId = new mongoose.Types.ObjectId(storeId);
      aggMatch.store = storeObjId;
    }

    // Aggregate product-level data
    const productData = await Order.aggregate([
      { $match: aggMatch },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          productName: { $first: "$orderItems.name" },
          sku: { $first: "$orderItems.sku" },
          totalUnits: { $sum: "$orderItems.quantity" },
          totalRevenue: {
            $sum: {
              $multiply: ["$orderItems.price", "$orderItems.quantity"],
            },
          },
          avgPrice: { $avg: "$orderItems.price" },
          minPrice: { $min: "$orderItems.price" },
          maxPrice: { $max: "$orderItems.price" },
          totalOrders: { $sum: 1 },
          variantCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $addFields: {
          productDetails: { $arrayElemAt: ["$productDetails", 0] },
        },
      },
      {
        $addFields: {
          cost: {
            $multiply: [
              { $ifNull: ["$productDetails.cost", 0] },
              "$totalUnits",
            ],
          },
          profit: {
            $subtract: [
              "$totalRevenue",
              {
                $multiply: [
                  { $ifNull: ["$productDetails.cost", 0] },
                  "$totalUnits",
                ],
              },
            ],
          },
          profitMargin: {
            $cond: [
              { $gt: ["$totalRevenue", 0] },
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $subtract: [
                          "$totalRevenue",
                          {
                            $multiply: [
                              { $ifNull: ["$productDetails.cost", 0] },
                              "$totalUnits",
                            ],
                          },
                        ],
                      },
                      "$totalRevenue",
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          productName: 1,
          sku: 1,
          totalUnits: 1,
          totalRevenue: 1,
          avgPrice: 1,
          minPrice: 1,
          maxPrice: 1,
          totalOrders: 1,
          variantCount: 1,
          cost: 1,
          profit: 1,
          profitMargin: 1,
          category: "$productDetails.category",
          brand: "$productDetails.brand",
          mainCategory: "$productDetails.mainCategory",
          subCategory: "$productDetails.subCategory",
          asin: "$productDetails.ASIN",
          image: "$productDetails.image",
        },
      },
    ]);

    // Apply sorting
    const sortField = {
      units: "totalUnits",
      revenue: "totalRevenue",
      profit: "profit",
      orders: "totalOrders",
      margin: "profitMargin",
    }[sortBy] || "totalUnits";

    const sortDir = sortOrder === "asc" ? 1 : -1;

    productData.sort((a: any, b: any) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      return sortDir === 1 ? aVal - bVal : bVal - aVal;
    });

    // Calculate summary statistics
    const summary = {
      totalProducts: productData.length,
      totalUnits: productData.reduce((sum: number, p: any) => sum + (p.totalUnits || 0), 0),
      totalRevenue: productData.reduce((sum: number, p: any) => sum + (p.totalRevenue || 0), 0),
      totalCost: productData.reduce((sum: number, p: any) => sum + (p.cost || 0), 0),
      totalProfit: productData.reduce((sum: number, p: any) => sum + (p.profit || 0), 0),
      avgUnitsPerProduct: 0,
      avgRevenuePerProduct: 0,
      overallProfitMargin: 0,
    };

    if (summary.totalProducts > 0) {
      summary.avgUnitsPerProduct = summary.totalUnits / summary.totalProducts;
      summary.avgRevenuePerProduct = summary.totalRevenue / summary.totalProducts;
    }

    if (summary.totalRevenue > 0) {
      summary.overallProfitMargin =
        (summary.totalProfit / summary.totalRevenue) * 100;
    }

    return NextResponse.json(
      {
        products: productData,
        summary,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in product report:", error);
    return NextResponse.json(
      { error: "Error generating product report" },
      { status: 500 },
    );
  }
}
