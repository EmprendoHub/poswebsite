"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, AlertCircle, CheckCircle } from "lucide-react";
import { calculateShippingQuotes } from "@/lib/shippingRates";

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
  onShippingSelect: (quote: ShippingQuote) => void;
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

  // Obtener datos del carrito del Redux store
  const cartState = useSelector((state: any) => state.compras);

  const cartItems = useMemo(() => {
    return cartState?.productsData || [];
  }, [cartState?.productsData]);

  const shippingInfo = useMemo(() => {
    return cartState?.shippingInfo;
  }, [cartState?.shippingInfo]);

  // Calcular automáticamente el envío cuando hay items
  useEffect(() => {
    if (cartItems.length > 0) {
      try {
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
  }, [cartItems, selectedShipping, onShippingSelect]);

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
