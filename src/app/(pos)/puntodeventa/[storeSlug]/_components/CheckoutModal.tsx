"use client";
import { useState, useEffect } from "react";
import {
  MdClose,
  MdCheck,
  MdCreditCard,
  MdMoney,
  MdPrint,
  MdCheckCircle,
  MdWifiOff,
} from "react-icons/md";
import { CartItem } from "./ProductSearch";
import { posDB } from "@/lib/posDB";

interface CheckoutModalProps {
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  storeId: string;
  storeSlug: string;
  storeName: string;
  cashierName: string;
  isOnline?: boolean;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}

interface ReceiptData {
  orderId: string;
  items: CartItem[];
  subtotal: number;
  iva: number;
  payMethod: PayMethod;
  cashReceived: number;
  change: number;
  customerName: string;
  customerPhone: string;
  storeName: string;
  cashierName: string;
  date: Date;
  isOffline?: boolean;
}

type PayMethod = "EFECTIVO" | "TERMINAL" | "MIXTO";

export default function CheckoutModal({
  items,
  customerName,
  customerPhone,
  storeId,
  storeSlug,
  storeName,
  cashierName,
  isOnline = true,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const [payMethod, setPayMethod] = useState<PayMethod>("EFECTIVO");
  const [cashReceived, setCashReceived] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [cashPart, setCashPart] = useState("");
  const [cardPart, setCardPart] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const change =
    payMethod === "EFECTIVO" ? Math.max(0, Number(cashReceived) - subtotal) : 0;

  async function handleCheckout() {
    setError("");
    setLoading(true);
    try {
      // IVA is included in the price: 16% of the tax-inclusive total
      const iva = Math.round(((subtotal * 16) / 116) * 100) / 100;

      const orderItems = items.map((i) => ({
        product: i.productId,
        variation: i.variationId,
        name: i.title,
        quantity: i.quantity,
        price: i.price,
        image: i.image,
      }));

      let amountPaid = subtotal;
      let ref = transactionRef;
      if (payMethod === "EFECTIVO") {
        amountPaid = Math.min(Number(cashReceived), subtotal);
        ref = "EFECTIVO";
      } else if (payMethod === "MIXTO") {
        amountPaid = Number(cashPart) + Number(cardPart);
        ref = `MIXTO-CASH:${cashPart}-CARD:${cardPart}`;
      }

      // ── OFFLINE: queue in IndexedDB and show local receipt ──────────────────
      if (!isOnline) {
        const localId =
          typeof crypto?.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await posDB.pendingOrders.add({
          localId,
          storeId,
          storeSlug,
          orderItems,
          customerName,
          customerPhone,
          payMethod,
          amountPaid,
          taxPaid: iva,
          transactionRef: ref,
          total: subtotal,
          createdAt: Date.now(),
          status: "pending",
        });
        const time = new Date().toLocaleTimeString("es-MX", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        });
        setReceipt({
          orderId: `LOCAL-${time}`,
          items,
          subtotal,
          iva,
          payMethod,
          cashReceived: payMethod === "EFECTIVO" ? Number(cashReceived) : 0,
          change:
            payMethod === "EFECTIVO"
              ? Math.max(0, Number(cashReceived) - subtotal)
              : 0,
          customerName,
          customerPhone,
          storeName,
          cashierName,
          date: new Date(),
          isOffline: true,
        });
        return;
      }

      // ── ONLINE: normal API checkout ───────────────────────────────────
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItems,
          customerName,
          customerPhone,
          storeId,
          storeSlug,
          payMethod,
          amountPaid,
          taxPaid: iva,
          transactionRef: ref,
          total: subtotal,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al procesar la venta");
      setReceipt({
        orderId: data.orderId,
        items,
        subtotal,
        iva,
        payMethod,
        cashReceived: payMethod === "EFECTIVO" ? Number(cashReceived) : 0,
        change:
          payMethod === "EFECTIVO"
            ? Math.max(0, Number(cashReceived) - subtotal)
            : 0,
        customerName,
        customerPhone,
        storeName,
        cashierName,
        date: new Date(),
        isOffline: false,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── Receipt view (shown after successful sale) ── */
  if (receipt) {
    return (
      <SaleReceipt
        receipt={receipt}
        onDone={() => onSuccess(receipt.orderId)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-muted">
          <h2 className="font-bold text-lg">Cobrar Venta</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <MdClose size={22} />
          </button>
        </div>

        {/* Offline warning */}
        {!isOnline && (
          <div className="mx-6 mt-4 flex items-start gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl px-4 py-3">
            <MdWifiOff
              size={18}
              className="text-yellow-600 flex-shrink-0 mt-0.5"
            />
            <p className="text-xs text-yellow-800 dark:text-yellow-300 leading-snug">
              <span className="font-semibold">Sin conexión.</span> La venta se
              guardará localmente y se sincronizará automáticamente al
              reconectar.
            </p>
          </div>
        )}

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Summary */}
          <div className="bg-muted rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {items.length} artículo(s)
              {customerName ? ` — ${customerName}` : ""}
            </span>
            <span className="font-bold text-xl">${subtotal.toFixed(2)}</span>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
              Método de pago
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["EFECTIVO", "TERMINAL", "MIXTO"] as PayMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setPayMethod(m)}
                  className={`rounded-lg py-2.5 text-xs font-semibold flex flex-col items-center gap-1 border transition-colors ${
                    payMethod === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {m === "EFECTIVO" ? (
                    <MdMoney size={18} />
                  ) : (
                    <MdCreditCard size={18} />
                  )}
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Cash inputs */}
          {payMethod === "EFECTIVO" && (
            <div className="flex flex-col gap-2">
              <input
                type="number"
                placeholder="Efectivo recibido"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="bg-muted rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-slate-200"
              />
              {Number(cashReceived) > 0 && (
                <div className="flex justify-between text-sm px-1">
                  <span className="text-muted-foreground">Cambio</span>
                  <span className="font-bold text-green-500">
                    ${change.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {payMethod === "TERMINAL" && (
            <input
              type="text"
              placeholder="Referencia / Nº de transacción"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="bg-muted rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-slate-200"
            />
          )}

          {payMethod === "MIXTO" && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Efectivo"
                value={cashPart}
                onChange={(e) => setCashPart(e.target.value)}
                className="bg-muted rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-slate-200"
              />
              <input
                type="number"
                placeholder="Referencia"
                value={cardPart}
                onChange={(e) => setCardPart(e.target.value)}
                className="bg-muted rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-slate-200"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? (
              "Procesando..."
            ) : (
              <>
                <MdCheck size={18} /> Confirmar Venta
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SaleReceipt — full-screen receipt view + 58mm printable ticket
───────────────────────────────────────────────────────────────────────── */
function SaleReceipt({
  receipt,
  onDone,
}: {
  receipt: ReceiptData;
  onDone: () => void;
}) {
  const fmt = (n: number) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

  const fmtDate = (d: Date) =>
    d.toLocaleString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const line = "═ ".repeat(22);

  const cashTotal =
    receipt.payMethod === "EFECTIVO"
      ? receipt.cashReceived
      : receipt.payMethod === "MIXTO"
        ? receipt.items.reduce(
            (s, i) =>
              s +
              (typeof (i as any).cashPart === "number"
                ? (i as any).cashPart
                : 0),
            0,
          )
        : 0;

  // Auto-send to printer as soon as the receipt renders, then close on afterprint
  useEffect(() => {
    const t = setTimeout(() => window.print(), 150);
    const close = () => onDone();
    window.addEventListener("afterprint", close);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", close);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs flex flex-col">
        {/* Screen header (hidden on print) */}
        <div className="no-print flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div
            className={`flex items-center gap-2 ${
              receipt.isOffline ? "text-yellow-600" : "text-green-600"
            }`}
          >
            {receipt.isOffline ? (
              <MdWifiOff size={20} />
            ) : (
              <MdCheckCircle size={20} />
            )}
            <span className="font-bold text-sm text-gray-800">
              {receipt.isOffline
                ? "Guardada sin conexión"
                : "¡Venta registrada!"}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <MdPrint size={14} /> Reimprimir
            </button>
            <button
              onClick={onDone}
              className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* 58mm ticket — shown on screen and sent to printer */}
        <div
          id="pos-ticket"
          className="font-mono text-black bg-white"
          style={{
            width: "100%",
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
            {receipt.storeName}
          </div>
          <div
            style={{
              textAlign: "center",
              fontSize: "11px",
              marginBottom: "2px",
            }}
          >
            {fmtDate(receipt.date)}
          </div>

          <div style={{ textAlign: "center", marginBottom: "4px" }}>{line}</div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Cajero:</span>
            <span>{receipt.cashierName || "—"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Folio:</span>
            <span style={{ fontWeight: "bold" }}>#{receipt.orderId}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Cliente:</span>
            <span>{receipt.customerName}</span>
          </div>

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
          {receipt.items.map((item, idx) => (
            <div key={idx} style={{ marginBottom: "3px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
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
                  {item.title.substring(0, 20)}
                </span>
                <span style={{ fontWeight: "bold", flexShrink: 0 }}>
                  {fmt(item.price * item.quantity)}
                </span>
              </div>
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
            <span>{fmt(receipt.subtotal)}</span>
          </div>
          {/* IVA breakdown */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "9px",
              marginTop: "2px",
            }}
          >
            <span>IVA incluido (16%):</span>
            <span>{fmt(receipt.iva)}</span>
          </div>
          <div style={{ textAlign: "center", margin: "4px 0" }}>{line}</div>
          {/* Article count + Payment details */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>No. de art&iacute;culos:</span>
            <span style={{ fontWeight: "bold" }}>
              {receipt.items.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Forma de pago:</span>
            <span style={{ fontWeight: "bold" }}>{receipt.payMethod}</span>
          </div>
          {receipt.payMethod === "EFECTIVO" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Pago con:</span>
                <span>{fmt(receipt.cashReceived)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "bold",
                }}
              >
                <span>Cambio:</span>
                <span>{fmt(receipt.change)}</span>
              </div>
            </>
          )}
          <div style={{ textAlign: "center", margin: "6px 0 2px" }}>{line}</div>
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
