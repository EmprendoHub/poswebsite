"use client";
import React, { useState } from "react";
import Image from "next/image";
import { MdClose, MdRefresh, MdCheckCircle } from "react-icons/md";
import { toast } from "@/components/ui/use-toast";

interface EbayMatchResult {
  title: string;
  price: number;
  currency: string;
  matchPercentage: number;
  matchReasons: string[];
  itemWebUrl: string;
  imageUrl?: string;
}

interface PriceCheckResult {
  ebay?: {
    price: number;
    currency: string;
    listingCount: number;
    sourceUrl?: string;
  };
  ebayResults?: EbayMatchResult[];
  psa?: {
    gradeLabel: string;
    avgPrice: number;
    listingCount: number;
    sourceUrl?: string;
  };
  cardDetails?: {
    certNumber: string;
    cardName: string;
    gradeLabel: string;
    grade: number;
    setName: string;
    year: number;
    cardNumber: string;
    imageUrl?: string;
  };
  recommendedPrice?: number;
  source?: string;
  success: boolean;
  message: string;
}

interface PriceCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  productTitle: string;
  asin?: string;
  currentPrice: number;
  onPriceSelected: (price: number) => void;
  onCardDetailsUpdate?: (cardName: string) => void;
  brand?: string;
  grade?: number;
  productImage?: string;
}

