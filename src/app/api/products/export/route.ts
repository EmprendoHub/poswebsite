export const dynamic = "force-dynamic";
import mongoose from "mongoose";
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

    // Get URL parameters
    const keyword = request.nextUrl.searchParams.get("keyword");
    const sortsParam = request.nextUrl.searchParams.get("sorts"); // New format: "brand:asc,price:desc"
    const sortBy = request.nextUrl.searchParams.get("sortBy"); // Old format (for backward compatibility)
    const sortDir = request.nextUrl.searchParams.get("sortDir") === "desc" ? -1 : 1;
    
    // Get filter parameters
    const filterTitle = request.nextUrl.searchParams.get("filterTitle");
    const filterMainCategoriesStr = request.nextUrl.searchParams.get("filterMainCategories");
    const filterSubCategoriesStr = request.nextUrl.searchParams.get("filterSubCategories");
    const filterAttributesStr = request.nextUrl.searchParams.get("filterAttributes");
    const filterBrandsStr = request.nextUrl.searchParams.get("filterBrands");
    const filterPriceMin = request.nextUrl.searchParams.get("filterPriceMin");
    const filterPriceMax = request.nextUrl.searchParams.get("filterPriceMax");
    const filterStockMin = request.nextUrl.searchParams.get("filterStockMin");
    const filterStockMax = request.nextUrl.searchParams.get("filterStockMax");
    const filterSucursalesStr = request.nextUrl.searchParams.get("filterSucursales");

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

    // Add custom filter criteria
    if (filterTitle) {
      searchFilter.title = { $regex: filterTitle, $options: "i" };
    }
    if (filterMainCategoriesStr) {
      const mainCats = filterMainCategoriesStr.split(",").map((id: string) => id.trim());
      searchFilter.mainCategory = { $in: mainCats };
    }
    if (filterSubCategoriesStr) {
      const subCats = filterSubCategoriesStr.split(",").map((id: string) => id.trim());
      searchFilter.subCategory = { $in: subCats };
    }
    if (filterAttributesStr) {
      const attrs = filterAttributesStr.split(",").map((id: string) => id.trim());
      searchFilter.attributes = { $in: attrs };
    }
    if (filterBrandsStr) {
      const brands = filterBrandsStr.split(",").map((b: string) => b.trim());
      searchFilter.brand = { $in: brands };
    }

    // Get total counts
    const productsCount = await Product.countDocuments();
    const filteredProductsCount = await Product.countDocuments(searchFilter);

    // Build sort object - handle both new and old format
    let sortObj: any = { createdAt: -1 }; // Default sort
    
    // Parse new format: "brand:asc,price:desc"
    if (sortsParam) {
      try {
        const newSortObj: any = {};
        const sortPairs = sortsParam.split(",");
        for (const pair of sortPairs) {
          const [key, dir] = pair.split(":");
          if (key) {
            const direction = dir === "desc" ? -1 : 1;
            if (key === "title") {
              newSortObj.title = direction;
            } else if (key === "category") {
              newSortObj.category = direction;
            } else if (key === "gender") {
              newSortObj.gender = direction;
            } else if (key === "brand") {
              newSortObj.brand = direction;
            } else if (key === "price") {
              newSortObj["variations.0.price"] = direction;
            } else if (key === "mainCategory") {
              newSortObj.mainCategory = direction;
            } else if (key === "subCategory") {
              newSortObj.subCategory = direction;
            } else if (key === "attributes") {
              newSortObj.attributes = direction;
            }
          }
        }
        if (Object.keys(newSortObj).length > 0) {
          sortObj = newSortObj;
        }
      } catch (e) {
        console.warn("Failed to parse sorts parameter:", sortsParam);
      }
    } else if (sortBy && sortBy !== "stock") {
      // Fallback to old format for backward compatibility
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
    const inventoryQuery: any = { product: { $in: productIds } };
    if (filterSucursalesStr) {
      const filterSucursales = filterSucursalesStr
        .split(",")
        .map((id: string) => new mongoose.Types.ObjectId(id.trim()));
      inventoryQuery.store = { $in: filterSucursales };
    }
    const allInventory = await StoreInventory.find(inventoryQuery)
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

    // Apply price and stock range filters (client-side after inventory is attached)
    let filteredProducts = productsWithInventory.filter((product: any) => {
      // Price filter
      if (filterPriceMin || filterPriceMax) {
        const variations = Array.isArray(product.variations) ? product.variations : [];
        const price = variations.length > 0 ? variations[0]?.price : 0;
        const min = filterPriceMin ? parseFloat(filterPriceMin) : 0;
        const max = filterPriceMax ? parseFloat(filterPriceMax) : Infinity;
        if (price < min || price > max) return false;
      }
      
      // Stock filter
      if (filterStockMin || filterStockMax) {
        const totalStock = (product.storeInventory || []).reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0);
        const min = filterStockMin ? parseInt(filterStockMin) : 0;
        const max = filterStockMax ? parseInt(filterStockMax) : Infinity;
        if (totalStock < min || totalStock > max) return false;
      }

      // Sucursal filter - only keep products that have inventory in selected stores
      if (filterSucursalesStr) {
        const totalStock = (product.storeInventory || []).reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0);
        if (totalStock === 0) return false;
      }
      
      return true;
    });

    // Handle multi-sort for new format (needs to be done after inventory is attached)
    if (sortsParam && sortsParam.includes("stock")) {
      // If stock is one of the sort criteria, we need to do client-side sort
      const sortCriteria = sortsParam.split(",").map((pair: string) => {
        const [key, dir] = pair.split(":");
        return { key, dir: dir === "desc" ? -1 : 1 };
      });

      filteredProducts.sort((a: any, b: any) => {
        for (const criterion of sortCriteria) {
          let aVal: any, bVal: any;

          if (criterion.key === "stock") {
            aVal = (a.storeInventory || []).reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0);
            bVal = (b.storeInventory || []).reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0);
          } else if (criterion.key === "price") {
            const aVariations = Array.isArray(a.variations) ? a.variations : [];
            const bVariations = Array.isArray(b.variations) ? b.variations : [];
            aVal = aVariations.length > 0 ? aVariations[0]?.price : 0;
            bVal = bVariations.length > 0 ? bVariations[0]?.price : 0;
          } else {
            aVal = a[criterion.key];
            bVal = b[criterion.key];
          }

          if (aVal < bVal) return criterion.dir === 1 ? -1 : 1;
          if (aVal > bVal) return criterion.dir === 1 ? 1 : -1;
        }
        return 0;
      });
    } else if (sortBy === "stock") {
      // Backward compatibility: old format stock sort
      filteredProducts.sort((a: any, b: any) => {
        const stockA = (a.storeInventory || []).reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0);
        const stockB = (b.storeInventory || []).reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0);
        return sortDir === 1 ? stockA - stockB : stockB - stockA;
      });
    }

    const allCategories = await Product.distinct("category");
    const allBrands = await Product.distinct("brand");

    return NextResponse.json({
      products: { products: filteredProducts },
      productsCount,
      filteredProductsCount: filteredProducts.length,
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
