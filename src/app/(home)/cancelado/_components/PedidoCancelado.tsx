"use client";
import React, { useEffect } from "react";
import { addToCart } from "@/redux/shoppingSlice";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";

const PedidoCancelado = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const { orderData } = useSelector((state: any) => state?.compras);
  useEffect(() => {
    orderData.order.forEach((product: any) => {
      const productWithShipping = {
        ...product,
        weight: product.weight || 0.5,
        length: product.dimensions?.length || product.length || 15,
        width: product.dimensions?.width || product.width || 15,
        height: product.dimensions?.height || product.height || 10,
      };
      dispatch(addToCart(productWithShipping));
    });
    router.replace("/carrito");
    // eslint-disable-next-line
  }, [orderData]);
  return <div className="text-black"></div>;
};

export default PedidoCancelado;
