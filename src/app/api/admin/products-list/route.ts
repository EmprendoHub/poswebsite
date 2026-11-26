export const dynamic = "force-dynamic";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Product from "@/backend/models/Product";
import StoreInventory from "@/backend/models/StoreInventory";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { APIFilters } from "@/lib/APIFilters";

const ALLOWED_ROLES = [
  "manager",
  "sucursal",
  "instagram",
  "admin",
  "super_admin",
  "director",
];

/**
 * GET /api/admin/products-list
 * Returns products with inventory data - replaces getAllProduct Server Action
 * Always fresh, no caching
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
    const searchParams = url.searchParams;

    // Build product query
    let productQuery: any;
    if (["manager", "sucursal", "instagram"].includes(role)) {
      productQuery = Product.find();
    } else {
      productQuery = Product.find({ published: true });
    }

    const resPerPage = Number(searchParams.get("perpage")) || 20;
    const page = Number(searchParams.get("page")) || 1;
    const sortsParam = searchParams.get("sorts");

    // Parse sorts
    const sorts: Array<{ key: string; dir: 1 | -1 }> = [];
    if (sortsParam) {
      try {
        const sortPairs = sortsParam.split(",");
        for (const pair of sortPairs) {
          const [key, dir] = pair.split(":");
          if (key) {
            const direction = dir === "desc" ? -1 : 1;
            sorts.push({ key, dir: direction });
          }
        }
      } catch (e) {
        console.warn("Failed to parse sorts:", sortsParam);
      }
    }

    // Apply sorting
    if (sorts.length > 0) {
      const sortObj: any = {};
      for (const sort of sorts) {
        if (
          [
            "title",
            "category",
            "gender",
            "brand",
            "mainCategory",
            "subCategory",
            "attributes",
          ].includes(sort.key)
        ) {
          if (sort.key === "price") {
            sortObj["variations.0.price"] = sort.dir;
          } else {
            sortObj[sort.key] = sort.dir;
          }
        }
      }
      if (Object.keys(sortObj).length > 0) {
        productQuery = productQuery.sort(sortObj);
      } else {
        productQuery = productQuery.sort({ createdAt: -1 });
      }
    } else {
      productQuery = productQuery.sort({ createdAt: -1 });
    }

    const productsCount = await Product.countDocuments();

    // Apply filters using APIFilters
    const apiProductFilters = new APIFilters(productQuery, searchParams)
      .searchAllFields()
      .filter();

    let productsData = await apiProductFilters.query.exec();
    let filteredProductsCount = productsData.length;

    // Get stock data for all products
    if (productsData.length > 0) {
      const productIds = productsData.map((p: any) => p._id);

      // Get stock totals
      const stockTotals = await StoreInventory.aggregate([
        { $match: { product: { $in: productIds } } },
        { $group: { _id: "$product", total: { $sum: "$quantity" } } },
      ]);
      const stockMap = new Map<string, number>(
        stockTotals.map((r: any) => [r._id.toString(), r.total]),
      );

      // Get detailed inventory by store
      const detailedInventory = await StoreInventory.find({
        product: { $in: productIds },
      }).populate("store", "name");

      const inventoryByProduct: { [productId: string]: any[] } = {};
      for (const inv of detailedInventory) {
        const pid = inv.product.toString();
        if (!inventoryByProduct[pid]) {
          inventoryByProduct[pid] = [];
        }
        inventoryByProduct[pid].push(inv);
      }

      // Apply pagination
      const startIndex = (page - 1) * resPerPage;
      const paginatedProducts = productsData.slice(
        startIndex,
        startIndex + resPerPage,
      );

      // Map stock data to products
      productsData = paginatedProducts.map((p: any) => {
        const pid = p._id?.toString();
        const obj = typeof p.toObject === "function" ? p.toObject() : { ...p };
        obj.stock = pid && stockMap.has(pid) ? stockMap.get(pid) : 0;
        obj.storeInventory = inventoryByProduct[pid] || [];
        return obj;
      });
    }

    return NextResponse.json({
      products: productsData,
      productsCount,
      filteredProductsCount,
    });
  } catch (error: any) {
    console.error("[GET /api/admin/products-list] Error:", error);
    return NextResponse.json(
      { error: error.message || "Error fetching products" },
      { status: 500 },
    );
  }
}
