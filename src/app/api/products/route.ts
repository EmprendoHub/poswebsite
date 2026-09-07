export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";
import StoreInventory from "@/backend/models/StoreInventory";
import APIFilters from "@/lib/APIFilters";
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
    const resPerPage = Number(request.nextUrl.searchParams.get("limit")) || 15;
    const page = Number(request.nextUrl.searchParams.get("page")) || 1;
    const storeId = request.nextUrl.searchParams.get("storeId");
    const sortBy = request.nextUrl.searchParams.get("sortBy");
    const sortDir =
      request.nextUrl.searchParams.get("sortDir") === "desc" ? -1 : 1;

    // Build search filter - only search by title and ASIN
    let searchFilter: any = { "availability.online": true };
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

    // Apply pagination
    const skip = (page - 1) * resPerPage;
    let query = Product.find(searchFilter);

    // Apply sorting if sortBy is specified
    if (sortBy) {
      if (sortBy === "title") {
        query = query.sort({ title: sortDir });
      } else if (sortBy === "category") {
        query = query.sort({ category: sortDir });
      } else if (sortBy === "gender") {
        query = query.sort({ gender: sortDir });
      } else if (sortBy === "brand") {
        query = query.sort({ brand: sortDir });
      } else if (sortBy === "price") {
        query = query.sort({ "variations.0.price": sortDir });
      } else if (sortBy === "mainCategory") {
        query = query.sort({ mainCategory: sortDir });
      } else if (sortBy === "subCategory") {
        query = query.sort({ subCategory: sortDir });
      } else if (sortBy === "attributes") {
        query = query.sort({ attributes: sortDir });
      } else if (sortBy === "stock") {
        // For stock sorting, we'll handle it after fetching
        query = query.sort({ createdAt: -1 });
      } else {
        query = query.sort({ createdAt: -1 });
      }
    } else {
      query = query.sort({ createdAt: -1 });
    }

    // Get total count of filtered products (before pagination)
    const filteredProductsCount = await Product.countDocuments(searchFilter);

    // Apply pagination
    const productsData = await query.skip(skip).limit(resPerPage).exec();

    // If storeId provided, check StoreInventory for each variation
    if (storeId) {
      const productsWithStoreStock = await Promise.all(
        productsData.map(async (product: any) => {
          const productObj = product.toObject();

          // Get inventory for all variations from this store
          const inventoryRecords = await StoreInventory.find({
            store: storeId,
            product: product._id,
          });

          // Create a map of variationId -> quantity
          const inventoryMap = new Map(
            inventoryRecords.map((inv: any) => [inv.variationId, inv.quantity]),
          );

          // Update each variation's stock from StoreInventory
          productObj.variations = productObj.variations.map(
            (variation: any) => ({
              ...variation,
              storeStock: inventoryMap.get(variation._id.toString()) || 0,
            }),
          );

          return productObj;
        }),
      );

      // Filter products that have at least one variation with stock in this store
      const productsWithStock = productsWithStoreStock.filter((p: any) =>
        p.variations?.some((v: any) => v.storeStock > 0),
      );

      return NextResponse.json(
        {
          products: {
            products: productsWithStock,
          },
          productsCount,
          filteredProductsCount: productsWithStock.length,
          allCategories,
          allBrands,
        },
        { status: 200 },
      );
    }

    // Fetch storeInventory data for all products
    const productIds = productsData.map((p: any) => p._id);

    // Get detailed inventory records for all products
    const detailedInventory = await StoreInventory.find({
      product: { $in: productIds },
    }).populate("store", "name");

    // Group inventory by product ID
    const inventoryByProduct: { [productId: string]: any[] } = {};
    for (const inv of detailedInventory) {
      const pid = inv.product.toString();
      if (!inventoryByProduct[pid]) {
        inventoryByProduct[pid] = [];
      }
      inventoryByProduct[pid].push(inv);
    }

    // Attach storeInventory to each product
    let productsWithInventory = productsData.map((product: any) => {
      const productObj =
        typeof product.toObject === "function"
          ? product.toObject()
          : { ...product };
      const pid = product._id?.toString();
      productObj.storeInventory = inventoryByProduct[pid] || [];
      return productObj;
    });

    // Sort by stock if requested
    if (sortBy === "stock") {
      productsWithInventory.sort((a: any, b: any) => {
        const stockA = (a.storeInventory || []).reduce(
          (sum: number, inv: any) => sum + (inv.quantity || 0),
          0,
        );
        const stockB = (b.storeInventory || []).reduce(
          (sum: number, inv: any) => sum + (inv.quantity || 0),
          0,
        );
        return sortDir === 1 ? stockA - stockB : stockB - stockA;
      });
    }

    // Default behavior: filter products with stock
    const filteredProducts = productsWithInventory.filter((p: any) =>
      p.variations?.some((v: any) => v.stock > 0),
    );

    // For accurate total count, use the pre-calculated filteredProductsCount which is already correct
    // filteredProductsCount comes from line 73 and counts all products matching the search filter

    const products = {
      products: filteredProducts,
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
