"use client";
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import ProductCard from "@/app/(home)/producto/_components/ProductCard";
import FilterMenuComponent from "./FilterMenuComponent";
import MobileFilterComponent from "./MobileFilterComponet";
import { Filter, X, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

interface Product {
  _id: string;
  title: string;
  slug: string;
  price: number;
  images: { url: string }[];
  category: string;
  brand: string;
  gender: string;
  variations: { price: number; stock: number }[];
}

const PRODUCTS_PER_PAGE = 20;

const ListProducts = ({
  products,
  allCategories,
  allBrands,
  allGenders,
  priceRange,
  searchParams,
  filteredProductsCount,
  per_page,
  start,
  end,
}: {
  products: Product[];
  allCategories: string[];
  allBrands: string[];
  allGenders: string[];
  priceRange: { min: number; max: number };
  searchParams: {
    search?: string;
    category?: string;
    brand?: string;
    gender?: string;
    minPrice?: string;
    maxPrice?: string;
  };
  filteredProductsCount: number;
  per_page?: any;
  start?: any;
  end?: any;
}) => {
  const { data: session }: any = useSession();
  const router = useRouter();
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);
  const [displayedProductsCount, setDisplayedProductsCount] =
    useState(PRODUCTS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(false);
  const observerTarget = useRef(null);

  useEffect(() => {
    if (session?.user?.role === "manager") {
      router.push("/admin");
    }
    // eslint-disable-next-line
  }, [session?.user?.role]);

  // Reset displayed products when filters change
  useEffect(() => {
    setDisplayedProductsCount(PRODUCTS_PER_PAGE);
  }, [searchParams]);

  // Filter products based on search params
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Search filter
    if (searchParams.search) {
      const searchTerm = searchParams.search.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.title.toLowerCase().includes(searchTerm) ||
          product.category.toLowerCase().includes(searchTerm) ||
          product.brand.toLowerCase().includes(searchTerm)
      );
    }

    // Category filter (single value now, not array)
    if (searchParams.category) {
      filtered = filtered.filter(
        (product) => product.category === searchParams.category
      );
    }

    // Brand filter (single value now, not array)
    if (searchParams.brand) {
      filtered = filtered.filter(
        (product) => product.brand === searchParams.brand
      );
    }

    // Gender filter (single value now, not array)
    if (searchParams.gender) {
      filtered = filtered.filter(
        (product) => product.gender === searchParams.gender
      );
    }

    // Price filter
    if (searchParams.minPrice || searchParams.maxPrice) {
      const minPrice = parseInt(searchParams.minPrice || "0");
      const maxPrice = parseInt(searchParams.maxPrice || "999999");

      filtered = filtered.filter((product) => {
        const productPrice = product.variations?.[0]?.price || product.price;
        return productPrice >= minPrice && productPrice <= maxPrice;
      });
    }

    return filtered;
  }, [products, searchParams]);

  // Get products to display (slice based on displayedProductsCount)
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, displayedProductsCount);
  }, [filteredProducts, displayedProductsCount]);

  // Load more products function
  const loadMoreProducts = useCallback(() => {
    if (displayedProductsCount >= filteredProducts.length || isLoading) {
      return;
    }

    setIsLoading(true);

    // Simulate loading delay for better UX
    setTimeout(() => {
      setDisplayedProductsCount((prev) =>
        Math.min(prev + PRODUCTS_PER_PAGE, filteredProducts.length)
      );
      setIsLoading(false);
    }, 500);
  }, [displayedProductsCount, filteredProducts.length, isLoading]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const target = observerTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isLoading &&
          displayedProductsCount < filteredProducts.length
        ) {
          loadMoreProducts();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px", // Load when element is 100px away from viewport
      }
    );

    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [
    loadMoreProducts,
    isLoading,
    displayedProductsCount,
    filteredProducts.length,
  ]);

  const hasMoreProducts = displayedProductsCount < filteredProducts.length;

  return (
    <section className="flex w-full flex-col justify-center items-center gap-8 maxsm:gap-4 maxmd:w-[95%]">
      {/* Header with Filter Toggle Buttons */}
      <div className="flex items-center justify-between my-6 px-6 w-full">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">
            Productos ({filteredProducts.length})
          </h1>
          {displayedProducts.length < filteredProducts.length && (
            <p className="text-sm text-gray-600">
              Mostrando {displayedProducts.length} de {filteredProducts.length}
            </p>
          )}
        </div>

        {/* Desktop Filter Toggle Button */}
        <button
          onClick={() => setIsDesktopFilterOpen(!isDesktopFilterOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Filter size={16} />
          Filtros
          {isDesktopFilterOpen ? (
            <ChevronUp size={16} />
          ) : (
            <ChevronDown size={16} />
          )}
        </button>
      </div>

      {/* Desktop Filters - Collapsible */}
      <AnimatePresence>
        {isDesktopFilterOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full overflow-hidden bg-card rounded-lg shadow-lg border "
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Filtros de Búsqueda</h2>
                <button
                  onClick={() => setIsDesktopFilterOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <FilterMenuComponent
                allBrands={allBrands}
                allCategories={allCategories}
                allGenders={allGenders}
                priceRange={priceRange}
                SetIsActive={setIsDesktopFilterOpen}
                isActive={isDesktopFilterOpen}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products Grid */}
      <div className="relative w-[95%] mx-auto">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center justify-center min-h-[200px]">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No se encontraron productos
              </h3>
              <p className="text-gray-500">
                Intenta ajustar los filtros de búsqueda
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-6 justify-center items-center w-full">
              {displayedProducts.map((product: any, index: number) => (
                <ProductCard
                  item={product}
                  key={`${product._id}-${index}`}
                  index={index}
                />
              ))}
            </div>

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="flex items-center gap-2 text-gray-600">
                  <Loader2 className="animate-spin" size={20} />
                  <span>Cargando más productos...</span>
                </div>
              </div>
            )}

            {/* Load more trigger (intersection observer target) */}
            {hasMoreProducts && !isLoading && (
              <div
                ref={observerTarget}
                className="flex justify-center items-center py-8"
              >
                <button
                  onClick={loadMoreProducts}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cargar más productos (
                  {filteredProducts.length - displayedProducts.length}{" "}
                  restantes)
                </button>
              </div>
            )}

            {/* End message */}
            {!hasMoreProducts &&
              displayedProducts.length > PRODUCTS_PER_PAGE && (
                <div className="flex justify-center items-center py-8">
                  <p className="text-gray-500">
                    ✅ Has visto todos los productos ({filteredProducts.length})
                  </p>
                </div>
              )}
          </>
        )}
      </div>
    </section>
  );
};

export default ListProducts;
