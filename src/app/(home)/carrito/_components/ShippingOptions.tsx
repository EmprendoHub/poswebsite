"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, AlertCircle, CheckCircle, MapPin } from "lucide-react";
import { calculateShippingQuotes, UnshippableItem } from "@/lib/shippingRates";

interface ShippingQuote {
  id: string;
  carrier: string;
  service: string;
  serviceName: string;
  price: number;
  currency: string;
  estimatedDays: number;
  guaranteed: boolean;
  description: string;
  displayPrice: string;
  weightCategory?: string;
}

interface ShippingOptionsProps {
  onShippingSelect: (quote: ShippingQuote | null) => void;
  selectedShipping?: ShippingQuote | null;
}

const ShippingOptions: React.FC<ShippingOptionsProps> = ({
  onShippingSelect,
  selectedShipping,
}) => {
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [unshippableItems, setUnshippableItems] = useState<UnshippableItem[]>(
    [],
  );
  const [forcePickupOnly, setForcePickupOnly] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  // Obtener datos del carrito del Redux store
  const cartState = useSelector((state: any) => state.compras);

  const cartItems = useMemo(() => {
    return cartState?.productsData || [];
  }, [cartState?.productsData]);

  const shippingInfo = useMemo(() => {
    return cartState?.shippingInfo;
  }, [cartState?.shippingInfo]);

  // Check for unshippable items from sessionStorage on component mount
  useEffect(() => {
    const forcePickup = sessionStorage.getItem("forcePickupOnly");
    const unshippableStr = sessionStorage.getItem("unshippableItems");

    console.log("🚚 [ShippingOptions] Checking sessionStorage...");
    console.log("  forcePickupOnly:", forcePickup);
    console.log("  unshippableItems:", unshippableStr);

    if (forcePickup === "true" && unshippableStr) {
      try {
        const items = JSON.parse(unshippableStr);
        console.log("🚚 [ShippingOptions] PICKUP-ONLY MODE ENABLED:", items);
        setUnshippableItems(items);
        setForcePickupOnly(true);

        // For pickup-only orders, we'll create a special quote
        const pickupQuote: ShippingQuote = {
          id: "pickup-only",
          carrier: "Recogida en Tienda",
          service: "pickup",
          serviceName: "Recogida en Tienda - OBLIGATORIO",
          price: 0,
          currency: "MXN",
          estimatedDays: 0,
          guaranteed: true,
          description:
            "Debe recoger estos artículos en una de nuestras tiendas",
          displayPrice: "$0.00 MXN (Recogida)",
        };

        setShippingQuote(pickupQuote);
        onShippingSelect(pickupQuote);
      } catch (err) {
        console.error(
          "❌ [ShippingOptions] Error parsing unshippableItems:",
          err,
        );
      }
    } else {
      console.log("✓ [ShippingOptions] Normal shipping mode");
      setForcePickupOnly(false);
      setUnshippableItems([]);
    }
  }, [onShippingSelect]);

  // Calcular automáticamente el envío cuando hay items
  useEffect(() => {
    if (forcePickupOnly) {
      console.log(
        "⏭️  [ShippingOptions] Skipping shipping calculation - pickup-only mode",
      );
      return; // Skip normal shipping calculation for pickup-only
    }

    if (cartItems.length > 0) {
      try {
        console.log(
          "📦 [ShippingOptions] Calculating shipping for normal delivery",
        );
        const items = cartItems.map((item: any) => ({
          weight: item.weight || 0.5,
          dimensions: item.dimensions || {
            length: item.length || 15,
            width: item.width || 15,
            height: item.height || 10,
          },
          quantity: item.quantity || 1,
          price: item.price || 0,
          title: item.title || item.name || "Producto",
        }));

        const quotes = calculateShippingQuotes(items);

        if (quotes.length > 0) {
          // Seleccionar automáticamente la opción Estándar (la primera)
          const standardQuote = quotes[0];
          setShippingQuote(standardQuote);

          // Notificar al componente padre
          if (!selectedShipping) {
            onShippingSelect(standardQuote);
          }
          setError(null);
        }
      } catch (err: any) {
        console.error("Error calculando envío:", err);
        setError("Error al calcular el costo de envío");
      }
    }
  }, [cartItems, selectedShipping, onShippingSelect, forcePickupOnly]);

  if (forcePickupOnly && unshippableItems.length > 0) {
    return (
      <div className="space-y-4">
        {/* Pickup-only warning */}
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <MapPin className="w-5 h-5" />
              Recogida en Tienda - REQUERIDA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-orange-100/50 dark:bg-orange-900/20 p-3 rounded">
              <p className="text-sm text-orange-700 dark:text-orange-300 font-semibold mb-2">
                ⚠️ Productos no disponibles para envío:
              </p>
              <ul className="text-xs text-orange-600 dark:text-orange-400 space-y-2">
                {unshippableItems.map((item) => (
                  <li key={item.productId} className="ml-2">
                    <strong>{item.title}</strong> (Cant: {item.quantity})
                    <br />
                    Dimensiones: {item.dimensions.length}×
                    {item.dimensions.width}×{item.dimensions.height}cm
                  </li>
                ))}
              </ul>
            </div>

            {/* Store selection for pickup */}
            <div>
              <p className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2">
                Seleccione una tienda para recoger:
              </p>
              <div className="space-y-2">
                {unshippableItems.flatMap((item) =>
                  item.availableStores.map((store) => (
                    <label
                      key={`${item.productId}-${store.storeId}`}
                      className="flex items-start gap-3 p-2 border border-orange-200 dark:border-orange-800 rounded cursor-pointer hover:bg-orange-100/30 dark:hover:bg-orange-900/10"
                    >
                      <input
                        type="radio"
                        name="pickup-store"
                        value={store.storeId}
                        checked={selectedStore === store.storeId}
                        onChange={(e) => setSelectedStore(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1 text-xs">
                        <p className="font-semibold text-orange-700 dark:text-orange-300">
                          {store.storeName}
                        </p>
                        {store.address && (
                          <p className="text-orange-600 dark:text-orange-400">
                            📍 {store.address}
                          </p>
                        )}
                        {(store.city || store.state) && (
                          <p className="text-orange-600 dark:text-orange-400">
                            {store.city} {store.state && `(${store.state})`}
                          </p>
                        )}
                        {store.phone && (
                          <p className="text-orange-600 dark:text-orange-400">
                            📞 {store.phone}
                          </p>
                        )}
                        <p className="text-orange-500 font-semibold">
                          Stock: {store.quantity} unidad(es)
                        </p>
                      </div>
                    </label>
                  )),
                )}
              </div>
            </div>

            {!selectedStore && (
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs">
                <AlertCircle className="w-4 h-4" />
                <span>Debe seleccionar una tienda para continuar</span>
              </div>
            )}

            {selectedStore && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs">
                <CheckCircle className="w-4 h-4" />
                <span>Tienda seleccionada</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pickup-only quote (hidden from display but used for shipping) */}
        <input type="hidden" value={selectedStore || ""} />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Información de Envío
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!shippingQuote) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Información de Envío
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {!shippingInfo
                ? "Selecciona una dirección de envío"
                : "Calculando costo de envío..."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Información de Envío
          <Badge variant="outline" className="text-green-600 ml-auto">
            <CheckCircle className="w-3 h-3 mr-1" />
            Calculado Automáticamente
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950 border-blue-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-lg text-foreground">
                  {shippingQuote.serviceName}
                </h3>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                {shippingQuote.description}
              </p>
            </div>

            <div className="text-right ml-4">
              <div className="font-bold text-2xl text-white">
                {shippingQuote.displayPrice}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Entrega en {shippingQuote.estimatedDays} días
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShippingOptions;
