"use client";
import Link from "next/link";
import { FaEye, FaPlus } from "react-icons/fa";
import { formatSpanishDate } from "@/backend/helpers";
import { getTotalFromItems } from "@/backend/helpers";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import AdminOrderSearch from "./AdminOrderSearch";
import { TfiMoney } from "react-icons/tfi";
import { Key, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Modal from "@/components/modals/Modal";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import SuccessModal from "@/components/modals/SuccessModal";
import { FaPrint, FaX } from "react-icons/fa6";
import { usePathname, useSearchParams } from "next/navigation";
import { FaTrash } from "react-icons/fa";
import { deleteOrder } from "@/app/_actions";
import { useRouter } from "next/navigation";
import CreateOrderModal from "./CreateOrderModal";

const ORDER_STATUS_OPTIONS = [
  "Pendiente",
  "Procesando",
  "Apartado",
  "Listo para recoger",
  "En Camino",
  "Entregado",
  "Cancelado",
];

const AdminOrders = ({
  orders,
  filteredOrdersCount,
  branchOptions,
}: {
  orders: any;
  filteredOrdersCount: any;
  branchOptions?: { value: string; label: string }[];
}) => {
  const getPathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [deleteAction, setDeleteAction] = useState<"cancel" | "delete" | null>(
    null,
  );
  const [orderToDelete, setOrderToDelete] = useState<{
    id: string;
    number: string;
  } | null>(null);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("orderStatus") ?? "",
  );
  const [branchFilter, setBranchFilter] = useState(
    searchParams.get("branch") ?? "",
  );

  const applyFilters = (nextStatus: string, nextBranch: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (nextStatus) {
      params.set("orderStatus", nextStatus);
    } else {
      params.delete("orderStatus");
    }
    if (nextBranch) {
      params.set("branch", nextBranch);
    } else {
      params.delete("branch");
    }
    router.push(`/${pathname}/pedidos?${params.toString()}`);
  };

  useEffect(() => {
    const loadStores = async () => {
      try {
        const res = await fetch("/api/stores");
        const data = await res.json();
        // Bodega branches are storage-only and can't fulfill customer pickups
        setStores(
          Array.isArray(data)
            ? data.filter((s: any) => s.type === "fisica")
            : [],
        );
      } catch (error) {
        console.error("Error loading stores:", error);
      }
    };
    loadStores();
  }, []);

  const updateOrderStatus = async (order: any) => {
    const calcPending =
      getTotalFromItems(order.orderItems) - order?.paymentInfo?.amountPaid;
    setPendingTotal(calcPending);
    setUsedOrderId(order._id);
    setShowModal(true);
  };

  const openDeleteModal = (orderId: string, orderNumber: string) => {
    setOrderToDelete({ id: orderId, number: orderNumber });
    setDeleteAction(null);
    setShowDeleteModal(true);
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete || !deleteAction) return;

    setDeleting(true);
    try {
      const result = await deleteOrder(orderToDelete.id, deleteAction);
      if (result.success) {
        setShowDeleteModal(false);
        const actionText =
          deleteAction === "cancel" ? "cancelado" : "eliminado";
        setSuccessMessage(
          `El pedido #${orderToDelete.number} ha sido ${actionText} exitosamente.`,
        );
        setShowSuccessModal(true);
        router.refresh();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Error al procesar el pedido");
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

      {/* Custom Delete/Cancel Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Procesar Pedido
            </h2>
            <p className="text-gray-700 mb-6">
              ¿Qué deseas hacer con el pedido #{orderToDelete?.number}?
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setDeleteAction("cancel");
                  handleDeleteOrder();
                }}
                disabled={deleting}
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {deleting ? "Procesando..." : "Marcar como Cancelado"}
              </button>
              <button
                onClick={() => {
                  setDeleteAction("delete");
                  handleDeleteOrder();
                }}
                disabled={deleting}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {deleting ? "Procesando..." : "Eliminar Permanentemente"}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteAction(null);
                }}
                disabled={deleting}
                className="w-full bg-gray-300 hover:bg-gray-400 disabled:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessModal
        showModal={showSuccessModal}
        setShowModal={setShowSuccessModal}
        title="Pedido Eliminado"
        message={successMessage}
        buttonText="Aceptar"
        autoClose={true}
        autoCloseDelay={3000}
      />
      <CreateOrderModal
        isOpen={showCreateOrderModal}
        onClose={() => setShowCreateOrderModal(false)}
        onOrderCreated={() => router.refresh()}
        stores={stores}
      />
      <div className="pl-5 maxsm:pl-3 relative overflow-x-auto shadow-md maxsm:rounded-xl">
        <div className=" flex flex-row maxsm:flex-col maxsm:items-start items-center justify-center">
          <h1 className="text-3xl w-full maxsm:text-xl my-5 maxsm:my-1 ml-4 maxsm:ml-0 font-bold font-EB_Garamond">
            {`${filteredOrdersCount} Pedidos `}
          </h1>
          <div className="flex gap-2 mr-5 maxsm:mr-0 maxsm:mb-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                applyFilters(e.target.value, branchFilter);
              }}
              className="border border-gray-200 bg-background rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-gray-400"
            >
              <option value="">Todos los estados</option>
              {ORDER_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                applyFilters(statusFilter, e.target.value);
              }}
              className="border border-gray-200 bg-background rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-gray-400"
            >
              <option value="">Todas las sucursales</option>
              {branchOptions?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowCreateOrderModal(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-[10px] font-semibold transition"
            >
              <FaPlus size={16} /> Nuevo
            </button>
            <AdminOrderSearch />
          </div>
        </div>
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
                          : order.orderStatus === "Cancelado"
                            ? "text-red-700"
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
                    {/* <Link
                      href={`/admin/recibo/${order._id}`}
                      className="px-2 py-2 inline-block text-white hover:text-foreground bg-black shadow-sm border border-gray-200 rounded-xl hover:bg-background cursor-pointer mr-2"
                    >
                      <FaPrint className="" />
                    </Link> */}
                    {order?.paymentInfo?.amountPaid >=
                      getTotalFromItems(order.orderItems) ===
                    true || order.orderStatus === "Cancelado" ? (
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

                    {order.orderStatus === "Cancelado" ? (
                      <span className="px-2 py-2 inline-block text-white bg-red-600 shadow-sm border border-gray-200 rounded-xl cursor-not-allowed mr-2">
                        <FaX />
                      </span>
                    ) : (
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
                    )}
                  </div>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </>
  );
};

export default AdminOrders;
