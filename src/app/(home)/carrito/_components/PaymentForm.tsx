"use client";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { AiOutlineUser } from "react-icons/ai";
import { useSession } from "next-auth/react";
import { loadStripe } from "@stripe/stripe-js";
import { resetCart, saveOrder } from "@/redux/shoppingSlice";
import { useDispatch } from "react-redux";
import Image from "next/image";
import Link from "next/link";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import { revalidatePath } from "next/cache";
import { calculateShippingQuotes } from "@/lib/shippingRates";

interface PaymentFormProps {
  fulfillmentType?: "shipping" | "pickup";
  pickupStore?: string;
  storeId?: string;
}

const PaymentForm = ({
  fulfillmentType = "shipping",
  pickupStore = "",
  storeId = "",
}: PaymentFormProps) => {
  const dispatch = useDispatch();
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);
  const {
    productsData,
    shippingInfo,
    userInfo,
    affiliateInfo,
    shippingMethod,
  } = useSelector((state: any) => state.compras);

  const amountTotal = productsData?.reduce(
    (acc: any, cartItem: any) => acc + cartItem.quantity * cartItem.price,
    0,
  );

  // Calcular automáticamente el costo de envío si no hay método seleccionado
  const calculatedShipAmount = useMemo(() => {
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
      return quotes.length > 0 ? quotes[0] : null;
    } catch (error) {
      console.error("Error calculando envío:", error);
      return { price: 199, serviceName: "Envío ", estimatedDays: 2 };
    }
  }, [productsData]);

  const shipAmount =
    fulfillmentType === "pickup"
      ? 0
      : shippingMethod?.price ||
        (calculatedShipAmount && typeof calculatedShipAmount === "object"
          ? calculatedShipAmount.price
          : 0) ||
        0;
  const layawayAmount = Number(amountTotal) * 0.3;

  const totalAmountCalc = Number(amountTotal) + Number(shipAmount);
  const iva = Math.round(((totalAmountCalc * 16) / 116) * 100) / 100;

  // Helper function to extract device information from user agent string

  //=============================== Stripe Payment starts here ============================

  // Use test key in development, live key in production
  const isLocalhost =
    typeof window !== "undefined" && window.location.hostname === "localhost";
  const stripeKey = isLocalhost
    ? process.env.NEXT_PUBLIC_STRIPE_TEST_KEY!
    : process.env.NEXT_PUBLIC_STRIPE__KEY!;
  const stripePromise = loadStripe(stripeKey);

  const handleCheckout = async (payType: any) => {
    // Validar que tenemos información del usuario
    const userData = userInfo || session?.user;

    if (!userData || !userData.email) {
      alert("Por favor completa tu información de usuario antes de continuar.");
      return;
    }

    // Validar según tipo de fulfillment
    if (fulfillmentType === "pickup" && !pickupStore) {
      alert("Por favor selecciona una sucursal para el retiro.");
      return;
    }

    if (fulfillmentType === "shipping") {
      // Usar método de envío seleccionado o el calculado automáticamente
      const finalShippingMethod = shippingMethod || calculatedShipAmount;

      if (!finalShippingMethod) {
        alert(
          "Error al calcular el costo de envío. Por favor intenta nuevamente.",
        );
        return;
      }
    }

    const stripe = await stripePromise;

    const requestBody: any = {
      items: productsData,
      email: userData.email,
      user: userData,
      fulfillmentType: fulfillmentType,
      payType: payType,
      affiliateInfo: affiliateInfo,
    };

    // Only add shipping info for shipping fulfillment
    if (fulfillmentType === "shipping") {
      requestBody.shipping = shippingInfo;
      requestBody.shippingMethod = shippingMethod || calculatedShipAmount;
    }

    // Add pickup store for pickup fulfillment
    if (fulfillmentType === "pickup") {
      requestBody.pickupStore = pickupStore;
      requestBody.storeId = pickupStore; // For inventory deduction from pickup store
    }

    const response = await fetch(`/api/checkout?${payType}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    try {
      const data = await response.json();

      if (!response.ok) {
        console.error("Checkout error:", data);
        alert(
          `Error al procesar el pago: ${data.error || "Error desconocido"}`,
        );
        return;
      }

      if (!data.id || !data.url) {
        console.error("Missing session ID or URL:", data);
        alert("Error: No se recibió la sesión de pago");
        return;
      }

      console.log("Redirecting to checkout:", data.url);
      dispatch(saveOrder({ order: productsData, id: data.id }));

      const result = await stripe?.redirectToCheckout({ sessionId: data.id });

      if (result?.error) {
        console.error("Stripe redirect error:", result.error);
        alert(`Error al redirigir: ${result.error.message}`);
        return;
      }

      dispatch(resetCart());
      revalidatePath("/admin/pedidos");
    } catch (error) {
      console.error("Checkout exception:", error);
      alert("Error al procesar el pago. Por favor intenta nuevamente.");
    }
  };

  //=============================== Stripe Payment ends here ============================
  return (
    <section className="p-1 maxsm:py-7 bg-card rounded-xl">
      <div className=" max-w-screen-xl mx-auto bg-background flex flex-col justify-between p-2 rounded-xl">
        <ul className="mb-5">
          <li className="flex justify-between text-muted  mb-1">
            <span>Sub-Total:</span>
            <span>
              <FormattedPrice amount={amountTotal} />
            </span>
          </li>
          <li className="flex justify-between text-muted  mb-1">
            <span className="text-xs">Total de Artículos:</span>
            <span className="text-emerald-700 text-[11px]">
              {productsData?.reduce(
                (acc: any, cartItem: any) => acc + cartItem.quantity,
                0,
              )}
              (Artículos)
            </span>
          </li>

          <li className="flex justify-between text-muted  mb-1">
            <span>Envío:</span>
            <span>
              <FormattedPrice amount={shipAmount} />
            </span>
          </li>
          {(shippingMethod || calculatedShipAmount) && (
            <li className="flex justify-between text-muted mb-1">
              <span className="text-xs">Método:</span>
              <span className="text-xs text-right">
                {(shippingMethod || calculatedShipAmount).serviceName ||
                  "Envío "}
                <br />
                <span className="text-emerald-600">
                  {(shippingMethod || calculatedShipAmount).estimatedDays || 5}{" "}
                  día
                  {((shippingMethod || calculatedShipAmount).estimatedDays ||
                    5) !== 1
                    ? "s"
                    : ""}
                </span>
              </span>
            </li>
          )}
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
            <button
              onClick={() => handleCheckout("total")}
              className={`rounded-xl w-full text-slate-100 mt-4 py-3 px-6 duration-300 ease-in-out cursor-pointer ${
                fulfillmentType === "pickup" || shippingMethod
                  ? "bg-emerald-600 hover:bg-emerald-800 hover:text-foreground"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
              disabled={fulfillmentType === "shipping" && !shippingMethod}
            >
              {fulfillmentType === "pickup" || shippingMethod ? (
                <>
                  Pagar Total <FormattedPrice amount={totalAmountCalc} />
                </>
              ) : (
                "Selecciona método de envío"
              )}
            </button>
            <p className="text-[11px]">
              Si realizaste un pago por Oxxo o Transferencia Bancaria
            </p>
            <p className="text-[11px]">
              Permite hasta 24 horas después de tu pago para que se refleje en
              tu cuenta.
            </p>
            <Link
              href="/carrito"
              className="w-full mt-4 text-center px-5 rounded-xl py-2 inline-block text-muted bg-background shadow-sm border border-gray-200 hover:bg-card hover:text-white"
            >
              Regresar
            </Link>
          </div>
        ) : (
          <div>
            {/** Login/Register */}
            {!session && (
              <>
                <Link href={`/iniciar?callbackUrl=/carrito`}>
                  <div className=" w-1/4 maxmd:w-2/3 sm:w-full bg-black text-slate-100 mt-4 py-3 px-6 hover:bg-green-600 duration-500 cursor-pointer">
                    <div className="flex flex-row justify-center items-center gap-x-3 ">
                      <AiOutlineUser className="text-ld" />
                      <p className="text-sm font-base">Iniciar/Registro</p>
                    </div>
                  </div>
                </Link>
              </>
            )}
            <p className="text-[10px] mt-1 text-orange-600 py-2">
              Por favor inicie sesión para continuar
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

export default PaymentForm;
