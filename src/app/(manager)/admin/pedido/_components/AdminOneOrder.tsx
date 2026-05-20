"use client";
import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import { formatDate, formatSpanishDate } from "@/backend/helpers";
import { FaComment } from "react-icons/fa6";
import ModalOrderUpdate from "@/components/modals/ModalOrderUpdate";
import { FaCloudUploadAlt, FaEnvelope, FaPencilAlt } from "react-icons/fa";
import { FaMoneyBillWave } from "react-icons/fa";
import { toast } from "sonner";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import { updateOrder } from "@/app/_actions";
import { useSession } from "next-auth/react";
import { buildItemRefundEmailHtml } from "@/lib/emailTemplates";

const AdminOneOrder = ({
  order,
  deliveryAddress,
  id,
  orderPayments,
  customer,
  currentCookies,
}: {
  order?: any;
  deliveryAddress?: any;
  id: any;
  orderPayments?: any;
  customer?: any;
  currentCookies: any;
}) => {
  const { data: session } = useSession();
  const isManager = (session?.user as any)?.role === "manager";

  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  // ── Replace item state ────────────────────────────────────────────────────
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<any | null>(null);
  const [savingReplacement, setSavingReplacement] = useState(false);

  // ── Refund state ──────────────────────────────────────────────────────────
  const [pendingRefund, setPendingRefund] = useState<{
    itemIndex: number;
    amount: number;
  } | null>(null);
  const [refundNote, setRefundNote] = useState("");
  const [processingRefund, setProcessingRefund] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>(order?.orderItems ?? []);

  // ── Item refund modal state ───────────────────────────────────────────────
  const [itemRefundModal, setItemRefundModal] = useState<{
    itemIndex: number;
    item: any;
    itemTotal: number;
    shippingShare: number;
    refundTotal: number;
  } | null>(null);
  const [processingItemRefund, setProcessingItemRefund] = useState(false);

  const [currentOrderStatus, setCurrentOrderStatus] = useState(
    order?.orderStatus,
  );

  function getQuantities(orderItems: any[]) {
    // Use reduce to sum up the 'quantity' fields
    const totalQuantity = orderItems?.reduce(
      (sum: any, obj: { quantity: any }) => sum + obj.quantity,
      0,
    );
    return totalQuantity;
  }

  function getTotal(orderItems: any[]) {
    // Use reduce to sum up the 'total' field
    const totalAmount = orderItems?.reduce(
      (acc, cartItem) => acc + cartItem.quantity * cartItem.price,
      0,
    );
    return totalAmount;
  }

  function getPendingTotal(orderItems: any[], orderAmountPaid: number) {
    // Use reduce to sum up the 'total' field
    const totalAmount = orderItems?.reduce(
      (acc, cartItem) => acc + cartItem.quantity * cartItem.price,
      0,
    );
    const pendingAmount = totalAmount - orderAmountPaid;
    return pendingAmount;
  }

  function subtotal() {
    let sub = order?.paymentInfo?.amountPaid - order?.ship_cost;
    return sub;
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (order?.orderStatus === currentOrderStatus) {
      toast("No hubo ningún cambio");
      return;
    }

    try {
      const formData = new FormData();
      formData.set("orderStatus", currentOrderStatus);
      formData.set("_id", id);

      try {
        const res: any = await updateOrder(formData);

        if (res.ok) {
          const data = await res.json();
          toast("El pedido se actualizo exitosamente");
          setCurrentOrderStatus(data.payload.orderStatus);

          return;
        }
      } catch (error) {
        toast("Error actualizando pedido. Por favor Intenta de nuevo.");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const resendAdminEmail = async () => {
    setResending(true);
    try {
      const res = await fetch("/api/orders/resend-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id }),
      });
      if (res.ok) {
        toast("Email reenviado exitosamente al administrador");
      } else {
        toast("Error al reenviar el email");
      }
    } catch {
      toast("Error al reenviar el email");
    } finally {
      setResending(false);
    }
  };

  const searchProducts = async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/products?keyword=${encodeURIComponent(q)}&perpage=10`,
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data?.products?.products ?? []);
      }
    } catch {
      toast("Error buscando productos");
    } finally {
      setSearching(false);
    }
  };

  const confirmReplacement = async () => {
    if (editingIndex === null || !selectedProduct || !selectedVariation) return;
    setSavingReplacement(true);
    try {
      const res = await fetch("/api/orders/replace-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: id,
          itemIndex: editingIndex,
          newProductId: selectedProduct._id,
          newVariationId: selectedVariation._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Error al reemplazar");
        return;
      }

      // Update local items list
      const updated = [...orderItems];
      updated[editingIndex] = data.updatedItem;
      setOrderItems(updated);

      toast("Producto reemplazado exitosamente");

      if (data.refundAmount > 0) {
        setPendingRefund({
          itemIndex: editingIndex,
          amount: data.refundAmount,
        });
        toast(
          `Hay un reembolso pendiente de $${data.refundAmount.toFixed(2)} MXN`,
        );
      }

      // Reset edit state
      setEditingIndex(null);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedProduct(null);
      setSelectedVariation(null);
    } catch {
      toast("Error al reemplazar producto");
    } finally {
      setSavingReplacement(false);
    }
  };

  const processRefund = async () => {
    if (!pendingRefund) return;
    setProcessingRefund(true);
    try {
      const res = await fetch("/api/orders/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: id,
          refundAmount: pendingRefund.amount,
          note:
            refundNote ||
            `Reembolso por cambio de producto en artículo #${pendingRefund.itemIndex + 1}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Error al procesar reembolso");
        return;
      }
      toast(
        `Reembolso de $${pendingRefund.amount.toFixed(2)} MXN procesado exitosamente`,
      );
      setPendingRefund(null);
      setRefundNote("");
    } catch {
      toast("Error al procesar reembolso");
    } finally {
      setProcessingRefund(false);
    }
  };

  const openItemRefundModal = (item: any, index: number) => {
    const itemTotal = item.price * item.quantity;
    const orderSubtotal = orderItems.reduce(
      (sum: number, i: any) => sum + i.price * i.quantity,
      0,
    );
    const shippingShare =
      orderSubtotal > 0
        ? (itemTotal / orderSubtotal) * (order?.ship_cost || 0)
        : 0;
    const refundTotal = parseFloat((itemTotal + shippingShare).toFixed(2));
    setItemRefundModal({
      itemIndex: index,
      item,
      itemTotal,
      shippingShare,
      refundTotal,
    });
  };

  const confirmItemRefund = async () => {
    if (!itemRefundModal) return;
    setProcessingItemRefund(true);
    try {
      const res = await fetch("/api/orders/refund-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: id,
          itemIndex: itemRefundModal.itemIndex,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Error al procesar reembolso");
        return;
      }
      setOrderItems((prev) =>
        prev.filter((_: any, i: number) => i !== itemRefundModal.itemIndex),
      );
      toast(
        `Reembolso de $${itemRefundModal.refundTotal.toFixed(2)} MXN procesado exitosamente`,
      );
      setItemRefundModal(null);
    } catch {
      toast("Error al procesar reembolso");
    } finally {
      setProcessingItemRefund(false);
    }
  };

  return (
    <>
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <Image
              src={selectedImage}
              alt="Imagen del producto"
              width={800}
              height={800}
              className="object-contain max-h-[90vh] rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
      {/* ── Item refund confirmation modal ──────────────────────────────── */}
      {itemRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="bg-red-700 text-white px-6 py-4 rounded-t-xl flex items-center gap-3">
              <FaMoneyBillWave className="text-2xl shrink-0" />
              <div>
                <h2 className="text-lg font-bold leading-tight">
                  Confirmar Reembolso de Artículo
                </h2>
                <p className="text-sm opacity-80">
                  Esta acción procesará un reembolso en Stripe y no se puede
                  deshacer
                </p>
              </div>
              <button
                onClick={() =>
                  !processingItemRefund && setItemRefundModal(null)
                }
                className="ml-auto text-white/70 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-col md:flex-row gap-5 p-5 overflow-y-auto flex-1 min-h-0">
              {/* Left — breakdown */}
              <div className="md:w-2/5 flex flex-col gap-4 shrink-0">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted">
                  Artículo a Reembolsar
                </h3>
                <div className="flex items-start gap-3 border rounded-xl p-3">
                  {itemRefundModal.item.image && (
                    <Image
                      src={itemRefundModal.item.image}
                      alt={itemRefundModal.item.name}
                      width={72}
                      height={72}
                      className="rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-sm leading-snug">
                      {itemRefundModal.item.name}
                    </p>
                    {itemRefundModal.item.color && (
                      <p className="text-xs text-muted">
                        Color: {itemRefundModal.item.color}
                      </p>
                    )}
                    {itemRefundModal.item.size && (
                      <p className="text-xs text-muted">
                        Talla: {itemRefundModal.item.size}
                      </p>
                    )}
                    <p className="text-xs text-muted">
                      Cantidad: {itemRefundModal.item.quantity}
                    </p>
                  </div>
                </div>

                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted">
                  Desglose
                </h3>
                <div className="border rounded-xl overflow-hidden text-sm">
                  <div className="flex justify-between px-4 py-2.5 bg-muted/30">
                    <span className="text-muted">
                      Artículo (×{itemRefundModal.item.quantity})
                    </span>
                    <span className="font-medium">
                      ${itemRefundModal.itemTotal.toFixed(2)} MXN
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted">Envío proporcional</span>
                    <span className="font-medium">
                      ${itemRefundModal.shippingShare.toFixed(2)} MXN
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-3 bg-red-600 text-white border-t-2 border-red-800">
                    <span className="font-bold">Total a Reembolsar</span>
                    <span className="font-bold text-lg">
                      ${itemRefundModal.refundTotal.toFixed(2)} MXN
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-bold mb-1">⚠️ Esta acción:</p>
                  <ul className="ml-3 list-disc space-y-0.5">
                    <li>Procesará reembolso en Stripe</li>
                    <li>
                      Registrará un pago negativo con nota
                      &ldquo;Reembolso&rdquo;
                    </li>
                    <li>Devolverá el stock al inventario</li>
                    <li>Enviará email de notificación al cliente</li>
                  </ul>
                </div>
              </div>

              {/* Right — email preview */}
              <div className="flex-1 flex flex-col gap-2 min-h-0">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted shrink-0">
                  Vista Previa del Email al Cliente
                </h3>
                <iframe
                  srcDoc={buildItemRefundEmailHtml({
                    customerName: order?.customerName ?? "",
                    orderId: order?.orderId ?? order?._id ?? "",
                    item: itemRefundModal.item,
                    itemTotal: itemRefundModal.itemTotal,
                    shippingShare: itemRefundModal.shippingShare,
                    refundAmount: itemRefundModal.refundTotal,
                  })}
                  sandbox=""
                  title="Vista previa del email"
                  className="flex-1 w-full border rounded-xl min-h-[380px]"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-5 py-4 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setItemRefundModal(null)}
                disabled={processingItemRefund}
                className="px-5 py-2 border rounded-lg text-sm hover:bg-muted/20 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmItemRefund}
                disabled={processingItemRefund}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <FaMoneyBillWave />
                {processingItemRefund
                  ? "Procesando..."
                  : `Reembolsar $${itemRefundModal.refundTotal.toFixed(2)} MXN`}
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalOrderUpdate
        showModal={showModal}
        setShowModal={setShowModal}
        order={order}
      />
      <div className="pl-5 maxsm:pl-3 relative overflow-x-auto shadow-md maxsm:rounded-xl p-5 maxsm:p-1 ">
        <div className="flex flex-col items-start justify-start gap-x-5 ml-4">
          <Link href={`/admin/cliente/${customer?._id}`}>
            <h2 className="text-3xl font-bold ">{order?.customerName}</h2>
          </Link>
          <p className="text-muted">{customer?.email || customer?.phone}</p>
        </div>
        <div className="flex flex-row maxsm:flex-col items-start justify-start gap-x-5">
          <h2 className="text-3xl mb-4 ml-4 font-bold ">
            Pedido #{order?.orderId}
          </h2>
          <h2
            className={`text-3xl mb-8 ml-4 font-bold uppercase ${
              order?.orderStatus === "Apartado"
                ? "text-amber-700"
                : order?.paymentInfo?.status === "Pagado"
                  ? "text-green-700"
                  : "text-blue-500"
            }`}
          >
            {order?.orderStatus}
          </h2>
          <button
            onClick={resendAdminEmail}
            disabled={resending}
            title="Reenviar email al administrador"
            className="mb-8 ml-4 flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white text-sm font-medium rounded-sm px-4 py-2 cursor-pointer transition-colors"
          >
            <FaEnvelope />
            {resending ? "Enviando..." : "Reenviar email"}
          </button>
        </div>
        {order?.branch !== "Sucursal" ? (
          <table className="w-fit text-sm text-left flex flex-col maxsm:flex-row">
            <thead className="text-l text-gray-400 ">
              <tr className="flex flex-row maxsm:flex-col">
                <th scope="col" className="w-1/3 px-6 py-2">
                  Domicilio
                </th>
                <th scope="col" className="w-1/6 maxsm:w-full px-6 py-2">
                  Ciudad
                </th>
                <th scope="col" className="w-1/6 maxsm:w-full px-6 py-2">
                  Entidad
                </th>
                <th scope="col" className="w-1/6 maxsm:w-full px-6 py-2">
                  Código P.
                </th>
                <th scope="col" className="w-1/6 maxsm:w-full px-6 py-2">
                  Tel
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-background flex flex-row maxsm:flex-col">
                <td className="w-1/3 maxsm:w-full px-6 py-2">
                  {order?.shippingInfo.street || deliveryAddress?.street}{" "}
                </td>
                <td className="w-1/6 maxsm:w-full px-6 py-2">
                  {order?.shippingInfo.city || deliveryAddress?.city}
                </td>
                <td className="w-1/6 maxsm:w-full px-6 py-2">
                  {order?.shippingInfo.province || deliveryAddress?.province}
                </td>
                <td className="w-1/6 maxsm:w-full px-6 py-2">
                  {order?.shippingInfo.zip_code || deliveryAddress?.zip_code}
                </td>
                <td className="w-1/6 maxsm:w-full px-6 py-2">
                  {order?.shippingInfo.phone || deliveryAddress?.phone}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div className="w-full flex maxsm:flex-col gap-3 justify-between">
            <div className="flex items-center gap-1 tracking-wide text-muted">
              <FaComment size={20} />
              <em className="text-blue-800">{order?.comment}</em>
            </div>
            <div>
              <div
                onClick={() => setShowModal(true)}
                className="bg-black flex gap-1 items-center text-white rounded-sm px-6 py-2 cursor-pointer"
              >
                <FaCloudUploadAlt /> Actualizar
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="relative overflow-x-auto shadow-md sm:rounded-xl px-5">
        {/* Refund banner */}
        {pendingRefund && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-amber-50 border border-amber-300 rounded-lg p-4 my-3">
            <FaMoneyBillWave className="text-amber-600 text-2xl shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800">
                Reembolso pendiente:{" "}
                <span className="text-lg">
                  ${pendingRefund.amount.toFixed(2)} MXN
                </span>
              </p>
              <input
                type="text"
                placeholder="Nota del reembolso (opcional)"
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                className="mt-1 w-full border border-amber-300 rounded px-2 py-1 text-sm bg-white text-gray-800"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={processRefund}
                disabled={processingRefund}
                className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded px-4 py-2 transition-colors"
              >
                <FaMoneyBillWave />
                {processingRefund
                  ? "Procesando..."
                  : `Reembolsar $${pendingRefund.amount.toFixed(2)}`}
              </button>
              <button
                onClick={() => {
                  setPendingRefund(null);
                  setRefundNote("");
                }}
                className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <table className="w-fit maxsm:w-full text-sm text-left">
          <thead className="text-l text-gray-400 uppercase">
            <tr>
              <th scope="col" className="px-2 maxsm:px-0 py-3 min-w-24">
                Producto
              </th>
              <th
                scope="col"
                className="px-2 maxsm:px-0 py-3 min-w-10 text-center"
              >
                Img
              </th>
              <th scope="col" className="px-2 py-3 min-w-10 text-center">
                Cant.
              </th>
              <th scope="col" className="px-2 py-3 min-w-10 text-center">
                Precio
              </th>
              {isManager && (
                <th scope="col" className="px-2 py-3 min-w-10 text-center">
                  Editar
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {orderItems?.map((item: any, index: number) => (
              <React.Fragment key={index}>
                <tr className="bg-background">
                  <td className="px-2 maxsm:px-0 py-2 min-w-24 text-wrap">
                    {item.name}
                  </td>
                  <td className="px-2 maxsm:px-0 py-2 min-w-10 text-center">
                    <Image
                      alt="producto"
                      src={item.image}
                      width={100}
                      height={100}
                      className="cursor-zoom-in hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImage(item.image as string)}
                    />
                  </td>
                  <td className="px-2 maxsm:px-0 py-2 min-w-10 text-center">
                    {item.quantity}
                  </td>
                  <td className="px-2 maxsm:px-0 py-2 min-w-10 text-center">
                    <FormattedPrice amount={item.price || 0} />
                  </td>
                  {isManager && (
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          title="Reemplazar producto"
                          onClick={() => {
                            setEditingIndex(
                              editingIndex === index ? null : index,
                            );
                            setSearchQuery("");
                            setSearchResults([]);
                            setSelectedProduct(null);
                            setSelectedVariation(null);
                          }}
                          className="text-blue-500 hover:text-blue-700 p-1"
                        >
                          <FaPencilAlt />
                        </button>
                        <button
                          title="Reembolsar artículo"
                          onClick={() => openItemRefundModal(item, index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <FaMoneyBillWave />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>

                {/* Inline replace panel */}
                {isManager && editingIndex === index && (
                  <tr className="bg-background">
                    <td colSpan={5} className="px-2 py-3">
                      <div className="border border-dashed border-blue-400 rounded-lg p-3 flex flex-col gap-3">
                        <p className="text-xs text-muted font-semibold uppercase tracking-wide">
                          Reemplazar:{" "}
                          <em className="normal-case text-foreground">
                            {item.name}
                          </em>
                        </p>

                        {/* Search */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Buscar producto de reemplazo..."
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              searchProducts(e.target.value);
                            }}
                            className="flex-1 border rounded px-2 py-1 text-sm bg-background"
                          />
                          {searching && (
                            <span className="text-xs text-muted self-center">
                              Buscando...
                            </span>
                          )}
                        </div>

                        {/* Search results */}
                        {searchResults.length > 0 && !selectedProduct && (
                          <div className="max-h-48 overflow-y-auto flex flex-col gap-1 border rounded p-1">
                            {searchResults.map((p: any) => (
                              <button
                                key={p._id}
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setSearchResults([]);
                                }}
                                className="text-left text-sm px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900 rounded flex items-center gap-2"
                              >
                                {p.images?.[0]?.url && (
                                  <Image
                                    src={p.images[0].url}
                                    alt={p.title}
                                    width={32}
                                    height={32}
                                    className="rounded object-cover"
                                  />
                                )}
                                <span>{p.title}</span>
                                <span className="ml-auto text-green-700 font-medium">
                                  ${p.price} MXN
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Selected product → pick variation */}
                        {selectedProduct && (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              {selectedProduct.images?.[0]?.url && (
                                <Image
                                  src={selectedProduct.images[0].url}
                                  alt={selectedProduct.title}
                                  width={40}
                                  height={40}
                                  className="rounded object-cover"
                                />
                              )}
                              <span className="font-medium text-sm">
                                {selectedProduct.title}
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedProduct(null);
                                  setSelectedVariation(null);
                                }}
                                className="ml-auto text-xs text-gray-400 hover:text-gray-600"
                              >
                                ✕ Cambiar
                              </button>
                            </div>

                            <p className="text-xs text-muted">
                              Selecciona una variación:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {selectedProduct.variations?.map((v: any) => (
                                <button
                                  key={v._id}
                                  onClick={() => setSelectedVariation(v)}
                                  className={`text-xs border rounded px-2 py-1 transition-colors ${
                                    selectedVariation?._id === v._id
                                      ? "border-blue-500 bg-blue-500 text-white"
                                      : "border-gray-300 hover:border-blue-400"
                                  } ${v.stock <= 0 ? "opacity-40 cursor-not-allowed" : ""}`}
                                  disabled={v.stock <= 0}
                                >
                                  {v.title ||
                                    `${v.color ?? ""} ${v.size ?? ""}`.trim() ||
                                    "Default"}
                                  {" — "}${v.price} MXN
                                  {v.stock <= 0 && " (sin stock)"}
                                </button>
                              ))}
                            </div>

                            {selectedVariation && (
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm">
                                  Precio original:{" "}
                                  <strong>
                                    ${(item.price * item.quantity).toFixed(2)}
                                  </strong>
                                  {" → "}
                                  Nuevo:{" "}
                                  <strong
                                    className={
                                      selectedVariation.price * item.quantity <
                                      item.price * item.quantity
                                        ? "text-amber-600"
                                        : "text-green-600"
                                    }
                                  >
                                    $
                                    {(
                                      selectedVariation.price * item.quantity
                                    ).toFixed(2)}{" "}
                                    MXN
                                  </strong>
                                </span>
                                <button
                                  onClick={confirmReplacement}
                                  disabled={savingReplacement}
                                  className="ml-auto flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded px-3 py-1 transition-colors"
                                >
                                  {savingReplacement
                                    ? "Guardando..."
                                    : "Confirmar reemplazo"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="relative flex flex-row maxmd:flex-col-reverse items-start justify-start overflow-x-auto shadow-md p-5 maxmd:p-1 gap-12">
        <div className="w-1/3 maxmd:w-full">
          <div className=" max-w-screen-xl mx-auto bg-background flex flex-col p-2">
            <h2 className="text-2xl">Totales</h2>
            {order?.orderStatus === "Apartado" ? (
              <ul className="mb-5">
                <li className="flex justify-between gap-x-5 text-muted  mb-1">
                  <span>Total de Artículos:</span>
                  <span className="text-green-700 text-sm w-full text-end">
                    {getQuantities(order?.orderItems)} (Artículos)
                  </span>
                </li>
                <li className="flex justify-between gap-x-5 text-muted  mb-1">
                  <span>Sub-Total:</span>
                  <span>
                    <FormattedPrice amount={subtotal() || 0} />
                  </span>
                </li>

                <li className="flex justify-between gap-x-5 text-muted  mb-1">
                  <span>Total:</span>
                  <span>
                    <FormattedPrice amount={getTotal(order?.orderItems) || 0} />
                  </span>
                </li>
                <li className="text-xl font-bold border-t flex justify-between gap-x-5  pt-3">
                  <span>Abono:</span>
                  <span>
                    - <FormattedPrice amount={order?.paymentInfo?.amountPaid} />
                  </span>
                </li>

                <li className="text-xl text-amber-700 font-bold border-t flex justify-between gap-x-5  pt-1">
                  <span>Pendiente:</span>
                  <span>
                    <FormattedPrice
                      amount={
                        getPendingTotal(
                          order?.orderItems,
                          order?.paymentInfo?.amountPaid,
                        ) || 0
                      }
                    />
                  </span>
                </li>
              </ul>
            ) : (
              <ul className="mb-5">
                <li className="flex justify-between gap-x-5 text-muted  mb-1 text-sm ">
                  <span>Sub-Total:</span>
                  <span>
                    <FormattedPrice amount={subtotal() || 0} />
                  </span>
                </li>
                <li className="flex justify-between gap-x-5 text-muted text-sm mb-1">
                  <span>Cantidades:</span>
                  <span className="text-green-700 text-sm w-full text-end">
                    {getQuantities(order?.orderItems)} (Artículos)
                  </span>
                </li>
                <li className="flex justify-between gap-x-5 text-muted  mb-1">
                  <span>Envió:</span>
                  <span>
                    <FormattedPrice amount={order?.ship_cost || 0} />
                  </span>
                </li>
                <li className="text-3xl font-bold border-t flex justify-between gap-x-5 mt-3 pt-3">
                  <span>Total:</span>
                  <span>
                    <FormattedPrice
                      amount={
                        (getTotal(order?.orderItems) || 0) +
                        (order?.ship_cost || 0)
                      }
                    />
                  </span>
                </li>
              </ul>
            )}
          </div>
        </div>
        <div className="flex flex-col w-full ">
          <div className="relative overflow-x-auto shadow-md sm:rounded-xl p-3 w-full">
            <h2 className="text-2xl">Pagos</h2>
            <table className="w-full text-sm text-left">
              <thead className="text-l text-gray-400 uppercase">
                <tr className="flex flex-row justify-between ">
                  <th scope="col" className="px-2 maxsm:px-0 py-3  w-full">
                    Fecha
                  </th>
                  <th
                    scope="col"
                    className="px-2 maxsm:px-0 py-3 maxsm:hidden  w-full"
                  >
                    Método
                  </th>
                  <th scope="col" className="px-2 maxsm:px-0 py-3  w-full">
                    Ref
                  </th>
                  <th scope="col" className="px-2 maxsm:px-0 py-3  w-full">
                    Cant.
                  </th>
                  <th
                    scope="col"
                    className="px-2 maxsm:px-0 py-3 maxsm:hidden w-full"
                  >
                    Nota.
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderPayments?.map(
                  (payment: {
                    _id: React.Key | null | undefined;
                    pay_date: any;
                    method: string;
                    reference: string | number;

                    amount: any;
                    comment: string;
                  }) => (
                    <tr
                      className="bg-background flex flex-row justify-between "
                      key={payment?._id}
                    >
                      <td className="px-2 maxsm:px-0 py-2 w-full">
                        {formatSpanishDate(payment?.pay_date)}
                      </td>
                      <td className="px-2 maxsm:px-0 py-2  w-full uppercase text-xs maxsm:hidden">
                        {payment?.method === "card"
                          ? "tarjeta"
                          : payment?.method === "customer_balance"
                            ? "transferencia"
                            : `${payment?.method}`}
                      </td>
                      <td className="px-2 maxsm:px-0 py-2  w-full uppercase text-xs">
                        {payment?.reference}
                      </td>
                      <td className="px-2 maxsm:px-0 py-2  w-full font-bold">
                        <FormattedPrice amount={payment?.amount || 0} />
                      </td>
                      <td className="px-2 maxsm:px-0 py-2 maxsm:hidden w-full text-xs">
                        {payment?.comment}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          <hr className="border border-gray-300" />
        </div>
      </div>
    </>
  );
};

export default AdminOneOrder;
