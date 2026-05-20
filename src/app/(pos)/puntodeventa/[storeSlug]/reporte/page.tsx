"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import POSSidebar from "../_components/POSSidebar";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import { MdPrint, MdClose } from "react-icons/md";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}
interface DayOrder {
  _id: string;
  orderId: number;
  customerName: string;
  phone: string;
  orderStatus: string;
  paymentInfo: { amountPaid: number; status: string; id?: string };
  orderItems: OrderItem[];
  createdAt: string;
  branch: string;
}

/* ─── 58mm reprint ticket ─────────────────────────────────────────────── */
function ReprintModal({
  order,
  storeName,
  onClose,
}: {
  order: DayOrder;
  storeName: string;
  onClose: () => void;
}) {
  const fmt = (n: number) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  const line = "─".repeat(32);
  const date = new Date(order.createdAt);
  const fmtDate = date.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const transRef = order.paymentInfo?.id ?? "";
  let payMethod = "—";
  if (transRef === "EFECTIVO") payMethod = "EFECTIVO";
  else if (transRef.startsWith("MIXTO")) payMethod = "MIXTO";
  else if (transRef) payMethod = "TERMINAL";

  const subtotal = order.paymentInfo?.amountPaid ?? 0;
  const iva = Math.round(((subtotal * 16) / 116) * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs flex flex-col">
        {/* Header — hidden on print */}
        <div className="no-print flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <span className="font-bold text-sm text-gray-800">
            Reimprimir ticket
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <MdPrint size={14} /> Imprimir
            </button>
            <button
              onClick={onClose}
              className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg"
            >
              <MdClose size={14} />
            </button>
          </div>
        </div>

        {/* 58mm ticket */}
        <div
          id="pos-ticket"
          className="font-mono text-black bg-white"
          style={{
            width: "100%",
            maxWidth: "58mm",
            margin: "0 auto",
            fontSize: "10px",
            padding: "4mm",
            lineHeight: "1.5",
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "12px",
              marginBottom: "2px",
            }}
          >
            SUPER COLLECTIBLES
          </div>
          <div
            style={{
              textAlign: "center",
              fontSize: "10px",
              marginBottom: "2px",
            }}
          >
            {storeName}
          </div>
          <div
            style={{
              textAlign: "center",
              fontSize: "9px",
              marginBottom: "4px",
            }}
          >
            {fmtDate}
          </div>

          <div style={{ textAlign: "center", marginBottom: "4px" }}>{line}</div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Orden:</span>
            <span style={{ fontWeight: "bold" }}>#{order.orderId}</span>
          </div>
          {order.customerName && order.customerName !== "Publico General" && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Cliente:</span>
              <span>{order.customerName}</span>
            </div>
          )}
          {order.phone && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Tel:</span>
              <span>{order.phone}</span>
            </div>
          )}

          <div style={{ textAlign: "center", margin: "4px 0" }}>{line}</div>

          {order.orderItems.map((item, idx) => (
            <div key={idx} style={{ marginBottom: "3px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span
                  style={{
                    maxWidth: "38mm",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    display: "block",
                  }}
                >
                  {item.name}
                </span>
                <span style={{ fontWeight: "bold", flexShrink: 0 }}>
                  {fmt(item.price * item.quantity)}
                </span>
              </div>
              {item.quantity > 1 && (
                <div style={{ color: "#555", fontSize: "9px" }}>
                  {item.quantity} x {fmt(item.price)}
                </div>
              )}
            </div>
          ))}

          <div style={{ textAlign: "center", margin: "4px 0" }}>{line}</div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: "bold",
              fontSize: "12px",
            }}
          >
            <span>TOTAL:</span>
            <span>{fmt(subtotal)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "9px",
              color: "#555",
              marginTop: "2px",
            }}
          >
            <span>IVA incluido (16%):</span>
            <span>{fmt(iva)}</span>
          </div>

          <div style={{ textAlign: "center", margin: "4px 0" }}>{line}</div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Forma de pago:</span>
            <span style={{ fontWeight: "bold" }}>{payMethod}</span>
          </div>

          <div style={{ textAlign: "center", margin: "4px 0" }}>{line}</div>
          <div style={{ textAlign: "center", fontSize: "9px" }}>
            *** REIMPRESIÓN ***
          </div>
          <div
            style={{ textAlign: "center", fontSize: "9px", marginTop: "4px" }}
          >
            ¡Gracias por su compra!
          </div>
          <div
            style={{ textAlign: "center", fontSize: "9px", marginTop: "2px" }}
          >
            www.supercollectibles.mx
          </div>
        </div>
      </div>
    </div>
  );
}
export default function POSReportPage() {
  const params = useParams();
  const storeSlug = params?.storeSlug as string;
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [orders, setOrders] = useState<DayOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const printRef = useRef<HTMLDivElement>(null);
  const [reprintOrder, setReprintOrder] = useState<DayOrder | null>(null);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((stores: any[]) => {
        const found = stores.find((s) => s.slug === storeSlug);
        if (found) {
          setStoreId(found._id);
          setStoreName(found.name);
        }
      });
  }, [storeSlug]);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    fetch(`/api/pos/report?storeId=${storeId}&date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => {
        setOrders(data?.orders ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [storeId, selectedDate]);

  const totalSales = orders.reduce(
    (s, o) => s + (o.paymentInfo?.amountPaid ?? 0),
    0,
  );
  const totalItems = orders.reduce(
    (s, o) => s + o.orderItems.reduce((ss, i) => ss + i.quantity, 0),
    0,
  );

  return (
    <>
      <div className="flex h-screen bg-background">
        <POSSidebar storeSlug={storeSlug} storeName={storeName} />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6 print:hidden">
            <div>
              <h1 className="text-xl font-bold">Reporte del Día</h1>
              <p className="text-xs text-muted-foreground">{storeName}</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-muted rounded-lg px-3 py-2 text-sm outline-none"
              />
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-muted hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <MdPrint size={16} /> Imprimir
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Órdenes", value: orders.length },
              { label: "Artículos vendidos", value: totalItems },
              { label: "Total cobrado", value: `$${totalSales.toFixed(2)}` },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-card border border-muted rounded-xl px-5 py-4"
              >
                <p className="text-xs text-muted-foreground mb-1">
                  {card.label}
                </p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Orders table */}
          <div ref={printRef}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Ventas del{" "}
              {new Date(selectedDate + "T12:00:00").toLocaleDateString(
                "es-MX",
                {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                },
              )}
            </p>

            {loading && (
              <p className="text-sm text-muted-foreground animate-pulse">
                Cargando...
              </p>
            )}

            {!loading && orders.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No hay ventas registradas para esta fecha.
              </p>
            )}

            {!loading && orders.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-muted">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">No.</th>
                      <th className="px-4 py-3 text-left">Cliente</th>
                      <th className="px-4 py-3 text-center">Art.</th>
                      <th className="px-4 py-3 text-right">Recibido</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-left">Hora</th>
                      <th className="px-4 py-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id} className="border-t border-muted">
                        <td className="px-4 py-3 font-bold">
                          #{order.orderId}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-xs">
                            {order.customerName || "—"}
                          </p>
                          {order.phone && (
                            <p className="text-xs text-muted-foreground">
                              {order.phone}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {order.orderItems?.reduce(
                            (s, i) => s + i.quantity,
                            0,
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          <FormattedPrice
                            amount={order.paymentInfo?.amountPaid}
                          />
                        </td>
                        <td
                          className={`px-4 py-3 text-xs font-semibold ${
                            order.orderStatus === "Entregado"
                              ? "text-green-600"
                              : order.orderStatus === "Apartado"
                                ? "text-amber-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {order.orderStatus}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleTimeString(
                            "es-MX",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setReprintOrder(order)}
                            title="Reimprimir ticket"
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <MdPrint size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 font-bold text-sm">
                    <tr className="border-t-2 border-muted">
                      <td
                        colSpan={3}
                        className="px-4 py-3 text-right text-xs text-muted-foreground"
                      >
                        TOTAL
                      </td>
                      <td className="px-4 py-3 text-right">
                        <FormattedPrice amount={totalSales} />
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {reprintOrder && (
        <ReprintModal
          order={reprintOrder}
          storeName={storeName}
          onClose={() => setReprintOrder(null)}
        />
      )}
    </>
  );
}
