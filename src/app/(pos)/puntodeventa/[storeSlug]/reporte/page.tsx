"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import POSSidebar from "../_components/POSSidebar";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import {
  MdPrint,
  MdClose,
  MdCancel,
  MdShield,
  MdVisibility,
} from "react-icons/md";
import { Button } from "@/components/ui/button";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}
interface PaymentRecord {
  _id: string;
  method: string;
  amount: number;
  reference?: string;
  comment?: string;
  pay_date?: string;
}
interface DayOrder {
  _id: string;
  orderId: number;
  customerName: string;
  paymentMethod: string;
  phone: string;
  orderStatus: string;
  paymentInfo: { amountPaid: number; status: string; id?: string };
  orderItems: OrderItem[];
  createdAt: string;
  branch: string;
  ship_cost?: number;
  payments?: PaymentRecord[];
  comment?: string;
}

function getPayMethodLabel(method: string): string {
  if (!method) return "—";
  const m = method.toUpperCase();
  if (["CASH", "EFECTIVO"].includes(m)) return "Efectivo";
  if (["CARD", "TERMINAL", "TARJETA", "CREDIT"].includes(m)) return "Terminal";
  if (["TRANSFER", "TRANSFERENCIA"].includes(m)) return "Transfer.";
  return method;
}

function parseCancelledBy(comment?: string): string | null {
  if (!comment) return null;
  const match = comment.match(/Cancelado por:\s*([^(]+)/);
  return match ? match[1].trim() : null;
}

function parseMixtoAmounts(
  ref: string,
): { cash: number; card: number; cardRef: string } | null {
  if (!ref.startsWith("MIXTO")) return null;
  const cashMatch = ref.match(/CASH:([\d.]+)/);
  const cardMatch = ref.match(/CARD:([\d.]+)/);
  const refMatch = ref.match(/REF:([^-]+)/);
  return {
    cash: cashMatch ? Number(cashMatch[1]) : 0,
    card: cardMatch ? Number(cardMatch[1]) : 0,
    cardRef: refMatch ? refMatch[1] : "",
  };
}

/* ─── Manager code verification modal ───────────────────────────── */
function ManagerCodeModal({
  onAuthorized,
  onClose,
}: {
  onAuthorized: (employee: { _id: string; name: string; role: string }) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleVerify() {
    if (code.length !== 6) {
      setError("El código debe tener 6 dígitos.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pos/verify-manager-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.valid) {
        onAuthorized(data.employee);
      } else {
        setError("Código incorrecto. Intenta de nuevo.");
        setCode("");
      }
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-xs">
        <div className="flex items-center justify-between px-6 py-4 border-b border-muted">
          <h2 className="font-bold text-base flex items-center gap-2">
            <MdShield size={18} className="text-primary" />
            Autorización requerida
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-xs text-muted-foreground mb-4">
            Ingresa el código de manager para autorizar la{" "}
            <span className="font-semibold text-red-600">
              cancelación de la orden
            </span>
            .
          </p>
          <input
            type="password"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            inputMode="numeric"
            maxLength={6}
            autoFocus
            placeholder="••••••"
            className="w-full border border-border rounded-lg px-3 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary tracking-widest text-center text-lg mb-1"
          />
          <p className="text-xs text-muted-foreground text-center mb-3">
            {code.length}/6 dígitos
          </p>
          {error && (
            <p className="text-xs text-red-500 mb-3 text-center">{error}</p>
          )}
          <button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="w-full bg-red-600 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Autorizar cancelación"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Reprint ticket ─────────────────────────────────────────────── */
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
  const line = "═ ".repeat(22);
  const fmtDate = new Date(order.createdAt).toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });

  const transRef = order.paymentInfo?.id ?? "";
  let payMethod = "—";
  if (transRef === "EFECTIVO") payMethod = "EFECTIVO";
  else if (transRef.startsWith("MIXTO")) payMethod = "MIXTO";
  else if (transRef) payMethod = "TERMINAL";

  const subtotal = order.paymentInfo?.amountPaid ?? 0;
  const iva = Math.round(((subtotal * 16) / 116) * 100) / 100;
  const totalItems = order.orderItems.reduce((s, i) => s + i.quantity, 0);

  // Auto-send to printer as soon as the modal renders, then close on afterprint
  useEffect(() => {
    const t = setTimeout(() => window.print(), 150);
    const close = () => onClose();
    window.addEventListener("afterprint", close);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", close);
    };
  }, []);

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
              <MdPrint size={14} /> Reimprimir
            </button>
            <button
              onClick={onClose}
              className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg"
            >
              <MdClose size={14} />
            </button>
          </div>
        </div>

        {/* Ticket */}
        <div
          id="pos-ticket"
          className="font-mono text-black bg-white"
          style={{
            width: "95%",
            fontSize: "12px",
            padding: "4mm",
            lineHeight: "1.5",
            textTransform: "uppercase",
            fontWeight: "bold",
          }}
        >
          {/* Header */}
          <div
            style={{
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "12px",
              marginBottom: "2px",
            }}
          >
            SUPERCOLLECTIBLESMX
            <p>Tienda de Articulos Coleccionables</p>
          </div>
          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              marginBottom: "1px",
            }}
          >
            {storeName}
          </div>
          <div
            style={{
              textAlign: "center",
              fontSize: "11px",
              marginBottom: "2px",
            }}
          >
            {fmtDate}
          </div>

          <div style={{ textAlign: "center", marginBottom: "4px" }}>{line}</div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Cajero:</span>
            <span>—</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Folio:</span>
            <span style={{ fontWeight: "bold" }}>#{order.orderId}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Cliente:</span>
            <span>{order.customerName || "—"}</span>
          </div>
          {order.phone && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Tel:</span>
              <span>{order.phone}</span>
            </div>
          )}

          {/* Column headers */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "4px",
            }}
          >
            <div>Cant.</div>
            <div>Descrp.</div>
            <div style={{ textAlign: "right" }}>Importe</div>
          </div>
          <div style={{ textAlign: "center", marginBottom: "4px" }}>{line}</div>

          {/* Items */}
          {order.orderItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "3px",
              }}
            >
              <span>{item.quantity}</span>
              <span
                style={{
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  display: "block",
                  paddingRight: "4px",
                }}
              >
                {item.name.substring(0, 20)}
              </span>
              <span style={{ fontWeight: "bold", flexShrink: 0 }}>
                {fmt(item.price * item.quantity)}
              </span>
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
              marginTop: "2px",
            }}
          >
            <span>IVA incluido (16%):</span>
            <span>{fmt(iva)}</span>
          </div>

          <div style={{ textAlign: "center", margin: "4px 0" }}>{line}</div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>No. de art&iacute;culos:</span>
            <span style={{ fontWeight: "bold" }}>{totalItems}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Forma de pago:</span>
            <span style={{ fontWeight: "bold" }}>{payMethod}</span>
          </div>

          <div style={{ textAlign: "center", margin: "6px 0 2px" }}>{line}</div>
          <div
            style={{
              textAlign: "center",
              fontSize: "10px",
              marginBottom: "2px",
            }}
          >
            *** REIMPRESI&Oacute;N ***
          </div>
          <div style={{ textAlign: "center", fontSize: "12px" }}>
            ¡Gracias por su compra!
          </div>
          <div
            style={{ textAlign: "center", fontSize: "12px", marginTop: "2px" }}
          >
            www.supercollectibles.com.mx
          </div>
          <div
            style={{
              textAlign: "center",
              fontSize: "11px",
              lineHeight: "1.4",
              marginTop: "4px",
              marginBottom: "4px",
            }}
          >
            No aceptamos devoluciones. Para verificar la garantia o validez de
            la misma, comunicarse directamente con el fabricante.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Order detail modal ─────────────────────────────────────────── */
