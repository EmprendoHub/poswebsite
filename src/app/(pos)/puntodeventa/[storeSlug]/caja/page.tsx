"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import POSSidebar from "../_components/POSSidebar";
import {
  MdLockOpen,
  MdLock,
  MdContentCut,
  MdAdd,
  MdRemove,
  MdPrint,
  MdShield,
  MdReceipt,
} from "react-icons/md";

/* ──────────────────── Types ──────────────────── */
interface CajaTotals {
  cashSales: number;
  cardSales: number;
  mixedCashSales: number;
  mixedCardSales: number;
  inflows: number;
  outflows: number;
  totalSales?: number;
  cancelledOrdersCount?: number;
  cancelledOrdersTotal?: number;
  cancelledOrders?: {
    orderId: number;
    amount: number;
    cancelledBy: string | null;
  }[];
}
interface CajaSession {
  _id: string;
  storeName: string;
  openedByName: string;
  openedAt: string;
  openingCash: number;
  status: string;
  totals: CajaTotals;
  expectedCash: number;
}
interface CorteRecord {
  _id: string;
  type: "corte" | "cierre";
  cutNumber: number;
  storeName?: string;
  periodStart: string;
  periodEnd: string;
  generatedByName: string;
  declaredCash: number;
  expectedCash: number;
  difference: number;
  totals: CajaTotals;
  salesCount: number;
  notes?: string;
  createdAt: string;
}
interface MovementRecord {
  _id: string;
  type: "manual_in" | "manual_out";
  cashAmount: number;
  notes?: string;
  createdByName?: string;
  authorizedByName?: string;
  createdAt: string;
}

