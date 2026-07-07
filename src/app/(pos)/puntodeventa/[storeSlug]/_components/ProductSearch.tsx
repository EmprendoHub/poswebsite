"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { MdSearch, MdClose, MdWifiOff } from "react-icons/md";
import Image from "next/image";
import { useDebounce } from "use-debounce";
import { posDB } from "@/lib/posDB";

interface SearchResult {
  _id: string;
  title: string;
  ASIN?: string;
  price: number;
  currentPrice?: number;
  images: { url: string }[];
  variations: {
    _id: string;
    title?: string;
    color?: string;
    size?: string;
    price: number;
    stock: number;
    image?: string;
  }[];
}

interface ProductSearchProps {
  storeId: string;
  onAddToCart: (item: CartItem) => void;
  isOnline?: boolean;
  pauseFocus?: boolean;
}

export interface CartItem {
  productId: string;
  variationId: string;
  title: string;
  variationLabel: string;
  price: number;
  quantity: number;
  image: string;
  stock: number;
}

export default function ProductSearch({
  storeId,
  onAddToCart,
  isOnline = true,
  pauseFocus = false,
}: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount so barcode/QR scanner input goes here immediately
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Online search (API) ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOnline) return; // handled by offline effect below
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    fetch(
      `/api/pos/search?q=${encodeURIComponent(debouncedQuery)}&limit=8&storeId=${storeId}`,
    )
      .then((r) => r.json())
      .then((data) => {
        setResults(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [debouncedQuery, storeId, isOnline]);

  // ── Offline search (IndexedDB) ─────────────────────────────────────────
  useEffect(() => {
    if (isOnline) return;
    if (!debouncedQuery.trim() || !storeId) {
      setResults([]);
      return;
    }
    setLoading(true);
    const term = debouncedQuery.toLowerCase();
    posDB.products
      .where("storeId")
      .equals(storeId)
      .filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.asin?.toLowerCase().includes(term) ||
          p.variations.some(
            (v) =>
              v.title?.toLowerCase().includes(term) ||
              v.color?.toLowerCase().includes(term) ||
              v.size?.toLowerCase().includes(term),
          ),
      )
      .limit(8)
      .toArray()
      .then((cached) => {
        setResults(
          cached.map((p) => ({
            _id: p.id,
            title: p.title,
            price: p.variations[0]?.price ?? 0,
            currentPrice: p.currentPrice ?? p.variations[0]?.price ?? 0,
            images: p.images,
            variations: p.variations,
          })),
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [debouncedQuery, storeId, isOnline]);

  // ── Auto-add on exact ASIN match ──────────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery.trim() || results.length === 0) return;
    const term = debouncedQuery.trim().toUpperCase();
    const exact = results.find((p) => p.ASIN?.toUpperCase() === term);
    if (exact?.variations?.[0]) {
      handleAdd(exact, exact.variations[0]);
    }
  }, [results]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (
    product: SearchResult,
    variation: SearchResult["variations"][0],
  ) => {
    if (variation.stock <= 0) return; // never add out-of-stock

    // Use product.currentPrice if available (freshly fetched from search),
    // otherwise fall back to variation price
    const price = product.currentPrice ?? variation.price;

    const label = [variation.color, variation.size, variation.title]
      .filter(Boolean)
      .join(" / ");
    onAddToCart({
      productId: product._id,
      variationId: variation._id,
      title: product.title,
      variationLabel: label || "Default",
      price,
      quantity: 1,
      image: variation.image ?? product.images?.[0]?.url ?? "",
      stock: variation.stock,
    });
    setQuery("");
    setResults([]);
    // Return focus to input so the scanner can immediately scan the next item
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 rounded-lg px-3 py-2.5 ${
          isOnline
            ? "bg-muted"
            : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700"
        }`}
      >
        {isOnline ? (
          <MdSearch size={20} className="text-muted-foreground flex-shrink-0" />
        ) : (
          <MdWifiOff size={20} className="text-yellow-500 flex-shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            isOnline
              ? "Buscar por nombre, ID, marca o categoría..."
              : "Modo sin conexión — buscando en caché local..."
          }
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-300"
          // Recapture focus if user clicks away (keeps scanner working)
          onBlur={() => {
            if (!pauseFocus) setTimeout(() => inputRef.current?.focus(), 150);
          }}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
          >
            <MdClose
              size={18}
              className="text-muted-foreground hover:text-foreground"
            />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {(loading || results.length > 0) && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-muted rounded-xl shadow-xl max-h-[420px] overflow-y-auto">
          {loading && (
            <p className="text-xs text-muted-foreground p-4 animate-pulse">
              Buscando...
            </p>
          )}
          {results.map((product) => (
            <div
              key={product._id}
              className="border-b border-muted last:border-0"
            >
              {/* Product header row */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 pointer-events-none">
                {product.images?.[0]?.url && (
                  <Image
                    src={product.images[0].url}
                    alt={product.title}
                    width={32}
                    height={32}
                    className="rounded object-cover w-8 h-8 flex-shrink-0"
                  />
                )}
                <p className="text-sm font-semibold truncate flex-1">
                  {product.title}
                </p>
              </div>
              {/* One row per in-stock variation */}
              {product.variations.map((v) => {
                const label =
                  [v.color, v.size, v.title].filter(Boolean).join(" / ") ||
                  "Default";
                return (
                  <button
                    key={v._id}
                    onClick={() => handleAdd(product, v)}
                    className="w-full flex items-center gap-3 pl-8 pr-4 py-2 hover:bg-muted transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {v.stock} disponible{v.stock !== 1 ? "s" : ""} en
                        sucursal
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary flex-shrink-0">
                      ${(product.currentPrice ?? v.price)?.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
