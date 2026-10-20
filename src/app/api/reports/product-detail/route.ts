export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Order from "@/backend/models/Order";
import Product from "@/backend/models/Product";
import Store from "@/backend/models/Store";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

const ALLOWED_ROLES = ["manager", "director", "super_admin"];

/**
 * GET /api/reports/product-detail?productId=xxx&from=2026-01-01&to=2026-05-31&storeId=xxx
 * Returns detailed report for a single product
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
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const storeId = url.searchParams.get("storeId");

    if (!productId) {
      return NextResponse.json(
        { error: "productId es requerido" },
        { status: 400 },
      );
    }

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

    // Get product details
    const productObjId = new mongoose.Types.ObjectId(productId);
    const product = await Product.findById(productObjId);

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      );
    }

    // Build match condition for orders
    const aggMatch: any = {
      createdAt: { $gte: start, $lte: end },
      orderStatus: { $ne: "Cancelado" },
      "orderItems.product": productObjId,
    };

    // Handle store filter - resolve storeId to branch slug (as used in Order.branch)
    let branchFilter: string[] | null = null;
    if (storeId && storeId !== "") {
      try {
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
      
          aggMatch.branch = { $in: branchFilter };
        } else {
          console.log("⚠️ Store not found:", storeId);
        }
      } catch (err) {
        console.log("⚠️ Invalid storeId format:", storeId, err);
      }
    } else {
      console.log("🏪 No store filter (showing all stores)");
    }

    // DIAGNOSTIC: Check if ANY orders exist for this product in date range (ignore branch filter)
    const diagnosticMatch = {
      createdAt: { $gte: start, $lte: end },
      orderStatus: { $ne: "Cancelado" },
      "orderItems.product": productObjId,
    };
    const allOrdersInRange = await Order.find(diagnosticMatch)
      .select("branch createdAt orderItems")
      .limit(20)
      .lean<any>();
    if (allOrdersInRange.length > 0) {
      const uniqueBranches = [...new Set(allOrdersInRange.map((o: any) => o.branch))];
    } else {
      
      // Check if product even has ANY orders (ignore date)
      const anyOrders = await Order.findOne({
        "orderItems.product": productObjId,
      })
        .select("branch createdAt")
        .lean<any>();
    }

    // Get all orders with store filter
    const orders = await Order.find(aggMatch)
      .select(
        "orderId createdAt orderStatus orderItems totalAmount branch payMethod",
      )
      .sort({ createdAt: -1 });

    // Filter orderItems to only include this product
    const ordersWithProduct = orders.map((order: any) => {
      const orderObj = order.toObject();
      orderObj.orderItems = orderObj.orderItems.filter(
        (item: any) => item.product?.toString() === productId,
      );
      return orderObj;
    });

    // Aggregate product-level data
    const [salesData] = await Order.aggregate([
      { $match: aggMatch },
      { $unwind: "$orderItems" },
      {
        $match: { "orderItems.product": productObjId },
      },
      {
        $group: {
          _id: "$orderItems.product",
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
          avgQuantityPerOrder: { $avg: "$orderItems.quantity" },
        },
      },
      {
        $addFields: {
          totalCost: {
            $multiply: [
              { $ifNull: [product.cost || 0, 0] },
              "$totalUnits",
            ],
          },
        },
      },
      {
        $addFields: {
          profit: {
            $subtract: [
              "$totalRevenue",
              "$totalCost",
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
                          "$totalCost",
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
    ]);

    // Daily trend data
    const dailyTrend = await Order.aggregate([
      { $match: aggMatch },
      { $unwind: "$orderItems" },
      {
        $match: { "orderItems.product": productObjId },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          units: { $sum: "$orderItems.quantity" },
          revenue: {
            $sum: {
              $multiply: ["$orderItems.price", "$orderItems.quantity"],
            },
          },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    return NextResponse.json(
      {
        product: {
          _id: product._id,
          name: product.title,
          sku: product.sku,
          asin: product.ASIN,
          cost: product.cost || 0,
          category: product.category,
          brand: product.brand,
          mainCategory: product.mainCategory,
          subCategory: product.subCategory,
          image: product.image,
          description: product.description,
        },
        sales: salesData || {
          totalUnits: 0,
          totalRevenue: 0,
          totalCost: 0,
          profit: 0,
          profitMargin: 0,
          avgPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          totalOrders: 0,
          avgQuantityPerOrder: 0,
        },
        orders: ordersWithProduct,
        dailyTrend,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Error in product detail report:", error);
    return NextResponse.json(
      { error: "Error generating product report" },
      { status: 500 },
    );
  }
}
