import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";

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
        createdAt: 1,
        weight: 1,
        dimensions: 1,
        images: { $slice: 1 },
        variations: { $slice: 1 },
      },
    )
      .sort({ createdAt: -1 })
      .lean();

    const allCategories = Array.from(
      new Set((products as any[]).map((p) => p.category).filter(Boolean)),
    ).sort() as string[];

    const allBrands = Array.from(
      new Set((products as any[]).map((p) => p.brand).filter(Boolean)),
    ).sort() as string[];

    const allGenders = Array.from(
      new Set((products as any[]).map((p) => p.gender).filter(Boolean)),
    ).sort() as string[];

    const prices: number[] = (products as any[]).flatMap(
      (p) =>
        p.variations
          ?.map((v: any) => v.price)
          .filter((price: any) => price != null) || [],
    );
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 1000;

    return {
      products: JSON.parse(JSON.stringify(products)),
      allCategories,
      allBrands,
      allGenders,
      priceRange: { min: minPrice, max: maxPrice },
    };
  },
  ["tienda-store-data"],
  { revalidate: 300 }, // 5 minutes
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
