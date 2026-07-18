import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";
import StoreInventory from "@/backend/models/StoreInventory";

import ListProducts from "./_components/ListProducts";

export const metadata = {
  title: "Tienda - SuperCollectibles",
  description: "Explora nuestra colección de cartas coleccionables",
};

// Cache the heavy DB query for 5 minutes — prevents hitting MongoDB on every page load
const getStoreData = unstable_cache(
  async () => {
    await dbConnect();

    // $slice: 1 on images and variations reduces data transfer significantly
    // (product cards only show the first image and first variation)
    const products = await Product.find(
      { "availability.online": true },
      {
        _id: 1,
        title: 1,
        slug: 1,
        price: 1,
        category: 1,
        brand: 1,
        gender: 1,
        ASIN: 1,
        createdAt: 1,
        weight: 1,
        dimensions: 1,
        images: { $slice: 1 },
        variations: { $slice: 1 },
        discountPercentage: 1,
      },
    )
      .sort({ createdAt: -1 })
      .lean();

    // Filter products to only show those with stock in at least one store
    const productIds = products.map((p) => p._id);
    const productsWithStock = await StoreInventory.find(
      {
        product: { $in: productIds },
        quantity: { $gt: 0 }, // Only entries with stock > 0
      },
      { product: 1 },
    ).distinct("product");

    // Convert ObjectIds to strings for comparison
    const productsWithStockSet = new Set(
      productsWithStock.map((id) => id.toString()),
    );

    // Filter out products with no stock in any store
    const filteredProducts = products.filter((p: any) =>
      productsWithStockSet.has(p._id.toString()),
    );

    const rawProducts = filteredProducts as any[];

    // Online customers pay 10% more than the base (POS) price
    const ONLINE_MARKUP = 1.1;
    const markedUpProducts = rawProducts.map((p) => ({
      ...p,
      price: p.price
        ? Math.round(p.price * ONLINE_MARKUP * 100) / 100
        : p.price,
      variations:
        p.variations?.map((v: any) => ({
          ...v,
          price: v.price
            ? Math.round(v.price * ONLINE_MARKUP * 100) / 100
            : v.price,
        })) ?? [],
    }));

    const allCategories = Array.from(
      new Set(markedUpProducts.map((p) => p.category).filter(Boolean)),
    ).sort() as string[];

    const allBrands = Array.from(
      new Set(markedUpProducts.map((p) => p.brand).filter(Boolean)),
    ).sort() as string[];

    const allGenders = Array.from(
      new Set(markedUpProducts.map((p) => p.gender).filter(Boolean)),
    ).sort() as string[];

    const prices: number[] = markedUpProducts.flatMap(
      (p) =>
        p.variations
          ?.map((v: any) => v.price)
          .filter((price: any) => price != null) || [],
    );
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 1000;

    return {
      products: JSON.parse(JSON.stringify(markedUpProducts)),
      allCategories,
      allBrands,
      allGenders,
      priceRange: { min: minPrice, max: maxPrice },
    };
  },
  ["tienda-store-data"],
  { revalidate: 300, tags: ["tienda-products"] }, // 5 minutes
);

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
    search?: string;
    category?: string;
    brand?: string;
    gender?: string;
    minPrice?: string;
    maxPrice?: string;
  };
}) {
  const { products, allCategories, allBrands, allGenders, priceRange } =
    await getStoreData();

  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={<div>Cargando productos...</div>}>
        <ListProducts
          products={products}
          allCategories={allCategories}
          allBrands={allBrands}
          allGenders={allGenders}
          priceRange={priceRange}
          searchParams={searchParams}
          filteredProductsCount={products.length}
        />
      </Suspense>
    </main>
  );
}
