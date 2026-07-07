/**
 * Modal component for displaying existing product with ASIN conflict
 * Shows product details and prevents duplicate ASIN creation
 */

"use client";
import React from "react";
import Image from "next/image";
import { X } from "lucide-react";

interface ExistingProduct {
  _id: string;
  title: string;
  brand: string;
  category: string;
  ASIN: string;
  images: Array<{ url: string }>;
  variations: Array<{ color: string; price: number }>;
  stock: number;
  active: boolean;
  price: number;
  slug: string;
}

interface ASINConflictModalProps {
  isOpen: boolean;
  existingProduct: ExistingProduct | null;
  onClose: () => void;
  onViewProduct?: () => void;
}

export default function ASINConflictModal({
  isOpen,
  existingProduct,
  onClose,
  onViewProduct,
}: ASINConflictModalProps) {
  if (!isOpen || !existingProduct) return null;

  const mainImage =
    existingProduct.images?.[0]?.url ||
    "/images/product-placeholder-minimalist.jpg";
  const variations = existingProduct.variations || [];
  const colors = Array.from(new Set(variations.map((v) => v.color)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-lg shadow-lg p-6 maxsm:p-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition"
          aria-label="Cerrar"
        >
          <X size={24} className="text-gray-600" />
        </button>

        {/* Header */}
        <div className="mb-6 pr-8">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            ⚠️ El ASIN ya existe
          </h2>
          <p className="text-gray-600">
            Un producto con el ASIN{" "}
            <span className="font-semibold">{existingProduct.ASIN}</span> ya
            está registrado en el sistema.
          </p>
        </div>

        {/* Product Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Product Image */}
          <div className="md:col-span-1">
            <div className="bg-gray-100 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
              <Image
                src={mainImage}
                alt={existingProduct.title}
                width={250}
                height={250}
                className="object-cover w-full h-full"
              />
            </div>
          </div>

          {/* Product Details */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 line-clamp-2">
                {existingProduct.title}
              </h3>
              {existingProduct.brand && (
                <p className="text-sm text-gray-500 mt-1">
                  Marca:{" "}
                  <span className="font-medium">{existingProduct.brand}</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Categoría</p>
                <p className="font-semibold">{existingProduct.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Estado</p>
                <p
                  className={`font-semibold ${existingProduct.active ? "text-green-600" : "text-red-600"}`}
                >
                  {existingProduct.active ? "Activo" : "Inactivo"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Stock</p>
                <p className="font-semibold">
                  {existingProduct.stock || 0} unidades
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Precio Base</p>
                <p className="font-semibold">
                  ${existingProduct.price?.toFixed(2) || "N/A"}
                </p>
              </div>
            </div>

            {/* Variations */}
            {colors.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Colores disponibles
                </p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <span
                      key={color}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ASIN Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                ASIN del producto existente
              </p>
              <p className="font-mono font-semibold text-lg">
                {existingProduct.ASIN}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            Usar otro ASIN
          </button>
          {onViewProduct && (
            <button
              onClick={onViewProduct}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Ver Producto Completo
            </button>
          )}
        </div>

        {/* Info message */}
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            💡 <span className="font-medium">Consejo:</span> Si deseas crear un
            producto similar, usa un ASIN diferente o modifica el título del
            producto.
          </p>
        </div>
      </div>
    </div>
  );
}
