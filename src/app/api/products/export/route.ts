export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";
import StoreInventory from "@/backend/models/StoreInventory";
import { getToken } from "next-auth/jwt";

/**
 * Export endpoint that fetches ALL products matching filters with inventory data
 * Includes bulk inventory fetching - no pagination, returns complete dataset
 */
export const GET = async (request: any) => {
  try {
    const token = await getToken({ req: request });

    if (!token) {
      return NextResponse.json(
        { error: "You are not authorized" },
        { status: 401 },
      );
    }

    await dbConnect();

    const keyword = request.nextUrl.searchParams.get("keyword");
    const sortBy = request.nextUrl.searchParams.get("sortBy");
    const sortDir = request.nextUrl.searchParams.get("sortDir") === "desc" ? -1 : 1;

    // Build search filter - match the frontend ListProducts filtering logic exactly
    let searchFilter: any = {};
    if (keyword) {
      // Escape special regex characters in the keyword
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Use word boundary regex to match whole words (like frontend does)
      const wordBoundaryRegex = `\\b${escapedKeyword}\\b`;
      
      // Search the same 5 fields as frontend: title, ASIN, category, brand, gender
      searchFilter.$or = [
        { title: { $regex: wordBoundaryRegex, $options: "i" } },
        { ASIN: { $regex: wordBoundaryRegex, $options: "i" } },
        { category: { $regex: wordBoundaryRegex, $options: "i" } },
        { brand: { $regex: wordBoundaryRegex, $options: "i" } },
        { gender: { $regex: wordBoundaryRegex, $options: "i" } },
      ];
    }

    // Get total counts
    const productsCount = await Product.countDocuments();
    const filteredProductsCount = await Product.countDocuments(searchFilter);

    // Build sort object
    let sortObj: any = { createdAt: -1 }; // Default sort
    if (sortBy && sortBy !== "stock") {
      // Skip stock here - it will be sorted after inventory is fetched
      if (sortBy === "title") {
        sortObj = { title: sortDir };
      } else if (sortBy === "category") {
        sortObj = { category: sortDir };
      } else if (sortBy === "gender") {
        sortObj = { gender: sortDir };
      } else if (sortBy === "brand") {
        sortObj = { brand: sortDir };
      } else if (sortBy === "price") {
        sortObj = { "variations.0.price": sortDir };
      } else if (sortBy === "mainCategory") {
        sortObj = { mainCategory: sortDir };
      } else if (sortBy === "subCategory") {
        sortObj = { subCategory: sortDir };
      } else if (sortBy === "attributes") {
        sortObj = { attributes: sortDir };
      }
    }

    // Fetch ALL products matching filter (no limit)
    const products = await Product.find(searchFilter)
      .sort(sortObj)
      .exec();

    // Bulk fetch all inventory data for these products in ONE query
    const productIds = products.map((p: any) => p._id);
    const allInventory = await StoreInventory.find({ product: { $in: productIds } })
      .populate("store", "name")
      .exec();

    // Map inventory by product ID for easy lookup
    const inventoryByProduct: { [key: string]: any[] } = {};
    allInventory.forEach((inv: any) => {
      const productId = inv.product.toString();
      if (!inventoryByProduct[productId]) {
        inventoryByProduct[productId] = [];
      }
      inventoryByProduct[productId].push(inv);
    });

    // Attach inventory to each product
    const productsWithInventory = products.map((p: any) => ({
      ...p.toObject(),
      storeInventory: inventoryByProduct[p._id.toString()] || [],
    }));

    // Handle stock sorting if requested (must be done after inventory is attached)
    if (sortBy === "stock") {
      productsWithInventory.sort((a: any, b: any) => {
        const stockA = (a.storeInventory || []).reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0);
        const stockB = (b.storeInventory || []).reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0);
        return sortDir === 1 ? stockA - stockB : stockB - stockA;
      });
    }

    const allCategories = await Product.distinct("category");
    const allBrands = await Product.distinct("brand");

    return NextResponse.json({
      products: { products: productsWithInventory },
      productsCount,
      filteredProductsCount,
      allCategories,
      allBrands,
    });
  } catch (error) {
    console.error("Export API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};