/* ──────────────────── Ticket component (58mm POS receipt) ──────────────────── */
function CajaTicket({
  cut,
  storeSlug,
}: {
  cut: CorteRecord | null;
  storeSlug: string;
}) {
  if (!cut) return null;

  const fmt = (n: number) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const isCierre = cut.type === "cierre";
  const line = "─".repeat(32);

  return (
    <div
      id="pos-ticket"
      className="font-mono text-black bg-white"
      style={{
        width: "95%",
        fontSize: "10px",
        padding: "8mm",
        lineHeight: "1.4",
        textTransform: "uppercase",
        fontWeight: "bold",
      }}
    >
      {/* Header */}
      <div className="text-center font-bold text-sm mb-1">
        SUPER COLLECTIBLES
      </div>
      <div className="text-center text-xs mb-1">
        {cut.storeName ?? storeSlug}
      </div>
      <div className="text-center text-xs mb-2">
        {isCierre ? "*** CIERRE DE CAJA ***" : "*** CORTE DE CAJA ***"}
      </div>

      <div className="text-xs text-center mb-1">{line}</div>

      <div className="flex justify-between text-xs">
        <span>Folio:</span>
        <span>#{cut.cutNumber}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Fecha:</span>
        <span>{fmtDate(cut.createdAt)}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Cajero:</span>
        <span>{cut.generatedByName}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Período:</span>
        <span>{fmtDate(cut.periodStart).split(",")[0]}</span>
      </div>
      <div className="flex justify-between text-xs mb-1">
        <span>De {fmtDate(cut.periodStart).split(",")[1]}</span>
        <span>a {fmtDate(cut.periodEnd).split(",")[1]}</span>
      </div>

      <div className="text-xs text-center mb-1">{line}</div>
      <div className="text-xs font-bold text-center mb-1">VENTAS</div>

      <div className="flex justify-between text-xs">
        <span>Efectivo:</span>
        <span>{fmt(cut.totals.cashSales + cut.totals.mixedCashSales)}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Terminal:</span>
        <span>{fmt(cut.totals.cardSales + cut.totals.mixedCardSales)}</span>
      </div>
      {/* <div className="flex justify-between text-xs">
        <span>Mixto (efe):</span>
        <span>{fmt(cut.totals.mixedCashSales)}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Mixto (tar):</span>
        <span>{fmt(cut.totals.mixedCardSales)}</span>
      </div> */}
      <div className="flex justify-between text-xs font-bold">
        <span>TOTAL VENTAS:</span>
        <span>
          {fmt(
            cut.totals.cashSales +
              cut.totals.cardSales +
              cut.totals.mixedCashSales +
              cut.totals.mixedCardSales,
          )}
        </span>
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span># Transacciones:</span>
        <span>{cut.salesCount}</span>
      </div>

      {(cut.totals.cancelledOrdersCount ?? 0) > 0 && (
        <>
          <div className="text-xs text-center my-1">{line}</div>
          <div className="text-xs font-bold text-center mb-1">
            ÓRDENES CANCELADAS
          </div>
          <div className="flex justify-between text-xs">
            <span>Cantidad:</span>
            <span>{cut.totals.cancelledOrdersCount ?? 0}</span>
          </div>
        
          {cut.totals.cancelledOrders?.map((o, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span>
                #{o.orderId} {o.cancelledBy ? `- ${o.cancelledBy.substring(0,10)}` : ""}
              </span>
              <span>{fmt(o.amount)}</span>
            </div>
          ))}
            <div className="flex justify-between text-xs">
            <span>Total:</span>
            <span className="font-bold text-red-600">{fmt(cut.totals.cancelledOrdersTotal ?? 0)}</span>
          </div>
        </>
      )}

      <div className="text-xs text-center my-1">{line}</div>
      <div className="text-xs font-bold text-center mb-1">CAJA</div>

      <div className="flex justify-between text-xs">
        <span>Entradas manuales:</span>
        <span>{fmt(cut.totals.inflows)}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Salidas manuales:</span>
        <span>{fmt(cut.totals.outflows)}</span>
      </div>

      <div className="text-xs text-center my-1">{line}</div>

      <div className="flex justify-between text-xs font-bold">
        <span>Efectivo esperado:</span>
        <span>{fmt(cut.expectedCash)}</span>
      </div>
      <div className="flex justify-between text-xs font-bold">
        <span>Efectivo declarado:</span>
        <span>{fmt(cut.declaredCash)}</span>
      </div>
      <div
        className={`flex justify-between text-xs font-bold ${cut.difference !== 0 ? "text-red-600" : "text-green-600"}`}
      >
        <span>Diferencia:</span>
        <span>
          {cut.difference >= 0 ? "+" : ""}
          {fmt(cut.difference)}
        </span>
      </div>

      {cut.notes ? (
        <>
          <div className="text-xs text-center my-1">{line}</div>
          <div className="text-xs">Nota: {cut.notes}</div>
        </>
      ) : null}

      <div className="text-xs text-center my-1">{line}</div>
      <div className="text-xs text-center mt-1">FIRMA DEL CAJERO</div>
      <div className="text-xs text-center mt-4 mb-1">____________________</div>
      <div className="text-xs text-center">{cut.generatedByName}</div>
      <div className="text-xs text-center mt-3 mb-1">FIRMA DEL SUPERVISOR</div>
      <div className="text-xs text-center mt-4 mb-1">____________________</div>
      <div className="text-xs text-center mt-2">
        {isCierre ? "CORTE DE CAJA" : "CONTINUACIÓN DE TURNO"}
      </div>
    </div>
  );
}

