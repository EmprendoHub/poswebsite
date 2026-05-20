"use client";
import React, { useState } from "react";
import Link from "next/link";
import BreadCrumbs from "@/components/layouts/BreadCrumbs";
import PaymentForm from "./PaymentForm";
import ShippingOptions from "./ShippingOptions";
import {
  addUser,
  addShippingInfo,
  addShippingMethod,
} from "@/redux/shoppingSlice";
import { useDispatch } from "react-redux";
import { useSession } from "next-auth/react";

const Shipping = ({ addresses }: { addresses: any }) => {
  const [selectedShipping, setSelectedShipping] = useState<any>(null);

  const breadCrumbs = [
    {
      name: "Tienda",
      url: "/tienda",
    },
    {
      name: `carrito`,
      url: `/carrito`,
    },
    {
      name: `envio`,
      url: `/carrito/envio`,
    },
  ];
  const dispatch = useDispatch();
  const session: any = useSession();

  function handleClick(radio: any, selectedAddress: any) {
    if (radio.checked === false) {
      //delete filter
      console.log("deleted");
    } else {
      //set query filter
      const user = {
        name: session.data.user.name,
        email: session.data.user.email,
        _id: session.data.user._id,
        access_token: session.data.user.accessToken,
      };
      dispatch(addShippingInfo(selectedAddress));
      dispatch(addUser(user));
    }
  }

  const handleShippingSelect = (shippingQuote: any) => {
    setSelectedShipping(shippingQuote);
    dispatch(addShippingMethod(shippingQuote));
  };
  return (
    <div>
      <section className="py-10 ">
        <div className=" max-w-screen-xl mx-auto px-4">
          <div className="flex maxsm:flex-col flex-row gap-4 lg:gap-8">
            <main className="md:w-2/3">
              <article className="border border-muted bg-background shadow-sm rounded-xl p-4 lg:p-6 mb-5">
                <h2 className="text-xl font-semibold mb-3">
                  Información de Envió
                </h2>

                <div className="grid grid-cols-2 maxsm:grid-cols-1 gap-4 mb-6">
                  {addresses?.map((address: any, index: number) => (
                    <label
                      key={index}
                      className="flex p-3 border border-muted bg-card rounded-xl hover:border-blue-400 hover:bg-background cursor-pointer"
                    >
                      <span>
                        <input
                          name="shipping"
                          type="radio"
                          className="h-4 w-4 mt-1"
                          onClick={(e) => handleClick(e.target, address)}
                        />
                      </span>
                      <p className="ml-2">
                        <span>{address?.street}</span>
                        <small className="block text-sm text-gray-400">
                          {address?.city}, {address?.province},{" "}
                          {address?.zip_code}
                          <br />
                          {address?.country}
                          <br />
                          {address?.phone}
                        </small>
                      </p>
                    </label>
                  ))}
                </div>

                {addresses.length <= 0 && (
                  <Link
                    href={`/perfil/direcciones/nueva?callbackUrl=${process.env.NEXT_PUBLIC_NEXTAUTH_URL}/carrito/envio`}
                    className="px-4 py-2 inline-block  border border-gray-300 rounded-xl hover:bg-muted"
                  >
                    <i className="mr-1 fa fa-plus"></i> Agregar nueva dirección
                  </Link>
                )}
              </article>

              {/* Shipping Options Section */}
              <ShippingOptions
                onShippingSelect={handleShippingSelect}
                selectedShipping={selectedShipping}
              />
            </main>
            <aside className="md:w-1/4">
              <article className="border border-muted bg-background shadow-sm rounded-xl mb-5 p-1">
                <PaymentForm />
              </article>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Shipping;