function OrderDetailModal({
  order,
  onClose,
  onReprint,
}: {
  order: DayOrder;
  onClose: () => void;
  onReprint: () => void;
}) {
  const itemsTotal = order.orderItems.reduce(
    (s, i) => s + i.price * i.quantity,
    0,
  );
  const iva = Math.round(((itemsTotal * 16) / 116) * 100) / 100;
  const shipCost = order.ship_cost ?? 0;

  const fmtDate = new Date(order.createdAt).toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-muted">
          <div>
            <h2 className="font-bold text-base">Pedido #{order.orderId}</h2>
            <p className="text-xs text-muted-foreground">
              {order.customerName || "—"} &middot; {fmtDate}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onReprint}
              className="flex items-center gap-1 text-xs bg-muted hover:bg-muted/70 px-3 py-1.5 rounded-lg transition-colors"
            >
              <MdPrint size={14} /> Reimprimir
            </button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <MdClose size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {/* Items table */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Art&iacute;culos
            </h3>
            <div className="border border-muted rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Art&iacute;culo</th>
                    <th className="px-3 py-2 text-center">Cant.</th>
                    <th className="px-3 py-2 text-right">P. Unit.</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.orderItems.map((item, i) => (
                    <tr key={i} className="border-t border-muted/40">
                      <td className="px-3 py-2 text-xs">{item.name}</td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">
                        <FormattedPrice amount={item.price} />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        <FormattedPrice amount={item.price * item.quantity} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="border border-muted rounded-xl overflow-hidden text-sm">
            <div className="flex justify-between px-4 py-2.5 bg-muted/20">
              <span className="text-muted-foreground">
                Subtotal art&iacute;culos
              </span>
              <FormattedPrice amount={itemsTotal} />
            </div>
            {shipCost > 0 && (
              <div className="flex justify-between px-4 py-2.5 border-t border-muted/40">
                <span className="text-muted-foreground">Env&iacute;o</span>
                <FormattedPrice amount={shipCost} />
              </div>
            )}
            <div className="flex justify-between px-4 py-2.5 border-t border-muted/40">
              <span className="text-muted-foreground">IVA incluido (16%)</span>
              <FormattedPrice amount={iva} />
            </div>
            <div className="flex justify-between px-4 py-3 bg-foreground text-background font-bold border-t border-muted">
              <span>TOTAL COBRADO</span>
              <FormattedPrice amount={order.paymentInfo.amountPaid} />
            </div>
          </div>

          {/* Payment methods */}
          {order.payments && order.payments.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Formas de pago
              </h3>
              <div className="border border-muted rounded-xl overflow-hidden text-sm">
                {order.payments.map((p, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-4 py-2.5 ${
                      i > 0 ? "border-t border-muted/40" : ""
                    }`}
                  >
                    <div>
                      <span className="font-semibold">
                        {getPayMethodLabel(p.method)}
                      </span>
                      {p.reference && (
                        <span className="text-xs text-muted-foreground ml-2">
                          Ref: {p.reference}
                        </span>
                      )}
                      {p.comment && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.comment}
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-green-700 dark:text-green-400">
                      <FormattedPrice amount={p.amount} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Forma de pago
              </h3>
              {(() => {
                const ref = order.paymentInfo?.id ?? "";
                const mixto = parseMixtoAmounts(ref);
                if (mixto) {
                  return (
                    <div className="border border-muted rounded-xl overflow-hidden text-sm">
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="font-semibold">Efectivo</span>
                        <span className="font-bold text-green-700 dark:text-green-400">
                          <FormattedPrice amount={mixto.cash} />
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2.5 border-t border-muted/40">
                        <div>
                          <span className="font-semibold">Terminal</span>
                          {mixto.cardRef && (
                            <span className="text-xs text-muted-foreground ml-2">
                              Ref: {mixto.cardRef}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-green-700 dark:text-green-400">
                          <FormattedPrice amount={mixto.card} />
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2.5 border-t border-muted font-bold bg-muted/20">
                        <span>TOTAL</span>
                        <span className="text-green-700 dark:text-green-400">
                          <FormattedPrice amount={mixto.cash + mixto.card} />
                        </span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="border border-muted rounded-xl px-4 py-2.5 text-sm font-semibold">
                    {ref === "EFECTIVO" ? "Efectivo" : ref ? "Terminal" : "—"}
                  </div>
                );
              })()}
            </div>
          )}
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
  const [cancelOrder, setCancelOrder] = useState<DayOrder | null>(null);
  const [showManagerCodeForCancel, setShowManagerCodeForCancel] =
    useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [viewOrder, setViewOrder] = useState<DayOrder | null>(null);

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

  const activeOrders = orders.filter((o) => o.orderStatus !== "Cancelado");
  const cancelledCount = orders.length - activeOrders.length;

  const totalSales = activeOrders.reduce(
    (s, o) => s + (o.paymentInfo?.amountPaid ?? 0),
    0,
  );
  const totalItems = activeOrders.reduce(
    (s, o) => s + o.orderItems.reduce((ss, i) => ss + i.quantity, 0),
    0,
  );
  const paymentBreakdown = activeOrders.reduce(
    (acc: Record<string, number>, o) => {
      if (o.payments && o.payments.length > 0) {
        for (const p of o.payments) {
          const m = p.method?.toUpperCase() ?? "";
          if (m === "MIXTO") {
            // Payment record with MIXTO method — try to parse amounts from reference
            const mixto = parseMixtoAmounts(p.reference ?? "");
            if (mixto && (mixto.cash > 0 || mixto.card > 0)) {
              if (mixto.cash > 0)
                acc["Efectivo"] = (acc["Efectivo"] ?? 0) + mixto.cash;
              if (mixto.card > 0)
                acc["Terminal"] = (acc["Terminal"] ?? 0) + mixto.card;
            } else {
              acc["Mixto"] = (acc["Mixto"] ?? 0) + p.amount;
            }
          } else {
            const label = getPayMethodLabel(p.method);
            acc[label] = (acc[label] ?? 0) + p.amount;
          }
        }
      } else {
        const ref = o.paymentInfo?.id ?? "";
        if (ref === "EFECTIVO") {
          acc["Efectivo"] =
            (acc["Efectivo"] ?? 0) + (o.paymentInfo?.amountPaid ?? 0);
        } else if (ref.startsWith("MIXTO")) {
          const mixto = parseMixtoAmounts(ref);
          if (mixto) {
            if (mixto.cash > 0)
              acc["Efectivo"] = (acc["Efectivo"] ?? 0) + mixto.cash;
            if (mixto.card > 0)
              acc["Terminal"] = (acc["Terminal"] ?? 0) + mixto.card;
          }
        } else if (ref) {
          acc["Terminal"] =
            (acc["Terminal"] ?? 0) + (o.paymentInfo?.amountPaid ?? 0);
        }
      }
      return acc;
    },
    {},
  );

  async function handleCancelOrder(employee: {
    _id: string;
    name: string;
    role: string;
  }) {
    if (!cancelOrder) return;
    setCancelLoading(true);
    setCancelError("");
    try {
      const res = await fetch("/api/pos/cancel-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: cancelOrder._id,
          authorizedById: employee._id,
          authorizedByName: employee.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cancelar");
      // Optimistically update list
      setOrders((prev) =>
        prev.map((o) =>
          o._id === cancelOrder._id ? { ...o, orderStatus: "Cancelado" } : o,
        ),
      );
      setCancelOrder(null);
      setShowManagerCodeForCancel(false);
    } catch (e: any) {
      setCancelError(e.message);
    } finally {
      setCancelLoading(false);
    }
  }

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
              {/* <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-muted hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <MdPrint size={16} /> Imprimir
              </button> */}
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Órdenes", value: activeOrders.length },
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
            {cancelledCount > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-5 py-4">
                <p className="text-xs text-red-500 dark:text-red-400 mb-1">
                  Canceladas
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {cancelledCount}
                </p>
              </div>
            )}
          </div>

          {/* Payment method breakdown */}
          {Object.keys(paymentBreakdown).length > 0 && (
            <div className="flex flex-wrap gap-3 mb-6">
              {Object.entries(paymentBreakdown).map(([method, amount]) => (
                <div
                  key={method}
                  className="bg-card border border-muted rounded-lg px-4 py-2.5 flex items-center gap-3"
                >
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {method}
                  </span>
                  <span className="text-base font-bold">
                    ${(amount as number).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

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
                      <th className="px-4 py-3 text-left">Metodo</th>
                      <th className="px-4 py-3 text-center">Art.</th>
                      <th className="px-4 py-3 text-right">Recibido</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-left">Hora</th>
                      <th className="px-4 py-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const isCancelled = order.orderStatus === "Cancelado";
                      const cancelledBy = parseCancelledBy(order.comment);
                      return (
                        <tr
                          key={order._id}
                          className={`border-t border-muted ${
                            isCancelled
                              ? "bg-red-50/60 dark:bg-red-950/20 opacity-75"
                              : ""
                          }`}
                        >
                          <td
                            className={`px-4 py-3 font-bold ${isCancelled ? "line-through text-muted-foreground" : ""}`}
                          >
                            #{order.orderId}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-xs">
                              {order.customerName || "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-xs">
                              {order.payments && order.payments.length > 0
                                ? Array.from(
                                    new Set(
                                      order.payments.map((p) =>
                                        getPayMethodLabel(p.method),
                                      ),
                                    ),
                                  ).join(" + ")
                                : (() => {
                                    const ref = order.paymentInfo?.id ?? "";
                                    if (ref === "EFECTIVO") return "Efectivo";
                                    if (ref.startsWith("MIXTO")) return "Mixto";
                                    if (ref) return "Terminal";
                                    return order.paymentMethod || "—";
                                  })()}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {order.orderItems?.reduce(
                              (s, i) => s + i.quantity,
                              0,
                            )}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-semibold ${isCancelled ? "line-through text-muted-foreground" : ""}`}
                          >
                            <FormattedPrice
                              amount={order.paymentInfo?.amountPaid}
                            />
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {isCancelled ? (
                              <div>
                                <span className="font-semibold text-red-600 dark:text-red-400">
                                  Cancelado
                                </span>
                                {cancelledBy && (
                                  <p className="text-muted-foreground mt-0.5 leading-tight">
                                    por {cancelledBy}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span
                                className={`font-semibold ${
                                  order.orderStatus === "Entregado"
                                    ? "text-green-600"
                                    : order.orderStatus === "Apartado"
                                      ? "text-amber-500"
                                      : "text-muted-foreground"
                                }`}
                              >
                                {order.orderStatus}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleTimeString(
                              "es-MX",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "UTC",
                              },
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setViewOrder(order)}
                                title="Ver detalle"
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                              >
                                <MdVisibility size={16} />
                              </button>
                              <button
                                onClick={() => setReprintOrder(order)}
                                title="Reimprimir ticket"
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                              >
                                <MdPrint size={16} />
                              </button>
                              {!isCancelled && (
                                <button
                                  onClick={() => {
                                    setCancelOrder(order);
                                    setCancelError("");
                                    setShowManagerCodeForCancel(true);
                                  }}
                                  title="Cancelar orden"
                                  className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-muted-foreground hover:text-red-600"
                                >
                                  <MdCancel size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

      {viewOrder && (
        <OrderDetailModal
          order={viewOrder}
          onClose={() => setViewOrder(null)}
          onReprint={() => {
            setReprintOrder(viewOrder);
            setViewOrder(null);
          }}
        />
      )}

      {reprintOrder && (
        <ReprintModal
          order={reprintOrder}
          storeName={storeName}
          onClose={() => setReprintOrder(null)}
        />
      )}

      {/* Step 1: manager code gate */}
      {showManagerCodeForCancel && cancelOrder && (
        <ManagerCodeModal
          onAuthorized={(employee) => {
            setShowManagerCodeForCancel(false);
            handleCancelOrder(employee);
          }}
          onClose={() => {
            setShowManagerCodeForCancel(false);
            setCancelOrder(null);
          }}
        />
      )}

      {/* Cancel in-progress / error feedback */}
      {cancelLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl px-8 py-6 text-sm font-semibold animate-pulse">
            Cancelando orden…
          </div>
        </div>
      )}
      {cancelError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
          {cancelError}
          <button
            onClick={() => setCancelError("")}
            className="ml-2 text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
