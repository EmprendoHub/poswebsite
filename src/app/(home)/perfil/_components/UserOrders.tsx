"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { formatDate, formatTime } from "@/backend/helpers";
import { resetCart } from "@/redux/shoppingSlice";
import { FaEye } from "react-icons/fa";
import { getTotalFromItems } from "@/backend/helpers";
import OrderSearch from "./OrderSearch";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";

const UserOrders = ({
  orders,
  filteredOrdersCount,
}: {
  orders: any;
  filteredOrdersCount: any;
}) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const params = useSearchParams();

  const orderSuccess = params.get("pedido_exitoso");

  useEffect(() => {
    if (orderSuccess === "true") {
      dispatch(resetCart());
      router.replace("/perfil/pedidos");
    }
    // eslint-disable-next-line
  }, [orderSuccess]);

  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-xl">
      <div className=" ml-4 flex flex-row gap-2 maxmd:flex-col-reverse maxmd:items-start justify-between items-center">
        <h1 className="text-xl w-full maxsm:text-xl maxsm:ml-0 font-bold font-EB_Garamond">
          {filteredOrdersCount} Pedidos
        </h1>
        <OrderSearch />
      </div>
      <table className="w-full text-sm text-left">
        <thead className="text-l text-gray-700 uppercase">
          <tr>
            <th scope="col" className="px-6 maxsm:px-1 py-2">
              No.
            </th>
            <th scope="col" className="px-6 maxsm:px-1 maxsm:hidden py-2">
              Total
            </th>
            <th scope="col" className="px-6 maxsm:px-1 py-2">
              Pagado
            </th>
            <th scope="col" className="px-6 maxsm:px-1 py-2">
              Estado
            </th>

            <th scope="col" className="px-6 maxsm:px-1 py-2  maxsm:hidden">
              Fecha
            </th>
            <th scope="col" className="px-6 maxsm:px-1 py-2 text-center">
              ...
            </th>
          </tr>
        </thead>
        <tbody>
          {orders?.map((order: any, index: number) => (
            <tr className="bg-background" key={index}>
              <td className="px-6 maxsm:px-1 py-2">
                {" "}
                <Link
                  href={`/perfil/pedido/${order._id}`}
                  className="cursor-pointer "
                >
                  {order.orderId}
                </Link>
              </td>
              <td className="px-6 maxsm:px-1 py-2 maxsm:hidden">
                ${getTotalFromItems(order.orderItems)}
              </td>
              <td className="px-6 maxsm:px-1 py-2 ">
                <b>${order.paymentInfo.amountPaid}</b>
              </td>
              <td
                className={`px-6 maxsm:px-1 py-2 font-bold ${
                  order.orderStatus === "Apartado"
                    ? "text-amber-700"
                    : order.orderStatus === "En Camino"
                    ? "text-blue-700"
                    : order.orderStatus === "Entregado"
                    ? "text-green-700"
                    : "text-muted"
                }`}
              >
                {order.orderStatus}
              </td>
              <td className="px-6 maxsm:px-1 py-2  maxsm:hidden">
                {" "}
                <p>
                  {order?.createdAt &&
                    `${formatDate(
                      order?.createdAt.substring(0, 24)
                    )} a las ${formatTime(order?.createdAt)}`}
                </p>
              </td>

              <td className="px-6 maxsm:px-1 py-2">
                <div>
                  <Link
                    href={`/perfil/pedido/${order._id}`}
                    className="px-2 py-2 inline-block text-white hover:text-foreground bg-black shadow-sm border border-gray-200 rounded-xl hover:bg-background cursor-pointer mr-2"
                  >
                    <FaEye className="" />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserOrders;
