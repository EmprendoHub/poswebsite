import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";
import ProductDetail from "@/backend/models/ProductDetail";

/**
 * This endpoint populates the ProductDetail collection from existing Product field values
 * Usage: POST /api/product-details/populate
 * After running, this can be deleted as it's only needed once
 */
export async function POST(request: Request) {
  try {
    await dbConnect();

    // Get all products
    const products = await Product.find({}).lean();

    if (!products.length) {
      return NextResponse.json(
        { message: "No products found", created: 0 },
        { status: 200 },
      );
    }

    // Collect unique values from products
    const genderSet = new Set<string>();
    const brandSet = new Set<string>();
    const categorySet = new Set<string>();

    products.forEach((product: any) => {
      if (product.gender) {
        // Normalize to title case
        const normalized = String(product.gender)
          .split(" ")
          .map(
            (word: string) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");
        genderSet.add(normalized);
      }
      if (product.brand) {
        const normalized = String(product.brand)
          .split(" ")
          .map(
            (word: string) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");
        brandSet.add(normalized);
      }
      if (product.category) {
        const normalized = String(product.category)
          .split(" ")
          .map(
            (word: string) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");
        categorySet.add(normalized);
      }
    });

    // Create ProductDetail entries
    const detailsToCreate: any[] = [];

    genderSet.forEach((title) => {
      detailsToCreate.push({
        catType: "gender",
        catTitle: title,
      });
    });

    brandSet.forEach((title) => {
      detailsToCreate.push({
        catType: "brand",
        catTitle: title,
      });
    });

    categorySet.forEach((title) => {
      detailsToCreate.push({
        catType: "category",
        catTitle: title,
      });
    });

    // Insert with ignoring duplicates
    if (detailsToCreate.length > 0) {
      try {
        await ProductDetail.insertMany(detailsToCreate, { ordered: false });
      } catch (error: any) {
        // Ignore duplicate key errors (E11000)
        if (error.code !== 11000) {
          throw error;
        }
      }
    }

    return NextResponse.json(
      {
        message: "Product details populated successfully",
        created: detailsToCreate.length,
        details: {
          genders: Array.from(genderSet),
          brands: Array.from(brandSet),
          categories: Array.from(categorySet),
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error populating product details:", error);
    return NextResponse.json(
      { error: error.message || "Error populating product details" },
      { status: 500 },
    );
  }
}