/* ──────────────────── Main page ──────────────────── */
export default function CajaPage() {
  const params = useParams();
  const storeSlug = params?.storeSlug as string;

  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [activeSession, setActiveSession] = useState<CajaSession | null>(null);
  const [recentCuts, setRecentCuts] = useState<CorteRecord[]>([]);
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & search
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCorteModal, setShowCorteModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showMovModal, setShowMovModal] = useState<"in" | "out" | null>(null);
  // pending direction while manager code is being verified
  const [showManagerCodeFor, setShowManagerCodeFor] = useState<
    "in" | "out" | "expense" | null
  >(null);
  const [authorizedManager, setAuthorizedManager] = useState<{
    _id: string;
    name: string;
    role: string;
  } | null>(null);

  // Forms
  const [openingCash, setOpeningCash] = useState("0");
  const [declaredCash, setDeclaredCash] = useState("");
  const [movAmount, setMovAmount] = useState("");
  const [movNotes, setMovNotes] = useState("");
  const [cutNotes, setCutNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // Expense form states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("otros");
  const [expenseDescription, setExpenseDescription] = useState("");

  // Last cut — for printing
  const [lastCut, setLastCut] = useState<CorteRecord | null>(null);
  const [showPrintTicket, setShowPrintTicket] = useState(false);

  const ticketRef = useRef<HTMLDivElement>(null);

  /* ── Fetch state ── */
  const fetchState = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const res = await fetch(`/api/pos/caja/state?storeId=${storeId}`);
    const data = await res.json();
    if (data?.recentCuts?.length > 0) {
      console.log("First cut cancelled orders:", {
        count: data.recentCuts[0].totals?.cancelledOrdersCount,
        total: data.recentCuts[0].totals?.cancelledOrdersTotal,
      });
    }
    setActiveSession(data?.activeSession ?? null);
    setRecentCuts(data?.recentCuts ?? []);
    setMovements(data?.movements ?? []);
    setLoading(false);
  }, [storeId]);

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
    fetchState();
  }, [fetchState]);

  /* ── Helpers ── */
  const fmt = (n: number) =>
    n?.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) ?? "$0";
  const fmtDate = (d: string) =>
    new Date(d).toLocaleString("es-MX", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  /* ── Open caja ── */
  async function handleOpenCaja() {
    if (!storeId) return;
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch("/api/pos/caja/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          openingCash: Number(openingCash),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error al abrir caja");
      setShowOpenModal(false);
      setOpeningCash("0");
      await fetchState();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  /* ── Manual movement ── */
  async function handleManualMovement() {
    if (!activeSession) return;
    if (!movAmount || Number(movAmount) <= 0) {
      setActionError("Ingresa un monto válido");
      return;
    }
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch("/api/pos/caja/movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession._id,
          type: showMovModal === "in" ? "manual_in" : "manual_out",
          cashAmount: Number(movAmount),
          notes: movNotes,
          authorizedById: authorizedManager?._id ?? null,
          authorizedByName: authorizedManager?.name ?? null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error al registrar movimiento");
      setShowMovModal(null);
      setMovAmount("");
      setMovNotes("");
      setAuthorizedManager(null);
      await fetchState();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  /* ── Expense ── */
  async function handleExpense() {
    if (!activeSession) return;
    if (!expenseAmount || Number(expenseAmount) <= 0) {
      setActionError("Ingresa un monto válido");
      return;
    }
    if (!expenseDescription.trim()) {
      setActionError("Ingresa una descripción del gasto");
      return;
    }
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch("/api/pos/caja/expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession._id,
          amount: Number(expenseAmount),
          category: expenseCategory,
          description: expenseDescription.trim(),
          authorizedById: authorizedManager?._id ?? null,
          authorizedByName: authorizedManager?.name ?? null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error al registrar gasto");
      setShowExpenseModal(false);
      setExpenseAmount("");
      setExpenseCategory("otros");
      setExpenseDescription("");
      setAuthorizedManager(null);
      await fetchState();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  /* ── Corte de caja ── */
  async function handleCorte(isCierre = false) {
    if (!activeSession) return;
    setActionLoading(true);
    setActionError("");
    try {
      const endpoint = isCierre ? "/api/pos/caja/close" : "/api/pos/caja/corte";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession._id,
          declaredCash: declaredCash !== "" ? Number(declaredCash) : undefined,
          notes: cutNotes,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error al procesar corte");
      setLastCut(d.cut);
      setShowCorteModal(false);
      setShowCloseModal(false);
      setDeclaredCash("");
      setCutNotes("");
      setShowPrintTicket(true);
      await fetchState();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  /* ── Print ticket ── */
  function printTicket() {
    window.print();
  }

  // Auto-send corte ticket to printer as soon as the overlay appears, then close on afterprint
  useEffect(() => {
    if (!showPrintTicket) return;
    const t = setTimeout(() => window.print(), 150);
    const close = () => setShowPrintTicket(false);
    window.addEventListener("afterprint", close);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", close);
    };
  }, [showPrintTicket]);

  const expectedCash = activeSession?.expectedCash ?? 0;
  const totalSales = activeSession
    ? activeSession.totals.cashSales +
      activeSession.totals.cardSales +
      activeSession.totals.mixedCashSales +
      activeSession.totals.mixedCardSales
    : 0;

  // Filter cuts based on search query
  const filteredCuts = recentCuts.filter((cut) => {
    const query = searchQuery;
    return (
      cut.cutNumber.toString().includes(query) ||
      new Date(cut.createdAt).toLocaleDateString("es-MX").includes(query)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredCuts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCuts = filteredCuts.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="flex h-screen bg-background">
      <POSSidebar storeSlug={storeSlug} storeName={storeName} />

      {/* ── Print ticket overlay (only shown on screen before printing) ── */}
      {showPrintTicket && lastCut && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center print:bg-transparent print:inset-auto print:z-auto print:relative print:flex print:items-start">
          <div className="bg-white rounded-xl shadow-xl p-4 flex flex-col items-center gap-4 print:shadow-none print:p-0 print:rounded-none">
            <div className="no-print flex gap-3 items-center">
              <span className="font-semibold text-black">
                {lastCut.type === "cierre"
                  ? "Cierre generado"
                  : "Corte generado"}{" "}
                #{lastCut.cutNumber}
              </span>
              <button
                onClick={printTicket}
                className="flex items-center gap-1 bg-primary text-white text-sm px-4 py-2 rounded-lg"
              >
                <MdPrint size={16} /> Reimprimir
              </button>
              <button
                onClick={() => setShowPrintTicket(false)}
                className="text-gray-500 text-sm underline"
              >
                Cerrar
              </button>
            </div>
            <div ref={ticketRef}>
              <CajaTicket cut={lastCut} storeSlug={storeSlug} />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 no-print">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Caja</h1>
            <p className="text-xs text-muted-foreground">{storeName}</p>
          </div>
          {!activeSession && (
            <button
              onClick={() => setShowOpenModal(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold"
            >
              <MdLockOpen size={18} /> Abrir Caja
            </button>
          )}
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground animate-pulse">
            Cargando...
          </p>
        )}

        {!loading && !activeSession && (
          <div className="flex flex-col items-center justify-center gap-3 mt-12">
            <MdLock size={40} className="text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              No hay caja abierta.
            </p>
            <button
              onClick={() => setShowOpenModal(true)}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-semibold"
            >
              Abrir Caja
            </button>
          </div>
        )}

        {!loading && activeSession && (
          <>
            {/* Status bar */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl px-5 py-3 flex flex-wrap gap-4 items-center mb-6">
              <MdLockOpen size={20} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Cajero</p>
                <p className="font-semibold text-sm">
                  {activeSession.openedByName}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Apertura</p>
                <p className="font-semibold text-sm">
                  {fmtDate(activeSession.openedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fondo inicial</p>
                <p className="font-semibold text-sm">
                  {fmt(activeSession.openingCash)}
                </p>
              </div>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => {
                    setActionError("");
                    setShowManagerCodeFor("in");
                  }}
                  className="flex items-center gap-1 text-xs bg-muted hover:bg-green-100 dark:hover:bg-green-900 px-3 py-2 rounded-lg transition-colors"
                >
                  <MdAdd size={14} /> Entrada
                </button>
                <button
                  onClick={() => {
                    setActionError("");
                    setShowManagerCodeFor("out");
                  }}
                  className="flex items-center gap-1 text-xs bg-muted hover:bg-red-100 dark:hover:bg-red-900 px-3 py-2 rounded-lg transition-colors"
                >
                  <MdRemove size={14} /> Salida
                </button>
                <button
                  onClick={() => {
                    setActionError("");
                    setShowManagerCodeFor("expense");
                  }}
                  className="flex items-center gap-1 text-xs bg-muted hover:bg-amber-100 dark:hover:bg-amber-900 px-3 py-2 rounded-lg transition-colors"
                >
                  <MdReceipt size={14} /> Gasto
                </button>
                {/* <button
                  onClick={() => {
                    setShowCorteModal(true);
                    setActionError("");
                  }}
                  className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-2 rounded-lg"
                >
                  <MdContentCut size={14} /> Corte
                </button> */}
                <button
                  onClick={() => {
                    setShowCloseModal(true);
                    setActionError("");
                  }}
                  className="flex items-center gap-1 text-xs bg-red-600 text-white px-3 py-2 rounded-lg"
                >
                  <MdLock size={14} /> Cerrar Caja
                </button>
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                {
                  label: "Ventas Totales",
                  value: fmt(totalSales),
                  color: "text-red-400",
                },
                {
                  label: "Efectivo en Caja",
                  value: fmt(expectedCash),
                  color: "text-green-600",
                },
                {
                  label: "Terminal",
                  value: fmt(
                    activeSession.totals.cardSales +
                      activeSession.totals.mixedCardSales,
                  ),
                  color: "text-blue-500",
                },
                {
                  label: "Entradas / Salidas",
                  value: `${fmt(activeSession.totals.inflows)} / ${fmt(activeSession.totals.outflows)}`,
                  color: "text-muted-foreground",
                },
              ].map((c) => (
                <div
                  key={c.label}
                  className="bg-card border border-muted rounded-xl px-4 py-4"
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    {c.label}
                  </p>
                  <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Movements list */}
            {movements.length > 0 && (
              <>
                <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  Entradas y Salidas del turno
                </h2>
                <div className="overflow-x-auto rounded-xl border border-muted mb-6">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs text-muted-foreground uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Tipo</th>
                        <th className="px-4 py-3 text-left">Hora</th>
                        <th className="px-4 py-3 text-right">Monto</th>
                        <th className="px-4 py-3 text-left">Nota</th>
                        <th className="px-4 py-3 text-left">Registró</th>
                        <th className="px-4 py-3 text-left">Autorizó</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((m) => {
                        const isExpense =
                          m.type === "manual_out" &&
                          !!m.notes?.startsWith("[Gasto -");
                        return (
                          <tr key={m._id} className="border-t border-muted">
                            <td className="px-4 py-3">
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  m.type === "manual_in"
                                    ? "bg-green-100 text-green-700"
                                    : isExpense
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-600"
                                }`}
                              >
                                {m.type === "manual_in"
                                  ? "↑ ENTRADA"
                                  : isExpense
                                    ? "💸 GASTO"
                                    : "↓ SALIDA"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {fmtDate(m.createdAt)}
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-bold ${
                                m.type === "manual_in"
                                  ? "text-green-600"
                                  : isExpense
                                    ? "text-amber-600"
                                    : "text-red-500"
                              }`}
                            >
                              {m.type === "manual_out" ? "-" : "+"}
                              {fmt(m.cashAmount)}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {isExpense
                                ? m.notes!.replace(/^\[Gasto - [^\]]+\] /, "")
                                : (m.notes ?? "—")}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {m.createdByName ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {m.authorizedByName ? (
                                <span className="flex items-center gap-1">
                                  <MdShield
                                    size={12}
                                    className="text-primary"
                                  />
                                  {m.authorizedByName}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* Recent cuts table */}
        {recentCuts.length > 0 && (
          <>
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Cortes recientes
            </h2>

            {/* Search bar */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar por folio o fecha..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm outline-none border border-muted focus:border-primary transition-colors"
              />
            </div>

            {filteredCuts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No se encontraron cortes.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-muted mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs text-muted-foreground uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Tipo</th>
                        <th className="px-4 py-3 text-left">Folio</th>
                        <th className="px-4 py-3 text-left">Cajero</th>
                        <th className="px-4 py-3 text-left">Fecha</th>
                        <th className="px-4 py-3 text-right">Ventas</th>
                        <th className="px-4 py-3 text-right">Entradas</th>
                        <th className="px-4 py-3 text-right">Salidas</th>
                        <th className="px-4 py-3 text-right">Efe. Esp.</th>
                        <th className="px-4 py-3 text-right">Declarado</th>
                        <th className="px-4 py-3 text-right">Dif.</th>
                        <th className="px-4 py-3 text-center">Imp.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCuts.map((c) => (
                        <tr key={c._id} className="border-t border-muted">
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.type === "cierre" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}
                            >
                              {c.type === "cierre" ? "CIERRE" : "CORTE"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold">
                            #{c.cutNumber}
                          </td>
                          <td className="px-4 py-3">{c.generatedByName}</td>
                          <td className="px-4 py-3 text-xs">
                            {fmtDate(c.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {fmt(
                              c.totals.cashSales +
                                c.totals.cardSales +
                                c.totals.mixedCashSales +
                                c.totals.mixedCardSales,
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-green-600">
                            {fmt(c.totals.inflows)}
                          </td>
                          <td className="px-4 py-3 text-right text-red-500">
                            {fmt(c.totals.outflows)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {fmt(c.expectedCash)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {fmt(c.declaredCash)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-bold ${c.difference < 0 ? "text-red-500" : c.difference > 0 ? "text-amber-500" : "text-green-600"}`}
                          >
                            {c.difference >= 0 ? "+" : ""}
                            {fmt(c.difference)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                
                                setLastCut(c);
                                setShowPrintTicket(true);
                              }}
                              className="text-muted-foreground hover:text-foreground"
                              title="Reimprimir"
                            >
                              <MdPrint size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination controls */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Mostrando{" "}
                    <span className="font-semibold">
                      {startIndex + 1}-{Math.min(endIndex, filteredCuts.length)}
                    </span>{" "}
                    de{" "}
                    <span className="font-semibold">{filteredCuts.length}</span>{" "}
                    cortes
                  </p>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-muted text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="text-xs text-muted-foreground min-w-[80px] text-center">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-muted text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ─────────────── Modals ─────────────── */}
      {showOpenModal && (
        <Modal title="Abrir Caja" onClose={() => setShowOpenModal(false)}>
          <p className="text-xs text-muted-foreground mb-3">
            Ingresa el fondo inicial de efectivo en caja.
          </p>
          <label className="text-xs text-muted-foreground mb-1 block">
            Fondo inicial ($)
          </label>
          <input
            type="number"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none mb-4"
            min={0}
          />
          {actionError && (
            <p className="text-xs text-red-500 mb-3">{actionError}</p>
          )}
          <button
            onClick={handleOpenCaja}
            disabled={actionLoading}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm disabled:opacity-50"
          >
            {actionLoading ? "Abriendo..." : "Abrir Caja"}
          </button>
        </Modal>
      )}

      {showManagerCodeFor && (
        <ManagerCodeModal
          direction={showManagerCodeFor}
          onAuthorized={(employee) => {
            setAuthorizedManager(employee);
            if (showManagerCodeFor === "expense") {
              setShowExpenseModal(true);
            } else {
              setShowMovModal(showManagerCodeFor as "in" | "out");
            }
            setShowManagerCodeFor(null);
          }}
          onClose={() => setShowManagerCodeFor(null)}
        />
      )}

      {showMovModal && (
        <Modal
          title={
            showMovModal === "in" ? "Entrada de Efectivo" : "Salida de Efectivo"
          }
          onClose={() => {
            setShowMovModal(null);
            setAuthorizedManager(null);
          }}
        >
          {authorizedManager && (
            <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2 mb-3 flex items-center gap-1">
              <MdShield size={14} className="flex-shrink-0" />
              Autorizado por:{" "}
              <span className="font-semibold ml-1">
                {authorizedManager.name}
              </span>
            </p>
          )}
          <label className="text-xs text-muted-foreground mb-1 block">
            Monto ($)
          </label>
          <input
            type="number"
            value={movAmount}
            onChange={(e) => setMovAmount(e.target.value)}
            className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none mb-3"
            min={0}
            placeholder="0.00"
          />
          <label className="text-xs text-muted-foreground mb-1 block">
            Nota / Motivo
          </label>
          <input
            type="text"
            value={movNotes}
            onChange={(e) => setMovNotes(e.target.value)}
            className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none mb-4"
            placeholder="Ej. Fondo cambio, retiro…"
          />
          {actionError && (
            <p className="text-xs text-red-500 mb-3">{actionError}</p>
          )}
          <button
            onClick={handleManualMovement}
            disabled={actionLoading}
            className={`w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50 text-white ${showMovModal === "in" ? "bg-green-600" : "bg-red-600"}`}
          >
            {actionLoading
              ? "Guardando..."
              : showMovModal === "in"
                ? "Registrar Entrada"
                : "Registrar Salida"}
          </button>
        </Modal>
      )}

      {showExpenseModal && (
        <Modal
          title="Registrar Gasto"
          onClose={() => {
            setShowExpenseModal(false);
            setAuthorizedManager(null);
          }}
        >
          {authorizedManager && (
            <p className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2 mb-3 flex items-center gap-1">
              <MdShield size={14} className="flex-shrink-0" />
              Autorizado por:{" "}
              <span className="font-semibold ml-1">
                {authorizedManager.name}
              </span>
            </p>
          )}
          <label className="text-xs text-muted-foreground mb-1 block">
            Categoría
          </label>
          <select
            value={expenseCategory}
            onChange={(e) => setExpenseCategory(e.target.value)}
            className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none mb-3"
          >
            <option value="renta">Renta</option>
            <option value="servicios">Servicios</option>
            <option value="nomina">Nómina</option>
            <option value="inventario">Inventario</option>
            <option value="marketing">Marketing</option>
            <option value="equipamiento">Equipamiento</option>
            <option value="transporte">Transporte</option>
            <option value="impuestos">Impuestos</option>
            <option value="otros">Otros</option>
          </select>
          <label className="text-xs text-muted-foreground mb-1 block">
            Monto ($)
          </label>
          <input
            type="number"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none mb-3"
            min={0}
            placeholder="0.00"
          />
          <label className="text-xs text-muted-foreground mb-1 block">
            Descripción
          </label>
          <textarea
            value={expenseDescription}
            onChange={(e) => setExpenseDescription(e.target.value)}
            rows={2}
            className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none mb-4 resize-none"
            placeholder="Ej. Pago de electricidad, insumos de limpieza…"
          />
          {actionError && (
            <p className="text-xs text-red-500 mb-3">{actionError}</p>
          )}
          <button
            onClick={handleExpense}
            disabled={actionLoading}
            className="w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50 text-white bg-amber-600"
          >
            {actionLoading ? "Guardando..." : "Registrar Gasto"}
          </button>
        </Modal>
      )}

      {showCorteModal && (
        <CutModal
          title="Corte de Caja"
          subtitle="Registra las ventas desde el último corte hasta ahora."
          expectedCash={expectedCash}
          declaredCash={declaredCash}
          setDeclaredCash={setDeclaredCash}
          notes={cutNotes}
          setNotes={setCutNotes}
          actionLoading={actionLoading}
          actionError={actionError}
          onConfirm={() => handleCorte(false)}
          onClose={() => setShowCorteModal(false)}
          confirmLabel="Generar Corte"
          confirmClass="bg-primary text-primary-foreground"
        />
      )}

      {showCloseModal && (
        <CutModal
          title="Cerrar Caja"
          subtitle="Cierra la sesión de caja. Cubre todas las ventas desde la apertura."
          expectedCash={expectedCash}
          declaredCash={declaredCash}
          setDeclaredCash={setDeclaredCash}
          notes={cutNotes}
          setNotes={setCutNotes}
          actionLoading={actionLoading}
          actionError={actionError}
          onConfirm={() => handleCorte(true)}
          onClose={() => setShowCloseModal(false)}
          confirmLabel="Cerrar Caja"
          confirmClass="bg-red-600 text-white"
        />
      )}
    </div>
  );
}

/* ──────────────────── Manager code verification modal ──────────────────── */
function ManagerCodeModal({
  direction,
  onAuthorized,
  onClose,
}: {
  direction: "in" | "out" | "expense";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
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
            Ingresa el código de manager para autorizar{" "}
            <span className="font-semibold">
              {direction === "in"
                ? "la entrada de efectivo"
                : direction === "out"
                  ? "la salida de efectivo"
                  : "el registro de gasto"}
            </span>
            .
          </p>
          <input
            type="password"
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(v);
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
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Autorizar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────── Shared modal wrapper ──────────────────── */
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-muted">
          <h2 className="font-bold text-base">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ──────────────────── Cut modal (corte / cierre) ──────────────────── */
function CutModal({
  title,
  subtitle,
  expectedCash,
  declaredCash,
  setDeclaredCash,
  notes,
  setNotes,
  actionLoading,
  actionError,
  onConfirm,
  onClose,
  confirmLabel,
  confirmClass,
}: {
  title: string;
  subtitle: string;
  expectedCash: number;
  declaredCash: string;
  setDeclaredCash: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  actionLoading: boolean;
  actionError: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmLabel: string;
  confirmClass: string;
}) {
  const fmt = (n: number) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

  const declared = declaredCash !== "" ? Number(declaredCash) : expectedCash;
  const difference = declared - expectedCash;

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-muted-foreground">Efectivo esperado:</span>
        <span className="font-bold">{fmt(expectedCash)}</span>
      </div>
      <label className="text-xs text-muted-foreground mb-1 block">
        Efectivo contado ($)
      </label>
      <input
        type="number"
        placeholder={String(expectedCash.toFixed(2))}
        value={declaredCash}
        onChange={(e) => setDeclaredCash(e.target.value)}
        className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none mb-2"
      />
      <div
        className={`flex justify-between text-xs mb-3 ${difference < 0 ? "text-red-500" : difference > 0 ? "text-amber-500" : "text-green-600"}`}
      >
        <span>Diferencia:</span>
        <span className="font-bold">
          {difference >= 0 ? "+" : ""}
          {fmt(difference)}
        </span>
      </div>
      <label className="text-xs text-muted-foreground mb-1 block">
        Notas (opcional)
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none mb-4 resize-none"
        placeholder="Observaciones..."
      />
      {actionError && (
        <p className="text-xs text-red-500 mb-3">{actionError}</p>
      )}
      <button
        onClick={onConfirm}
        disabled={actionLoading}
        className={`w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50 ${confirmClass}`}
      >
        {actionLoading ? "Procesando..." : confirmLabel}
      </button>
    </Modal>
  );
}
