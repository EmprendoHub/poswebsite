"use client";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LuMapPin, LuTruck } from "react-icons/lu";

interface Store {
  _id: string;
  name: string;
  slug: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface FulfillmentSelectorProps {
  onFulfillmentChange?: (
    fulfillmentType: "shipping" | "pickup",
    pickupStore?: string,
  ) => void;
}

const FulfillmentSelector = ({
  onFulfillmentChange,
}: FulfillmentSelectorProps) => {
  const [fulfillmentType, setFulfillmentType] = useState<"shipping" | "pickup">(
    "shipping",
  );
  const [pickupStore, setPickupStore] = useState<string>("");
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPickupForced, setIsPickupForced] = useState(false);
  const dispatch = useDispatch();

  // Get cart products from Redux
  const { productsData } = useSelector((state: any) => state.compras);

  // Check if pickup-only mode is forced by unshippable items
  useEffect(() => {
    const forcePickupOnly = sessionStorage.getItem("forcePickupOnly");
    console.log(
      "🔍 [FulfillmentSelector] Checking forcePickupOnly:",
      forcePickupOnly,
    );

    if (forcePickupOnly === "true") {
      console.log(
        "🚫 [FulfillmentSelector] Hiding fulfillment selector - pickup required",
      );
      setIsPickupForced(true);
      setFulfillmentType("pickup");
    } else {
      console.log(
        "✓ [FulfillmentSelector] Showing fulfillment selector - normal mode",
      );
      setIsPickupForced(false);
      setFulfillmentType("shipping");
    }
  }, []);

  // Fetch available stores for pickup with stock for cart items
  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);

        // Build query params from cart items
        let url = "/api/stores/public";
        if (productsData && productsData.length > 0) {
          // Get variation IDs from cart items
          const variationIds = productsData
            .map((item: any) => item._id || item.variation)
            .filter(Boolean);

          if (variationIds.length > 0) {
            const params = new URLSearchParams();
            params.append("variationIds", variationIds.join(","));
            url += `?${params.toString()}`;
          }
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch stores");
        const data = await res.json();
        setStores(data.stores || []);
        // Default to first store if available
        if (data.stores?.length > 0 && !pickupStore) {
          setPickupStore(data.stores[0]._id);
        }
      } catch (error) {
        console.error("Error fetching stores:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsData]);

  const handleFulfillmentChange = (type: "shipping" | "pickup") => {
    setFulfillmentType(type);
    onFulfillmentChange?.(type, type === "pickup" ? pickupStore : undefined);
  };

  const handleStoreChange = (storeId: string) => {
    setPickupStore(storeId);
    onFulfillmentChange?.("pickup", storeId);
  };

  // If pickup is forced by unshippable items, don't render this component
  if (isPickupForced) {
    console.log("⏭️ [FulfillmentSelector] Skipping render - pickup forced");
    return null;
  }

  return (
    <div className="border border-muted bg-background shadow-sm rounded-xl p-4 lg:p-6 mb-5">
      <h2 className="text-xl font-semibold mb-4">Método de Entrega</h2>

      <div className="space-y-3">
        {/* Shipping Option */}
        <label className="flex items-center p-4 border border-muted bg-card rounded-lg hover:border-blue-400 hover:bg-background cursor-pointer transition-all">
          <input
            type="radio"
            name="fulfillment"
            value="shipping"
            checked={fulfillmentType === "shipping"}
            onChange={() => handleFulfillmentChange("shipping")}
            className="h-5 w-5 rounded-full"
          />
          <div className="ml-4 flex items-center gap-3">
            <LuTruck className="text-lg text-blue-600" />
            <div>
              <p className="font-semibold text-foreground">Envío a Domicilio</p>
              <p className="text-sm text-muted-foreground">
                Entrega a tu dirección registrada
              </p>
            </div>
          </div>
        </label>

        {/* Pickup Option */}
        <label className="flex items-center p-4 border border-muted bg-card rounded-lg hover:border-green-400 hover:bg-background cursor-pointer transition-all">
          <input
            type="radio"
            name="fulfillment"
            value="pickup"
            checked={fulfillmentType === "pickup"}
            onChange={() => handleFulfillmentChange("pickup")}
            className="h-5 w-5 rounded-full"
          />
          <div className="ml-4 flex items-center gap-3">
            <LuMapPin className="text-lg text-green-600" />
            <div>
              <p className="font-semibold text-foreground">Recoger en Tienda</p>
              <p className="text-sm text-muted-foreground">
                Compra pagada en línea, retira en sucursal
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Store Selection for Pickup */}
      {fulfillmentType === "pickup" && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <label className="block text-sm font-semibold text-foreground mb-3">
            Selecciona la sucursal donde recogerás tu orden
          </label>

          {loading ? (
            <div className="text-sm text-muted-foreground">
              Cargando sucursales...
            </div>
          ) : stores.length === 0 ? (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
              {productsData && productsData.length > 0
                ? "No hay sucursales con stock disponible para los productos en tu carrito. Intenta con envío a domicilio o revisa los productos."
                : "No hay sucursales disponibles para recoger"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stores.map((store) => (
                <label
                  key={store._id}
                  className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                    pickupStore === store._id
                      ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                      : "border-muted bg-card hover:border-green-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="pickupStore"
                    value={store._id}
                    checked={pickupStore === store._id}
                    onChange={() => handleStoreChange(store._id)}
                    className="h-4 w-4 mt-1 rounded-full"
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-semibold text-sm text-foreground">
                      {store.name}
                    </p>
                    {store.city && (
                      <p className="text-xs text-muted-foreground">
                        📍 {store.city}
                      </p>
                    )}
                    {store.address && (
                      <p className="text-xs text-muted-foreground">
                        {store.address}
                      </p>
                    )}
                    {store.phone && (
                      <p className="text-xs text-muted-foreground">
                        📞 {store.phone}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground bg-background p-2 rounded">
            ℹ️ Tu orden estará lista para recoger dentro de 24-48 horas después
            del pago
          </p>
        </div>
      )}
    </div>
  );
};

export default FulfillmentSelector;
