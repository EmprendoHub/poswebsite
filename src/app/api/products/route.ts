import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";
import APIFilters from "@/lib/APIFilters";

export const GET = async (request: any, res: any) => {
  const token = await request.headers.get("cookie");
  if (!token) {
    // Not Signed in
    const notAuthorized = "You are not authorized no no no";
    return new Response(JSON.stringify(notAuthorized), {
      status: 400,
    });
  }

  try {
    await dbConnect();
    let productQuery;
    productQuery = Product.find({ "availability.online": true });

    const resPerPage = Number(request.headers.get("perpage")) || 15;
    // Extract page and per_page from request URL
    const page = Number(request.nextUrl.searchParams.get("page")) || 1;
    productQuery = productQuery.sort({ createdAt: -1 });
    // total number of documents in database
    const productsCount = await Product.countDocuments();
    // Extract all possible categories
    const allCategories = await Product.distinct("category");
    // Extract all possible categories
    const allBrands = await Product.distinct("brand");
    // Apply search Filters
    const apiProductFilters: any = new APIFilters(
      productQuery,
      request.nextUrl.searchParams
    )
      .searchAllFields()
      .filter();

    let productsData = await apiProductFilters.query;

    const filteredProductsCount = productsData.length;

    apiProductFilters.pagination(resPerPage, page);
    productsData = await apiProductFilters.query.clone();

    const sortedProducts = productsData
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

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
    return new Response(JSON.stringify(dataPacket), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Products loading errors",
      },
      { status: 500 }
    );
  }
};
