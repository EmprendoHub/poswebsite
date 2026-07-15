export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";
import StoreInventory from "@/backend/models/StoreInventory";
import { getToken } from "next-auth/jwt";

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
    const storeId = request.nextUrl.searchParams.get("storeId");
    const resPerPage = Number(request.nextUrl.searchParams.get("limit")) || 15;
    const page = Number(request.nextUrl.searchParams.get("page")) || 1;

    // Build search filter - only search by title and ASIN
    let searchFilter: any = {};
    if (keyword) {
      searchFilter.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { ASIN: { $regex: keyword, $options: "i" } },
      ];
    }

    let productQuery = Product.find(searchFilter).sort({ createdAt: -1 });

    const productsCount = await Product.countDocuments();
    const allCategories = await Product.distinct("category");
    const allBrands = await Product.distinct("brand");

    // Get filtered count
    let productsData = await productQuery.clone().exec();
    const filteredProductsCount = productsData.length;
    // Apply pagination
    const skip = (page - 1) * resPerPage;
    productsData = await Product.find(searchFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(resPerPage)
      .exec();

    // Filter availability from StoreInventory (not Product.stock)
    const productIds = productsData.map((p: any) => p._id);
    const inventoryMatch: Record<string, any> = {
      product: { $in: productIds },
      quantity: { $gt: 0 },
    };

    if (storeId) {
      inventoryMatch.store = storeId;
    }

    const inventoryRows = await StoreInventory.aggregate([
      { $match: inventoryMatch },
      {
        $group: {
          _id: "$product",
          totalQuantity: { $sum: "$quantity" },
        },
      },
    ]);

    const inventoryMap = new Map(
      inventoryRows.map((row: any) => [row._id.toString(), row.totalQuantity]),
    );

    const productsWithInventory = new Set(
      inventoryRows
        .filter((row: any) => Number(row.totalQuantity || 0) > 0)
        .map((row: any) => row._id.toString()),
    );

    const sortedProducts = productsData
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .filter((p: any) => {
        // Include product if it has StoreInventory records OR if it has Product.stock
        const hasStoreInventory = productsWithInventory.has(p._id.toString());
        // const hasProductStock = Number(p.stock || 0) > 0;
        return hasStoreInventory;
      })
      .map((p: any) => ({
        ...p.toObject(),
        storeInventoryTotal: inventoryMap.get(p._id.toString()) || 0,
      }));

    const products = {
      products: sortedProducts,
    };

    const dataPacket = {
      products,
      productsCount,
      filteredProductsCount,
      allCategories,
      allBrands,
    };
    return NextResponse.json(dataPacket, { status: 200 });
  } catch (error) {
    console.error("Error loading products:", error);
    return NextResponse.json(
      {
        error: "Products loading errors",
      },
      { status: 500 },
    );
  }
};