export default function PriceCheckerModal({
  isOpen,
  onClose,
  productTitle,
  asin,
  currentPrice,
  onPriceSelected,
  onCardDetailsUpdate,
  brand,
  grade,
  productImage,
}: PriceCheckerModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PriceCheckResult | null>(null);
  const [selectedPreviewItem, setSelectedPreviewItem] =
    useState<EbayMatchResult | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{
    src: string;
    title: string;
  } | null>(null);

  // Construct full title with brand (certificator) and grade for better matching
  const constructedTitle = () => {
    let fullTitle = productTitle;
    if (brand) {
      fullTitle = `${fullTitle} ${brand}`;
    }
    if (grade) {
      fullTitle = `${fullTitle} ${grade}`;
    }
    return fullTitle;
  };

  // Helper function to find matching words/phrases and return highlighted JSX
  const highlightMatches = (text: string, matchText: string) => {
    if (!text || !matchText) return text;

    // Split both texts into words
    const textWords = text.toLowerCase().split(/\s+/);
    const matchWords = matchText.toLowerCase().split(/\s+/);

    // Find which words from text match any words in matchText
    const matchedIndices = new Set<number>();
    textWords.forEach((word, idx) => {
      if (
        matchWords.some(
          (mw) =>
            word.includes(mw.slice(0, 4)) || mw.includes(word.slice(0, 4)),
        )
      ) {
        matchedIndices.add(idx);
      }
    });

    // Reconstruct text with highlighting
    const parts = text.split(/(\s+)/);
    let wordIndex = 0;
    return parts.map((part, idx) => {
      if (part.trim() === "") {
        return part;
      }

      const isMatched = matchedIndices.has(wordIndex);
      wordIndex++;

      return (
        <span
          key={idx}
          className={
            isMatched
              ? "bg-yellow-300 dark:bg-yellow-600 font-semibold text-black dark:text-white px-1 rounded"
              : ""
          }
        >
          {part}
        </span>
      );
    });
  };

  const handleCheckPrices = async () => {
    if (!productTitle) {
      toast({
        title: "Error",
        description: "Por favor ingresa el nombre del producto",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/price-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: constructedTitle(),
          asin,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to check prices");
      }

      const data: PriceCheckResult = await response.json();
      setResult(data);
    } catch (error: any) {
      console.error("❌ Price check error:", error);
      toast({
        title: "Error",
        description: "No se pudieron verificar los precios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPrice = (price: number) => {
    onPriceSelected(price);
    toast({
      title: "Éxito",
      description: `Precio actualizado a $${price}`,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-muted sticky top-0 bg-background">
          <div>
            <h2 className="font-bold text-lg">Verificador de Precios</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {constructedTitle()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <MdClose size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {!result ? (
            <div className="text-center py-8 space-y-4">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                  Término de búsqueda:
                </p>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                  {constructedTitle()}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Buscaremos precios actuales en eBay y PSA
              </p>
              <button
                onClick={handleCheckPrices}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <MdRefresh
                  size={18}
                  className={loading ? "animate-spin" : ""}
                />
                {loading ? "Buscando..." : "Verificar Precios"}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Search Term Display */}
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                  Búsqueda realizada:
                </p>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                  {constructedTitle()}
                </p>
              </div>

              {/* Status */}
              <div
                className={
                  result.success
                    ? "p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900"
                    : "p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
                }
              >
                <p
                  className={
                    result.success
                      ? "text-sm font-semibold text-green-700 dark:text-green-400"
                      : "text-sm font-semibold text-red-700 dark:text-red-400"
                  }
                >
                  {result.message}
                </p>
              </div>

              {/* eBay Multiple Results */}
              {result.ebayResults && result.ebayResults.length > 0 && (
                <div className="border border-muted rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">
                      Resultados de eBay
                    </h3>
                    <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-1 rounded">
                      {result.ebayResults.length} coincidencias
                    </span>
                  </div>
                  <div className="space-y-3">
                    {result.ebayResults.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 border border-muted rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedPreviewItem(item)}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              {item.title.length > 80
                                ? item.title.substring(0, 80) + "..."
                                : item.title}
                            </p>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-bold text-foreground">
                                $
                                {item.price.toLocaleString("es-MX", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{" "}
                                MXN
                              </span>
                              <div className="flex items-center gap-1">
                                <div className="w-12 h-6 bg-muted rounded overflow-hidden">
                                  <div
                                    className="h-full bg-green-500 transition-all"
                                    style={{
                                      width: `${item.matchPercentage}%`,
                                    }}
                                  />
                                </div>
                                <span
                                  className={`text-xs font-semibold ${
                                    item.matchPercentage >= 80
                                      ? "text-green-600"
                                      : item.matchPercentage >= 60
                                        ? "text-yellow-600"
                                        : "text-orange-600"
                                  }`}
                                >
                                  {item.matchPercentage}%
                                </span>
                              </div>
                            </div>
                            {item.matchReasons.length > 0 && (
                              <div className="text-xs text-muted-foreground space-y-1">
                                {item.matchReasons.map((reason, ridx) => (
                                  <p
                                    key={ridx}
                                    className="flex items-center gap-1"
                                  >
                                    <span className="text-green-600">✓</span>
                                    {reason}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectPrice(item.price);
                              }}
                              className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1"
                            >
                              <MdCheckCircle size={14} />
                              Usar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPreviewItem(item);
                              }}
                              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-semibold transition-colors whitespace-nowrap"
                            >
                              Comparar
                            </button>
                          </div>
                        </div>
                        {item.itemWebUrl && (
                          <a
                            href={item.itemWebUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Ver en eBay →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* eBay Single Result (fallback) */}
              {result.ebay &&
                (!result.ebayResults || result.ebayResults.length === 0) && (
                  <div className="border border-muted rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-foreground">eBay</h3>
                      <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-1 rounded">
                        {result.ebay.listingCount} anuncios
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-sm text-muted-foreground">
                          Precio promedio:
                        </span>
                        <span className="text-2xl font-bold text-foreground">
                          $
                          {result.ebay.price.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          MXN
                        </span>
                      </div>
                      {result.ebay.sourceUrl && (
                        <a
                          href={result.ebay.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-block mt-2"
                        >
                          Ver en eBay →
                        </a>
                      )}
                      <button
                        onClick={() => handleSelectPrice(result.ebay!.price)}
                        className="w-full mt-3 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        Usar este precio
                      </button>
                    </div>
                  </div>
                )}

              {/* PSA Results or Rate Limit Info */}
              {result.psa ? (
                <div className="border border-muted rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">PSA</h3>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
                      {result.psa.gradeLabel}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-sm text-muted-foreground">
                        Precio promedio:
                      </span>
                      <span className="text-2xl font-bold text-foreground">
                        $
                        {result.psa.avgPrice.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        MXN
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Basado en {result.psa.listingCount} transacciones
                    </p>
                    {result.psa.sourceUrl && (
                      <a
                        href={result.psa.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-block mt-2"
                      >
                        Ver en PSA →
                      </a>
                    )}
                    <button
                      onClick={() => handleSelectPrice(result.psa!.avgPrice)}
                      className="w-full mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Usar este precio
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-amber-200 dark:border-amber-900 rounded-lg p-4 bg-amber-50 dark:bg-amber-950/20">
                  <p className="text-sm text-amber-800 dark:text-amber-400">
                    ℹ️ Los datos de PSA no están disponibles en este momento.
                    Por favor usa los datos de eBay.
                  </p>
                </div>
              )}

              {/* Card Details */}
              {result.cardDetails && (
                <div className="border border-purple-200 dark:border-purple-900 rounded-lg p-4 bg-purple-50 dark:bg-purple-950/20">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="text-lg">🎴</span>
                    Detalles de la Tarjeta
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Nombre de la Tarjeta
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {result.cardDetails.cardName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Número de Certificado
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {result.cardDetails.certNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Calificación
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {result.cardDetails.gradeLabel} (
                        {result.cardDetails.grade})
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Conjunto
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {result.cardDetails.setName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Año</p>
                      <p className="text-sm font-semibold text-foreground">
                        {result.cardDetails.year}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        # de Tarjeta
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {result.cardDetails.cardNumber}
                      </p>
                    </div>
                  </div>
                  {onCardDetailsUpdate && (
                    <button
                      onClick={() =>
                        onCardDetailsUpdate(result.cardDetails!.cardName)
                      }
                      className="w-full mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Actualizar Título del Producto
                    </button>
                  )}
                </div>
              )}

              {/* Image Comparison Preview */}
              {selectedPreviewItem && productImage && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                  <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-background border-b border-muted flex items-center justify-between p-4">
                      <div className="flex-1 pr-4">
                        <h3 className="font-semibold text-foreground text-sm mb-3">
                          Comparar Títulos
                        </h3>

                        {/* Product Title */}
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1 font-semibold">
                            Tu Producto:
                          </p>
                          <p className="text-sm text-foreground bg-blue-50 dark:bg-blue-950/30 p-2 rounded border border-blue-200 dark:border-blue-800">
                            {highlightMatches(
                              productTitle,
                              selectedPreviewItem.title,
                            )}
                          </p>
                        </div>

                        {/* eBay Title */}
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1 font-semibold flex items-center gap-2">
                            Listado eBay:
                            <span
                              className={`text-xs px-2 py-1 rounded font-semibold ${
                                selectedPreviewItem.matchPercentage >= 80
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                  : selectedPreviewItem.matchPercentage >= 60
                                    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                    : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                              }`}
                            >
                              {selectedPreviewItem.matchPercentage}%
                            </span>
                          </p>
                          <p className="text-sm text-foreground bg-orange-50 dark:bg-orange-950/30 p-2 rounded border border-orange-200 dark:border-orange-800">
                            {highlightMatches(
                              selectedPreviewItem.title,
                              productTitle,
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedPreviewItem(null)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0 mt-2"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Images Grid */}
                    <div className="p-6">
                      <h4 className="font-semibold text-foreground mb-4 text-sm">
                        Comparar Imágenes
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Product Image */}
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              Tu Producto
                            </span>
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
                              Original
                            </span>
                          </div>
                          <div
                            className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center min-h-80 cursor-zoom-in hover:ring-2 hover:ring-blue-500 transition-all"
                            onClick={() =>
                              setZoomedImage({
                                src: productImage,
                                title: "Tu Producto",
                              })
                            }
                          >
                            <Image
                              src={productImage}
                              alt="Tu Producto"
                              fill
                              className="object-contain p-4"
                              onError={() => {
                                /* Handle image error */
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                              <span className="text-white text-sm font-semibold">
                                Hacer zoom
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* eBay Listing Image */}
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              Listado eBay
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                selectedPreviewItem.matchPercentage >= 80
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                  : selectedPreviewItem.matchPercentage >= 60
                                    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                    : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                              }`}
                            >
                              {selectedPreviewItem.matchPercentage}%
                            </span>
                          </div>
                          <div
                            className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center min-h-80 cursor-zoom-in hover:ring-2 hover:ring-orange-500 transition-all"
                            onClick={() =>
                              selectedPreviewItem.imageUrl &&
                              setZoomedImage({
                                src: selectedPreviewItem.imageUrl,
                                title: "Listado eBay",
                              })
                            }
                          >
                            {selectedPreviewItem.imageUrl ? (
                              <>
                                <Image
                                  src={selectedPreviewItem.imageUrl}
                                  alt="eBay Listing"
                                  fill
                                  className="object-contain p-4"
                                  onError={() => {
                                    /* Handle image error */
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                                  <span className="text-white text-sm font-semibold">
                                    Hacer zoom
                                  </span>
                                </div>
                              </>
                            ) : selectedPreviewItem.itemWebUrl ? (
                              <a
                                href={selectedPreviewItem.itemWebUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute inset-0 z-10 text-muted-foreground text-sm flex items-center justify-center hover:bg-muted/50 transition-colors"
                              >
                                Ver en eBay →
                              </a>
                            ) : (
                              <div className="text-muted-foreground text-sm">
                                Imagen no disponible
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Match Details */}
                      <div className="bg-muted/50 rounded-lg p-4 mb-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <span className="text-xs text-muted-foreground">
                              Coincidencia
                            </span>
                            <p className="text-lg font-bold text-foreground">
                              {selectedPreviewItem.matchPercentage}%
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">
                              Precio
                            </span>
                            <p className="text-lg font-bold text-foreground">
                              $
                              {selectedPreviewItem.price.toLocaleString(
                                "es-MX",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">
                              Moneda
                            </span>
                            <p className="text-lg font-bold text-foreground">
                              {selectedPreviewItem.currency}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">
                              Ver anuncio
                            </span>
                            {selectedPreviewItem.itemWebUrl && (
                              <a
                                href={selectedPreviewItem.itemWebUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                              >
                                eBay
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Match Reasons */}
                      {selectedPreviewItem.matchReasons.length > 0 && (
                        <div className="bg-muted/50 rounded-lg p-4 mb-6">
                          <h4 className="text-sm font-semibold text-foreground mb-3">
                            Razones de Coincidencia:
                          </h4>
                          <ul className="space-y-2">
                            {selectedPreviewItem.matchReasons.map(
                              (reason, idx) => (
                                <li
                                  key={idx}
                                  className="text-sm text-foreground flex items-start gap-2"
                                >
                                  <span className="text-green-600 flex-shrink-0">
                                    ✓
                                  </span>
                                  {reason}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            handleSelectPrice(selectedPreviewItem.price);
                            setSelectedPreviewItem(null);
                          }}
                          className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <MdCheckCircle size={16} />
                          Usar este precio
                        </button>
                        <button
                          onClick={() => setSelectedPreviewItem(null)}
                          className="flex-1 px-4 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-sm font-semibold transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Zoom Image Modal */}
              {zoomedImage && (
                <div
                  className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                  onClick={() => setZoomedImage(null)}
                >
                  <div
                    className="relative bg-background rounded-lg shadow-2xl max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header */}
                    <div className="sticky top-0 bg-background border-b border-muted flex items-center justify-between p-4">
                      <h3 className="font-semibold text-foreground text-sm">
                        {zoomedImage.title}
                      </h3>
                      <button
                        onClick={() => setZoomedImage(null)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Zoomed Image */}
                    <div className="flex-1 flex items-center justify-center overflow-auto bg-muted p-8">
                      <div className="relative w-full h-full">
                        <Image
                          src={zoomedImage.src}
                          alt={zoomedImage.title}
                          width={800}
                          height={600}
                          className="object-contain"
                          priority
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
                        />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="bg-muted/50 border-t border-muted p-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        Click en el fondo o presiona ESC para cerrar
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Price */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Precio actual:
                  </span>
                  <span className="font-semibold text-foreground">
                    ${currentPrice}
                  </span>
                </div>
              </div>

              {/* Retry Button */}
              <button
                onClick={handleCheckPrices}
                disabled={loading}
                className="w-full px-4 py-2 border border-muted rounded-lg text-sm font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
              >
                <div className="flex items-center justify-center gap-2">
                  <MdRefresh
                    size={16}
                    className={loading ? "animate-spin" : ""}
                  />
                  {loading ? "Buscando..." : "Buscar de nuevo"}
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
