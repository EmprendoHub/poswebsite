"use client";
import React, { useMemo, useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import { calculateShippingQuotes, UnshippableItem } from "@/lib/shippingRates";
import { getVariationStock } from "@/app/_actions";
import { deleteProduct, setCartQuantity } from "@/redux/shoppingSlice";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

interface StockError {
  _id: string;
  title: string;
  cartQty: number;
  available: number;
}

const CheckOutForm = () => {
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);
  const { productsData } = useSelector((state: any) => state.compras);
  const dispatch = useDispatch();
  const router = useRouter();

  const [checking, setChecking] = useState(false);
  const [stockErrors, setStockErrors] = useState<StockError[]>([]);
  const [unshippableItems, setUnshippableItems] = useState<UnshippableItem[]>(
    [],
  );
  const [showPickupWarning, setShowPickupWarning] = useState(false);

  // Check for unshippable items on cart mount or when productsData changes
  useEffect(() => {
    const checkDeliverability = async () => {
      if (!productsData || productsData.length === 0) {
        setShowPickupWarning(false);
        setUnshippableItems([]);
        return;
      }

      try {
        const cartItems = productsData.map((item: any) => ({
          weight: item.weight || 0.5,
          dimensions: item.dimensions || {
            length: item.length || 15,
            width: item.width || 15,
            height: item.height || 10,
          },
          quantity: item.quantity || 1,
          price: item.price || 0,
          title: item.title || item.name || "Producto",
          name: item._id,
        }));

        console.log(
          "🔍 [Cart] Checking deliverability for",
          cartItems.length,
          "items",
        );

        const response = await fetch("/api/shipping/calculate-with-pickup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: cartItems }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("📦 [Cart] Deliverability check result:", result);

          if (
            result.hasUnshippableItems &&
            result.unshippableItems.length > 0
          ) {
            console.warn(
              "⚠️ [Cart] Unshippable items detected:",
              result.unshippableItems,
            );
            setUnshippableItems(result.unshippableItems);
            setShowPickupWarning(true);
          } else {
            console.log("✓ [Cart] All items are shippable");
            setShowPickupWarning(false);
            setUnshippableItems([]);
          }
        }
      } catch (error) {
        console.error("❌ [Cart] Error checking deliverability:", error);
      }
    };

    checkDeliverability();
  }, [productsData]);

  const amountTotal = productsData?.reduce((acc: any, cartItem: any) => {
    const discountPercentage = cartItem.discountPercentage || 0;
    const discountedPrice = cartItem.price * (1 - discountPercentage / 100);
    return acc + cartItem.quantity * discountedPrice;
  }, 0);

  // Calcular automáticamente el costo de envío (opción Estándar)
  const shipAmount = useMemo(() => {
    if (!productsData || productsData.length === 0) return 0;

    try {
      const cartItems = productsData.map((item: any) => ({
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

      const quotes = calculateShippingQuotes(cartItems);
      // Retornar el precio de la opción Estándar (la primera y más barata)
      return quotes.length > 0 ? quotes[0].price : 0;
    } catch (error) {
      console.error("Error calculando envío:", error);
      return 199; // Tarifa mínima por defecto
    }
  }, [productsData]);

  const totalAmountCalc = Number(amountTotal) + Number(shipAmount);
  const iva = Math.round(((totalAmountCalc * 16) / 116) * 100) / 100;

  async function handleContinuar() {
    setChecking(true);
    setStockErrors([]);
    setUnshippableItems([]);
    setShowPickupWarning(false);

    try {
      // Check every item in parallel
      const results = await Promise.all(
        productsData.map(async (item: any) => {
          const { currentStock } = await getVariationStock(item._id);
          return {
            _id: item._id,
            title: item.title,
            cartQty: item.quantity,
            available: currentStock,
          };
        }),
      );

      const errors = results.filter((r) => r.available < r.cartQty);
      if (errors.length > 0) {
        setStockErrors(errors);
        return;
      }

      // Check for unshippable items using the new pickup-aware API
      const cartItems = productsData.map((item: any) => ({
        weight: item.weight || 0.5,
        dimensions: item.dimensions || {
          length: item.length || 15,
          width: item.width || 15,
          height: item.height || 10,
        },
        quantity: item.quantity || 1,
        price: item.price || 0,
        title: item.title || item.name || "Producto",
        name: item._id,
      }));

      console.log(
        "🚚 [Checkout] Calling shipping calculation API with items:",
        cartItems,
      );

      try {
        const response = await fetch("/api/shipping/calculate-with-pickup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: cartItems }),
        });

        console.log("📡 [Checkout] API Response status:", response.status);

        if (response.ok) {
          const result = await response.json();
          console.log("📦 [Checkout] Shipping calculation result:", result);

          if (
            result.hasUnshippableItems &&
            result.unshippableItems.length > 0
          ) {
            console.warn(
              "⚠️ [Checkout] Unshippable items found - forcing pickup mode:",
              result.unshippableItems,
            );
            // Store unshippable items in sessionStorage to force pickup mode in shipping page
            sessionStorage.setItem(
              "unshippableItems",
              JSON.stringify(result.unshippableItems),
            );
            sessionStorage.setItem("forcePickupOnly", "true");
          } else {
            console.log(
              "✓ [Checkout] All items are shippable - normal checkout",
            );
            sessionStorage.removeItem("unshippableItems");
            sessionStorage.removeItem("forcePickupOnly");
          }
        }
      } catch (pickupError) {
        console.error(
          "❌ [Checkout] Error checking for unshippable items:",
          pickupError,
        );
        // Don't block checkout if this fails
      }

      // If no stock errors, proceed to shipping selection
      console.log("→ [Checkout] Navigating to /carrito/envio");
      router.push("/carrito/envio");
    } catch {
      setStockErrors([
        {
          _id: "__error__",
          title: "No se pudo verificar el stock",
          cartQty: 0,
          available: -1,
        },
      ]);
    } finally {
      setChecking(false);
    }
  }

  function fixStockError(err: StockError) {
    if (err.available <= 0) {
      dispatch(deleteProduct(err._id));
    } else {
      dispatch(setCartQuantity({ id: err._id, quantity: err.available }));
    }
    setStockErrors((prev) => prev.filter((e) => e._id !== err._id));
  }

  return (
    <section className="p-2 maxsm:py-7 ">
      <div className=" max-w-screen-xl mx-auto bg-background flex flex-col justify-between p-2">
        <ul className="mb-5 text-xs">
          <li className="flex justify-between text-muted  mb-1">
            <span>Sub-Total:</span>
            <span>
              <FormattedPrice amount={amountTotal} />
            </span>
          </li>
          <li className="flex justify-between text-muted  mb-1">
            <span className="text-xs">Artículos:</span>
            <span className=" text-[11px]">
              {productsData?.reduce(
                (acc: any, cartItem: any) => acc + cartItem.quantity,
                0,
              )}
              (Artículos)
            </span>
          </li>
          <li className="flex justify-between text-muted  mb-1">
            <span>Envió:</span>
            <span>
              <FormattedPrice amount={shipAmount} />
            </span>
          </li>
          <li className="text-lg font-bold border-t flex justify-between mt-3 pt-3">
            <span>Total:</span>
            <span>
              <FormattedPrice amount={totalAmountCalc} />
            </span>
          </li>
          <li className="flex justify-between text-muted mt-1">
            <span className="text-xs text-gray-400">IVA incluido (16%):</span>
            <span className="text-xs text-gray-400">
              <FormattedPrice amount={iva} />
            </span>
          </li>
        </ul>

        {isLoggedIn ? (
          <div className="flex flex-col items-center gap-1">
            {/* Pickup warning for unshippable items */}
            {showPickupWarning && unshippableItems.length > 0 && (
              <div className="w-full rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800 px-3 py-3 mb-3">
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">
                  ⚠️ Algunos productos requieren recogida en tienda:
                </p>
                <div className="flex flex-col gap-3">
                  {unshippableItems.map((item) => (
                    <div
                      key={item.productId}
                      className="border-b border-orange-200 dark:border-orange-800 pb-2 last:border-0"
                    >
                      <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                        {item.title} (Cantidad: {item.quantity})
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mb-2">
                        Dimensiones: {item.dimensions.length}×
                        {item.dimensions.width}×{item.dimensions.height}cm -{" "}
                        {item.reason}
                      </p>
                      {item.availableStores.length > 0 ? (
                        <div className="ml-2">
                          <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-1">
                            Disponible en:
                          </p>
                          <ul className="text-xs text-orange-600 dark:text-orange-400 space-y-1">
                            {item.availableStores.map((store) => (
                              <li key={store.storeId} className="ml-2">
                                <strong>{store.storeName}</strong>
                                {store.address && (
                                  <span> - {store.address}</span>
                                )}
                                {store.city && <span> ({store.city}</span>}
                                {store.state && <span>, {store.state}</span>}
                                {store.city && <span>)</span>}
                                {store.phone && (
                                  <span> - Tel: {store.phone}</span>
                                )}
                                <br />
                                <span className="text-orange-500">
                                  Stock: {store.quantity} unidad(es)
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-orange-500 dark:text-orange-400 ml-2">
                          No hay información de tienda disponible en este
                          momento.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stock error list */}
            {stockErrors.length > 0 && (
              <div className="w-full rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-3 py-3 mb-1">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">
                  Hay productos con stock insuficiente:
                </p>
                <ul className="flex flex-col gap-2">
                  {stockErrors.map((err) =>
                    err._id === "__error__" ? (
                      <li key="__error__" className="text-xs text-red-600">
                        {err.title}
                      </li>
                    ) : (
                      <li
                        key={err._id}
                        className="text-xs text-red-700 dark:text-red-300"
                      >
                        <span className="font-medium">{err.title}</span>
                        <br />
                        <span className="text-red-500">
                          {err.available <= 0
                            ? "Sin stock disponible."
                            : `Solo ${err.available} disponible(s), tienes ${err.cartQty} en carrito.`}
                        </span>
                        <button
                          onClick={() => fixStockError(err)}
                          className="ml-2 underline text-red-600 dark:text-red-400 hover:text-red-800"
                        >
                          {err.available <= 0
                            ? "Eliminar"
                            : `Ajustar a ${err.available}`}
                        </button>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

            <button
              onClick={handleContinuar}
              disabled={checking}
              className="flex items-center justify-center gap-2 text-slate-100 text-center bg-emerald-700 mt-4 py-3 px-6 hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed duration-300 ease-in-out w-full rounded-xl"
            >
              {checking && (
                <AiOutlineLoading3Quarters
                  size={15}
                  className="animate-spin flex-shrink-0"
                />
              )}
              {checking ? "Verificando stock..." : "Continuar"}
            </button>

            <Link
              href="/tienda"
              className="px-4 mt-3 py-3 inline-block w-full text-center font-medium bg-background shadow-sm border border-muted rounded-xl hover:bg-card text-foreground font-EB_Garamond"
            >
              Tienda
            </Link>
          </div>
        ) : (
          <div>
            {/** Login/Register */}
            {!session && (
              <>
                <Link href={`/iniciar?callbackUrl=/carrito`}>
                  <div className=" w-full bg-emerald-800 text-slate-100 mb-3 rounded-xl py-3 px-6 hover:bg-emerald-900 duration-500 cursor-pointer">
                    <div className="flex flex-row justify-center items-center gap-x-3 ">
                      <p className="text-xs font-base">Iniciar/Registro</p>
                    </div>
                  </div>
                </Link>
                <Link
                  href="/tienda"
                  className="px-4 py-2 inline-block text-xs w-full text-center font-medium bg-background shadow-sm border border-gray-200 rounded-xl hover:bg-opacity-80 text-foreground"
                >
                  Tienda
                </Link>
              </>
            )}
            <p className="text-[10px] mt-1 text-orange-500 py-2">
              Inicia sesión para continuar
            </p>
          </div>
        )}
        <div className="trustfactor-class">
          <Image
            src={"/icons/stripe-badge-transparente.webp"}
            width={500}
            height={200}
            alt="Stripe Payment"
          />
        </div>
      </div>
    </section>
  );
};

export default CheckOutForm;
