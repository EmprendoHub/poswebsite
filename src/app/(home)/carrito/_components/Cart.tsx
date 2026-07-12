"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  decreaseQuantity,
  deleteProduct,
  increaseQuantity,
} from "@/redux/shoppingSlice";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { AiOutlineClose } from "react-icons/ai";
import CheckOutForm from "./CheckOutForm";
import { useRouter } from "next/navigation";
import BreadCrumbs from "@/components/layouts/BreadCrumbs";

const Cart = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [stockCache, setStockCache] = useState<Record<string, number>>({});
  const [loadingStock, setLoadingStock] = useState<Set<string>>(new Set());
  const [stockError, setStockError] = useState<Record<string, string>>({});

  const breadCrumbs = [
    {
      name: "Tienda",
      url: "/tienda",
    },
    {
      name: `carrito`,
      url: `/carrito`,
    },
  ];
  const { productsData } = useSelector((state: any) => state?.compras);

  useEffect(() => {
    if (productsData?.length <= 0) {
      router.replace("/tienda");
    }
    // eslint-disable-next-line
  }, [productsData]);

  // Fetch stock for a variation
  const fetchVariationStock = async (variationId: string) => {
    // Return cached value if available
    if (stockCache[variationId] !== undefined) {
      return stockCache[variationId];
    }

    try {
      setLoadingStock((prev) => {
        const updated = new Set(prev);
        updated.add(variationId);
        return updated;
      });
      const res = await fetch(
        `/api/inventory/variation-stock?variationId=${variationId}`,
      );

      if (!res.ok) throw new Error("Failed to fetch stock");

      const data = await res.json();
      const total = data.totalStock || 0;

      setStockCache((prev) => ({ ...prev, [variationId]: total }));
      setStockError((prev) => {
        const updated = { ...prev };
        delete updated[variationId];
        return updated;
      });

      return total;
    } catch (error) {
      console.error("Error fetching stock:", error);
      setStockError((prev) => ({
        ...prev,
        [variationId]: "No se pudo verificar el stock",
      }));
      return 0;
    } finally {
      setLoadingStock((prev) => {
        const updated = new Set(prev);
        updated.delete(variationId);
        return updated;
      });
    }
  };

  const handleIncreaseQuantity = async (cartItem: any) => {
    const variationId = cartItem._id;
    const availableStock = await fetchVariationStock(variationId);
    const existingProduct = productsData.find(
      (item: any) => item._id === variationId,
    );

    if (existingProduct && availableStock > existingProduct.quantity) {
      dispatch(increaseQuantity(cartItem));
      // Clear error if user successfully increases
      setStockError((prev) => {
        const updated = { ...prev };
        delete updated[variationId];
        return updated;
      });
    } else if (!existingProduct || existingProduct.quantity >= availableStock) {
      setStockError((prev) => ({
        ...prev,
        [variationId]: `Stock máximo disponible: ${availableStock}`,
      }));
    }
  };

  return (
    <>
      {productsData?.length > 0 && (
        <section className="pb-10">
          <div className="container max-w-screen-xl mx-auto bg-background p-5">
            <div className="flex flex-col md:flex-row gap-4">
              <main className="md:w-3/4">
                {/* Items */}
                <article className="border border-muted  shadow-sm rounded mb-5 p-3 lg:p-5">
                  {productsData?.map((cartItem: any, index: number) => (
                    <div key={index}>
                      <div className="flex flex-wrap lg:flex-row gap-5  mb-4 items-center">
                        <div className="w-full lg:w-2/5 xl:w-2/4">
                          <figure className="flex gap-3 leading-5 text-xs">
                            <div>
                              <div className="block w-16 h-16 rounded border border-muted overflow-hidden">
                                <Image
                                  src={cartItem?.image[0].url}
                                  alt="Title"
                                  width={100}
                                  height={100}
                                />
                              </div>
                            </div>
                            <figcaption className="ml-3">
                              <p>{cartItem?.title}</p>
                              <p className="mt-1 text-gray-400  text-[12px]">
                                {" "}
                                Cert: {cartItem?.brand}
                              </p>
                            </figcaption>
                            <div>{cartItem.color}</div>
                            <div>{cartItem.size}</div>
                          </figure>
                        </div>
                        <div className="w-24">
                          <div className="flex items-center text-lg text-foreground  w-20 justify-between">
                            <span
                              onClick={() =>
                                dispatch(decreaseQuantity(cartItem))
                              }
                              className="cursor-pointer hover:text-muted-foreground transition-colors"
                            >
                              <FiChevronLeft />
                            </span>
                            <span className="text-xs">
                              {cartItem?.quantity}
                            </span>
                            <span
                              onClick={() => handleIncreaseQuantity(cartItem)}
                              className={`cursor-pointer transition-colors ${
                                loadingStock.has(cartItem._id)
                                  ? "opacity-50 cursor-not-allowed"
                                  : "hover:text-muted-foreground"
                              }`}
                            >
                              {loadingStock.has(cartItem._id) ? (
                                <span className="animate-spin">⟳</span>
                              ) : (
                                <FiChevronRight />
                              )}
                            </span>
                          </div>
                          {/* Stock Error Message */}
                          {stockError[cartItem._id] && (
                            <p className="text-xs text-red-600 mt-2">
                              ⚠️ {stockError[cartItem._id]}
                            </p>
                          )}
                        </div>
                        <div>
                          <div className="leading-5">
                            <p className="font-semibold not-italic">
                              $
                              {(cartItem?.price * cartItem?.quantity).toFixed(
                                2,
                              )}
                            </p>
                            <small className="text-gray-400">
                              {" "}
                              ${cartItem?.price.toFixed(2)} / por articulo{" "}
                            </small>
                          </div>
                        </div>
                        <div className="flex-auto">
                          <div className="float-right">
                            <span
                              onClick={() =>
                                dispatch(deleteProduct(cartItem?._id))
                              }
                              className="text-lg hover:text-red-600 cursor-pointer duration-300"
                            >
                              <AiOutlineClose />
                            </span>
                          </div>
                        </div>
                      </div>

                      <hr className="my-4" />
                    </div>
                  ))}
                </article>
              </main>
              <aside className="md:w-1/4">
                <article className="border border-muted bg-background shadow-sm rounded mb-5 p-1">
                  <CheckOutForm />
                </article>
              </aside>
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default Cart;
