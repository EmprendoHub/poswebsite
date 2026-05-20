"use client";
import { formatDate, formatTime, getTotalFromItems } from "@/backend/helpers";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import Link from "next/link";
import { Key, useState } from "react";
import { FaEye } from "react-icons/fa6";
import { TfiMoney } from "react-icons/tfi";
import Modal from "@/components/modals/Modal";

export interface OrderProps {
  _id: string;
  orderId: string | number | bigint;
  customerName: string | null | undefined;
  orderItems: any;
  paymentInfo: { amountPaid: number };
  orderStatus: string | number | boolean | null | undefined;
  branch: string | null | undefined;
  createdAt: string;
}

const AdminUserOrders = ({
  orders,
  filteredOrdersCount,
  client,
}: {
  orders: any;
  filteredOrdersCount: any;
  client: any;
}) => {
  const [showModal, setShowModal] = useState(false);
  const [usedOrderId, setUsedOrderId] = useState("");
  const updateOrderStatus = async (orderId: string) => {
    setUsedOrderId(orderId);
    setShowModal(true);
  };
  return (
    <>
      <Modal
        showModal={showModal}
        setShowModal={setShowModal}
        orderId={usedOrderId}
        pathname={""}
        isPaid={false}
        pendingTotal={0}
      />
      <div className="pl-3 relative overflow-x-auto shadow-md sm:rounded-xl">
        <h1 className="text-3xl my-5 ml-4 font-bold font-EB_Garamond">
          {`${filteredOrdersCount}
        Pedidos para ${client.name}`}
        </h1>
        <p>{client?.email}</p>
        <p>{client?.phone}</p>
        <table className="w-full text-sm text-left">
          <thead className="text-l text-gray-700 uppercase">
            <tr>
              <th scope="col" className="px-6 maxsm:px-1 py-3">
                No.
              </th>
              <th scope="col" className="px-6 maxsm:px-1 py-3">
                Cliente
              </th>
              <th scope="col" className="px-6 maxsm:px-1 maxsm:hidden py-3">
                Total
              </th>
              <th scope="col" className="px-6 maxsm:px-1 py-3">
                Pagado
              </th>
              <th scope="col" className="px-6 maxsm:px-1 py-3">
                Estado
              </th>
              <th scope="col" className="px-6 maxsm:px-0 py-3">
                Ubicación
              </th>
              <th scope="col" className="px-6 maxsm:px-1  maxsm:hidden py-3">
                Fecha
              </th>
              <th scope="col" className="px-2 maxsm:px-1 py-3 text-center">
                ...
              </th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((order: OrderProps, index: Key | null | undefined) => (
              <tr className="bg-background" key={index}>
                <td className="px-6 maxsm:px-1 py-2">
                  <Link
                    href={`/admin/pedido/${order._id}`}
                    className="px-2 py-2 inline-block text-foreground shadow-sm border border-gray-200 rounded-xl bg-background cursor-pointer mr-2"
                  >
                    {order?.orderId}
                  </Link>
                </td>
                <td className="px-6 maxsm:px-1 py-2">{order?.customerName}</td>
                <td className="px-6 maxsm:px-1  maxsm:hidden py-2">
                  <FormattedPrice
                    amount={getTotalFromItems(order.orderItems)}
                  />
                </td>
                <td className="px-6 maxsm:px-1 py-2 ">
                  <b>
                    <FormattedPrice amount={order?.paymentInfo?.amountPaid} />
                  </b>
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
                <td
                  className={`px-6 maxsm:px-0 py-2 font-bold ${
                    order.branch === "Sucursal"
                      ? "text-amber-700"
                      : "text-muted"
                  }`}
                >
                  {order.branch}
                </td>
                <td className="px-6 maxsm:px-1  maxsm:hidden py-2">
                  {order?.createdAt &&
                    `${formatDate(
                      order?.createdAt.substring(0, 24)
                    )} a las ${formatTime(order?.createdAt)}`}
                </td>
                <td className="px-2 maxsm:px-1 py-2">
                  <div className="flex items-center">
                    <Link
                      href={`/admin/pedido/${order._id}`}
                      className="px-2 py-2 inline-block text-white hover:text-foreground bg-black shadow-sm border border-gray-200 rounded-xl hover:bg-background cursor-pointer mr-2"
                    >
                      <FaEye className="" />
                    </Link>
                    {order?.paymentInfo?.amountPaid >=
                      getTotalFromItems(order.orderItems) ===
                    true ? (
                      ""
                    ) : (
                      <button
                        onClick={() => updateOrderStatus(order._id)}
                        className={`px-2 py-2 inline-block text-foreground hover:text-foreground ${
                          order?.paymentInfo?.amountPaid >=
                            getTotalFromItems(order.orderItems) ===
                          true
                            ? ""
                            : "bg-emerald-700"
                        }  shadow-sm border border-gray-200 rounded-xl hover:scale-110 cursor-pointer mr-2 duration-200 ease-in-out`}
                      >
                        {order?.paymentInfo?.amountPaid >=
                          getTotalFromItems(order.orderItems) ===
                        true ? (
                          ""
                        ) : (
                          <TfiMoney className="text-white" />
                        )}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default AdminUserOrders;
