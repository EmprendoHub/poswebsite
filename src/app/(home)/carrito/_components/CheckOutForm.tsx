"use client";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import { calculateShippingQuotes } from "@/lib/shippingRates";

const CheckOutForm = () => {
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);
  const { productsData } = useSelector((state: any) => state.compras);

  const amountTotal = productsData?.reduce(
    (acc: any, cartItem: any) => acc + cartItem.quantity * cartItem.price,
    0,
  );

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
            <Link
              href="/carrito/envio"
              className="text-slate-100 text-center bg-emerald-700 mt-4 py-3 px-6 hover:bg-card hover:text-foreground duration-300 ease-in-out cursor-pointer w-full rounded-xl"
            >
              Continuar
            </Link>

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
