"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { MdCheckCircle, MdPending, MdClose } from "react-icons/md";
import Image from "next/image";
import POSSidebar from "../_components/POSSidebar";

interface PickupOrder {
  _id: string;
  orderId: number;
  customerName: string;
  email: string;
  phone: string;
  orderStatus: string;
  createdAt: string;
  pickupReadyDate?: string;
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
    color?: string;
    size?: string;
    image?: string;
  }>;
  paymentInfo: {
    status: string;
    amountPaid: number;
    id?: string;
    taxPaid?: number;
  };
}

export default function PickupOrdersPage() {
  const params = useParams();
  const { data: session } = useSession();
  const storeSlug = params?.storeSlug as string;
  const [orders, setOrders] = useState<PickupOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "delivered">("pending");
  const [markingAs, setMarkingAs] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Get store ID from store slug
  useEffect(() => {
    const fetchStoreId = async () => {
      try {
        const res = await fetch(`/api/stores/by-slug/${storeSlug}`);
        if (res.ok) {
          const data = await res.json();
          setStoreId(data._id);
          setStoreName(data.name);
        } else {
          console.error("❌ Store fetch failed:", res.status, await res.text());
          toast("Error al cargar la información de la sucursal");
        }
      } catch (error) {
        console.error("❌ Error fetching store:", error);
        toast("Error al cargar la información de la sucursal");
      }
    };

    if (storeSlug) {
      fetchStoreId();
    }
  }, [storeSlug]);

  // Fetch pickup orders
  useEffect(() => {
    const fetchPickupOrders = async () => {
      if (!storeId) {
        return;
      }

      setLoading(true);
      try {
        const url = `/api/orders/pickup?storeId=${storeId}`;
        const res = await fetch(url);

        if (res.ok) {
          const data = await res.json();

          setOrders(data.orders || []);
        } else {
          const errorText = await res.text();
          console.error("❌ API Error:", res.status, errorText);
          toast("Error al cargar órdenes de retiro");
        }
      } catch (error) {
        console.error("❌ Error fetching pickup orders:", error);
        toast("Error al cargar órdenes de retiro");
      } finally {
        setLoading(false);
      }
    };

    fetchPickupOrders();
  }, [storeId]);

  const markAsDelivered = async (orderId: string) => {
    setMarkingAs(orderId);
    try {
      const res = await fetch("/api/orders/mark-pickup-delivered", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (res.ok) {
        toast("Orden marcada como entregada");
        // Remove from list
        setOrders((prev) => prev.filter((o) => o._id !== orderId));
      } else {
        const data = await res.json();
        toast(data.error || "Error al marcar como entregada");
      }
    } catch (error) {
      console.error("Error marking as delivered:", error);
      toast("Error al marcar como entregada");
    } finally {
      setMarkingAs(null);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <POSSidebar storeSlug={storeSlug} storeName={storeName} />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Órdenes de Retiro</h1>
            <p className="text-muted-foreground">
              Gestiona las órdenes que están listas para ser recogidas en esta
              sucursal
            </p>
          </div>

          {/* Image Modal */}
          {selectedImage && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              onClick={() => setSelectedImage(null)}
            >
              <div
                className="relative bg-white rounded-lg overflow-hidden shadow-2xl max-w-2xl max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                >
                  <MdClose size={24} />
                </button>
                <Image
                  src={selectedImage}
                  width={600}
                  height={600}
                  alt="Product"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setFilter("pending")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "pending"
                  ? "bg-blue-600 text-white"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              }`}
            >
              <MdPending size={18} />
              Listas para Recoger (
              {orders.filter((o) => o.orderStatus === "Procesando").length})
            </button>
            <button
              onClick={() => setFilter("delivered")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "delivered"
                  ? "bg-green-600 text-white"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              }`}
            >
              <MdCheckCircle size={18} />
              Entregadas (
              {orders.filter((o) => o.orderStatus === "Entregado").length})
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">
                Cargando órdenes...
              </span>
            </div>
          )}

          {/* Empty State */}
          {!loading && orders.length === 0 && (
            <div className="text-center py-12 bg-muted/20 rounded-lg">
              <MdClose
                size={48}
                className="mx-auto text-muted-foreground mb-3 opacity-50"
              />
              <p className="text-muted-foreground mb-2">
                {filter === "pending"
                  ? "No hay órdenes listas para recoger"
                  : "No hay órdenes entregadas"}
              </p>
            </div>
          )}

          {/* Orders Grid */}
          {!loading && orders.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {orders
                .filter((o) =>
                  filter === "delivered"
                    ? o.orderStatus === "Entregado"
                    : o.orderStatus === "Procesando",
                )
                .map((order) => (
                  <div
                    key={order._id}
                    className="border border-muted bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-bold">
                            Orden #{order.orderId}
                          </h3>
                          <p className="text-sm text-blue-100">
                            {order.customerName}
                          </p>
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            order.orderStatus === "Entregado"
                              ? "bg-green-500/20 text-green-100"
                              : "bg-amber-500/20 text-amber-100"
                          }`}
                        >
                          {order.orderStatus}
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4">
                      {/* Contact Info */}
                      <div className="mb-4 pb-4 border-b border-muted">
                        <p className="text-sm text-muted-foreground mb-1">
                          <span className="font-semibold text-foreground">
                            📧 Email:
                          </span>{" "}
                          {order.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            📞 Teléfono:
                          </span>{" "}
                          {order.phone}
                        </p>
                      </div>

                      {/* Order Items */}
                      <div className="mb-4 pb-4 border-b border-muted">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                          Artículos ({order.orderItems.length})
                        </p>
                        <div className="space-y-2">
                          {order.orderItems.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex gap-3 items-start">
                              {item.image && (
                                <button
                                  onClick={() => setSelectedImage(item.image!)}
                                  className="flex-shrink-0 overflow-hidden rounded-lg border border-muted hover:border-primary/50 transition-colors hover:shadow-md cursor-pointer"
                                >
                                  <Image
                                    src={item.image}
                                    alt={item.name}
                                    width={48}
                                    height={48}
                                    className="w-12 h-12 object-cover hover:scale-105 transition-transform"
                                  />
                                </button>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm">
                                  {item.quantity}x{" "}
                                  <span className="font-medium">
                                    {item.name}
                                  </span>
                                </p>
                                {item.color && (
                                  <p className="text-xs text-muted-foreground">
                                    {item.color}
                                    {item.size ? `, ${item.size}` : ""}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                          {order.orderItems.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{order.orderItems.length - 3} más
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Order Total & Payment Status */}
                      <div className="mb-4 pb-4 border-b border-muted space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                              Total
                            </p>
                            <p className="text-xl font-bold text-green-600">
                              ${order.paymentInfo.amountPaid.toFixed(2)} MXN
                            </p>
                          </div>
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              order.paymentInfo.status === "Pagado"
                                ? "bg-green-500/20 text-green-700"
                                : order.paymentInfo.status === "Pendiente"
                                  ? "bg-yellow-500/20 text-yellow-700"
                                  : "bg-red-500/20 text-red-700"
                            }`}
                          >
                            {order.paymentInfo.status === "Pagado"
                              ? "💳 Pagado"
                              : order.paymentInfo.status === "Pendiente"
                                ? "⏳ Pendiente"
                                : "❌ Error"}
                          </div>
                        </div>
                        {order.paymentInfo.taxPaid !== undefined && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Impuestos (IVA):</span>
                            <span className="font-medium">
                              ${order.paymentInfo.taxPaid.toFixed(2)} MXN
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Date Info */}
                      <p className="text-xs text-muted-foreground mb-4">
                        📅{" "}
                        {new Date(order.createdAt).toLocaleDateString("es-MX")}
                        {order.pickupReadyDate && (
                          <span className="block">
                            ✓ Notificado:{" "}
                            {new Date(order.pickupReadyDate).toLocaleDateString(
                              "es-MX",
                            )}
                          </span>
                        )}
                      </p>

                      {/* Action Button */}
                      {order.orderStatus !== "Entregado" && (
                        <button
                          onClick={() => markAsDelivered(order._id)}
                          disabled={markingAs === order._id}
                          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
                        >
                          <MdCheckCircle />
                          {markingAs === order._id
                            ? "Procesando..."
                            : "Marcar como Entregado"}
                        </button>
                      )}
                      {order.orderStatus === "Entregado" && (
                        <div className="w-full flex items-center justify-center gap-2 bg-green-100 text-green-800 font-medium py-2 rounded-lg">
                          <MdCheckCircle />
                          Entregado
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
