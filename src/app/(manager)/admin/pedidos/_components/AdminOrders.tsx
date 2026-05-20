"use client";
import Link from "next/link";
import { FaEye } from "react-icons/fa";
import { formatSpanishDate } from "@/backend/helpers";
import { getTotalFromItems } from "@/backend/helpers";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import AdminOrderSearch from "./AdminOrderSearch";
import { TfiMoney } from "react-icons/tfi";
import { Key, useState } from "react";
import { useSession } from "next-auth/react";
import Modal from "@/components/modals/Modal";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import SuccessModal from "@/components/modals/SuccessModal";
import { FaPrint } from "react-icons/fa6";
import { usePathname } from "next/navigation";
import { FaTrash } from "react-icons/fa";
import { deleteOrder } from "@/app/_actions";
import { useRouter } from "next/navigation";

const AdminOrders = ({
  orders,
  filteredOrdersCount,
}: {
  orders: any;
  filteredOrdersCount: any;
}) => {
  const getPathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.role === "super_admin";
  let pathname: string = "";
  if (getPathname.includes("admin")) {
    pathname = "admin";
  } else if (getPathname.includes("puntodeventa")) {
    pathname = "puntodeventa";
  } else if (getPathname.includes("instagram")) {
    pathname = "instagram";
  }

  const [showModal, setShowModal] = useState(false);
  const [usedOrderId, setUsedOrderId] = useState("");
  const [pendingTotal, setPendingTotal] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [orderToDelete, setOrderToDelete] = useState<{
    id: string;
    number: string;
  } | null>(null);

  const updateOrderStatus = async (order: any) => {
    const calcPending =
      getTotalFromItems(order.orderItems) - order?.paymentInfo?.amountPaid;
    setPendingTotal(calcPending);
    setUsedOrderId(order._id);
    setShowModal(true);
  };

  const openDeleteModal = (orderId: string, orderNumber: string) => {
    setOrderToDelete({ id: orderId, number: orderNumber });
    setShowDeleteModal(true);
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;

    setDeleting(true);
    try {
      const result = await deleteOrder(orderToDelete.id);
      if (result.success) {
        setShowDeleteModal(false);
        setSuccessMessage(
          `El pedido #${orderToDelete.number} ha sido eliminado exitosamente.`,
        );
        setShowSuccessModal(true);
        router.refresh();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Error al eliminar el pedido");
    } finally {
      setDeleting(false);
      setOrderToDelete(null);
    }
  };
  return (
    <>
      <Modal
        showModal={showModal}
        setShowModal={setShowModal}
        orderId={usedOrderId}
        pathname={pathname}
        pendingTotal={pendingTotal}
        isPaid={false}
      />
      <DeleteConfirmationModal
        showModal={showDeleteModal}
        setShowModal={setShowDeleteModal}
        onConfirm={handleDeleteOrder}
        title="Eliminar Pedido"
        message={`¿Estás seguro de que deseas eliminar el pedido #${orderToDelete?.number}? Esta acción no se puede deshacer y toda la información del pedido se perderá permanentemente.`}
        confirmText="Sí, eliminar"
        cancelText="No, cancelar"
        isDeleting={deleting}
      />
      <SuccessModal
        showModal={showSuccessModal}
        setShowModal={setShowSuccessModal}
        title="Pedido Eliminado"
        message={successMessage}
        buttonText="Aceptar"
        autoClose={true}
        autoCloseDelay={3000}
      />
      <div className="pl-5 maxsm:pl-3 relative overflow-x-auto shadow-md maxsm:rounded-xl">
        <div className=" flex flex-row maxsm:flex-col maxsm:items-start items-center justify-between">
          <h1 className="text-3xl w-full maxsm:text-xl my-5 maxsm:my-1 ml-4 maxsm:ml-0 font-bold font-EB_Garamond">
            {`${filteredOrdersCount} Pedidos `}
          </h1>
          <AdminOrderSearch />
        </div>
        <table className="w-full text-sm maxmd:text-xs text-left">
          <thead className=" text-gray-700 uppercase">
            <tr>
              <th scope="col" className="px-2 maxsm:px-1 py-3">
                No.
              </th>
              <th scope="col" className="px-2 py-3 maxmd:hidden">
                Cliente
              </th>
              <th scope="col" className="px-2 py-3 maxmd:hidden">
                Tel
              </th>
              <th scope="col" className="px-2 maxsm:px-0 py-3">
                Recibió
              </th>
              <th scope="col" className="px-2 maxsm:px-0 py-3">
                Estado
              </th>
              <th scope="col" className="px-2 maxsm:px-0 py-3">
                Ubic.
              </th>
              <th scope="col" className="px-2 py-3 maxsm:hidden">
                Fecha
              </th>
              <th scope="col" className="w-5 px-1 py-3 text-center">
                ...
              </th>
            </tr>
          </thead>
          <tbody>
            {orders?.map(
              (
                order: {
                  _id: any;
                  orderId: string;
                  customerName: string;
                  phone: string | number;
                  paymentInfo: { amountPaid: number };
                  orderStatus: string | number | boolean;
                  branch: string;
                  createdAt: any;
                  orderItems: any;
                },
                index: Key | null | undefined,
              ) => (
                <tr className="bg-background" key={index}>
                  <td className="px-2 maxsm:px-2 py-2">
                    <Link key={index} href={`/admin/pedido/${order._id}`}>
                      {order.orderId}
                    </Link>
                  </td>
                  <td className="px-2 py-2 maxmd:hidden">
                    {order?.customerName}
                  </td>
                  <td className="px-2 py-2 maxmd:hidden">{order?.phone}</td>
                  <td className="px-2 maxsm:px-0 py-2 ">
                    <b>
                      <FormattedPrice amount={order?.paymentInfo?.amountPaid} />
                    </b>
                  </td>
                  <td
                    className={`px-2 maxsm:px-0 py-2 font-bold ${
                      order.orderStatus === "Apartado"
                        ? "text-amber-700"
                        : order.orderStatus === "En Camino"
                          ? "text-blue-700"
                          : order.orderStatus === "Entregado"
                            ? "text-green-700"
                            : order.orderStatus === "Pagado"
                              ? "text-green-800"
                              : "text-muted"
                    }`}
                  >
                    {order.orderStatus}
                  </td>
                  <td
                    className={`px-2 maxsm:px-0 py-2 font-bold ${
                      order.branch &&
                      order.branch !== "Web" &&
                      order.branch !== "Instagram"
                        ? "text-amber-700"
                        : "text-muted"
                    }`}
                  >
                    {order.branch ?? "—"}
                  </td>
                  <td className="px-2 py-2 maxsm:hidden">
                    {order?.createdAt && formatSpanishDate(order?.createdAt)}
                  </td>
                  <td className="px-1 py-2">
                    <div className="flex items-center">
                      <Link
                        href={`/admin/pedido/${order._id}`}
                        className="px-2 py-2 inline-block text-white hover:text-foreground bg-black shadow-sm border border-gray-200 rounded-xl hover:bg-background cursor-pointer mr-2"
                      >
                        <FaEye className="" />
                      </Link>
                      <Link
                        href={`/admin/recibo/${order._id}`}
                        className="px-2 py-2 inline-block text-white hover:text-foreground bg-black shadow-sm border border-gray-200 rounded-xl hover:bg-background cursor-pointer mr-2"
                      >
                        <FaPrint className="" />
                      </Link>
                      {order?.paymentInfo?.amountPaid >=
                        getTotalFromItems(order.orderItems) ===
                      true ? (
                        ""
                      ) : (
                        <button
                          onClick={() => updateOrderStatus(order)}
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
                      <button
                        onClick={() =>
                          openDeleteModal(order._id, order.orderId)
                        }
                        disabled={deleting || !isSuperAdmin}
                        className="px-2 py-2 inline-block text-white hover:text-foreground bg-red-600 shadow-sm border border-gray-200 rounded-xl hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title={
                          !isSuperAdmin
                            ? "Solo super_admin puede eliminar pedidos"
                            : "Eliminar pedido"
                        }
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default AdminOrders;
