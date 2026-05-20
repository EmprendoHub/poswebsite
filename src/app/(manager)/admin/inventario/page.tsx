"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  MdBarChart,
  MdCheckCircle,
  MdClose,
  MdDelete,
  MdDownload,
  MdInventory,
  MdQrCodeScanner,
  MdRefresh,
  MdStorefront,
  MdWarning,
} from "react-icons/md";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Store {
  _id: string;
  name: string;
  slug: string;
}

interface ScannedItem {
  variationId: string;
  productId: string;
  productTitle: string;
  variationTitle?: string;
  sku?: string;
  image?: string;
  physicalCount: number;
  systemCount: number;
  difference: number;
}

interface CheckSession {
  _id: string;
  storeName: string;
  status: "in_progress" | "finalized";
  scannedItems: ScannedItem[];
  startedByName: string;
  startedAt: string;
  finalizedAt?: string;
  totalScanned: number;
  totalMatched: number;
  totalDiscrepancies: number;
}

interface LookupResult {
  productId: string;
  productTitle: string;
  variationId: string;
  variationTitle: string;
  sku: string;
  image: string;
  systemCount: number;
}

type View = "store-select" | "scanning" | "report";

// ─── Component ─────────────────────────────────────────────────────────────────
export default function InventarioPage() {
  const [view, setView] = useState<View>("store-select");
  const [stores, setStores] = useState<Store[]>([]);
  const [pastSessions, setPastSessions] = useState<CheckSession[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [activeSession, setActiveSession] = useState<CheckSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Scanning state
  const [scanQuery, setScanQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | "">(1);

  const scanInputRef = useRef<HTMLInputElement>(null);

  // ── Load stores on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/inventory-check");
    const data = await res.json();
    setStores(data.stores || []);
    setPastSessions(data.sessions || []);
    setLoading(false);
  };

  const fetchSessionsForStore = async (storeId: string) => {
    const res = await fetch(`/api/admin/inventory-check?storeId=${storeId}`);
    const data = await res.json();
    setPastSessions(data.sessions || []);
  };

  // ── Start new session ────────────────────────────────────────────────────────
  const handleStartNew = async (store: Store) => {
    setSaving(true);
    const res = await fetch("/api/admin/inventory-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: store._id }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSelectedStore(store);
      setActiveSession(data.session);
      setView("scanning");
      setTimeout(() => scanInputRef.current?.focus(), 200);
    }
  };

  // ── Resume existing session ──────────────────────────────────────────────────
  const handleResume = async (session: CheckSession, store: Store) => {
    setLoading(true);
    const res = await fetch(`/api/admin/inventory-check/${session._id}`);
    const data = await res.json();
    setLoading(false);
    setSelectedStore(store);
    setActiveSession(data.session);
    setView("scanning");
    setTimeout(() => scanInputRef.current?.focus(), 200);
  };

  // ── View finalized report ────────────────────────────────────────────────────
  const handleViewReport = async (session: CheckSession, store: Store) => {
    setLoading(true);
    const res = await fetch(`/api/admin/inventory-check/${session._id}`);
    const data = await res.json();
    setLoading(false);
    setSelectedStore(store);
    setActiveSession(data.session);
    setView("report");
  };

  // ── Lookup by scan/SKU ───────────────────────────────────────────────────────
  const handleLookup = useCallback(
    async (query: string) => {
      if (!query.trim() || !selectedStore) return;
      setLookupLoading(true);
      setLookupError("");
      setLookupResult(null);
      const res = await fetch(
        `/api/admin/inventory-check/lookup?storeId=${selectedStore._id}&query=${encodeURIComponent(query.trim())}`,
      );
      const data = await res.json();
      setLookupLoading(false);
      if (!res.ok) {
        setLookupError(data.error || "Producto no encontrado");
      } else {
        setLookupResult(data);
        setPendingCount(1);
      }
    },
    [selectedStore],
  );

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleLookup(scanQuery);
    }
  };

  // ── Add / update scanned item ────────────────────────────────────────────────
  const handleAddCount = async () => {
    if (!lookupResult || !activeSession || pendingCount === "") return;
    setSaving(true);
    const res = await fetch(`/api/admin/inventory-check/${activeSession._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...lookupResult,
        physicalCount: Number(pendingCount),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setActiveSession(data.session);
      setLookupResult(null);
      setScanQuery("");
      setPendingCount(1);
      setLookupError("");
      scanInputRef.current?.focus();
    }
  };

  // ── Remove scanned item ──────────────────────────────────────────────────────
  const handleRemoveItem = async (variationId: string) => {
    if (!activeSession) return;
    const res = await fetch(
      `/api/admin/inventory-check/${activeSession._id}?variationId=${variationId}`,
      { method: "DELETE" },
    );
    const data = await res.json();
    if (res.ok) setActiveSession(data.session);
  };

  // ── Finalize session → go to report ─────────────────────────────────────────
  const handleFinalize = async () => {
    if (!activeSession) return;
    if (!confirm("¿Finalizar conteo? Ya no podrás modificar los datos."))
      return;
    setFinalizing(true);
    const res = await fetch(
      `/api/admin/inventory-check/${activeSession._id}/finalize`,
      { method: "POST" },
    );
    const data = await res.json();
    setFinalizing(false);
    if (res.ok) {
      setActiveSession(data.session);
      setView("report");
    }
  };

  // ── Export report to CSV ─────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!activeSession) return;
    const rows = [
      [
        "Producto",
        "Variación",
        "SKU",
        "Conteo Físico",
        "Sistema",
        "Diferencia",
      ],
      ...activeSession.scannedItems.map((i) => [
        `"${i.productTitle}"`,
        `"${i.variationTitle || ""}"`,
        `"${i.sku || ""}"`,
        i.physicalCount,
        i.systemCount,
        i.difference,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conteo-${selectedStore?.name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render: store select ─────────────────────────────────────────────────────
  if (view === "store-select") {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <MdInventory size={28} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Conteo de Inventario</h1>
            <p className="text-muted-foreground text-sm">
              Escanea productos y compara el conteo físico contra el sistema
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Cargando sucursales...</p>
        ) : (
          <div className="grid gap-4">
            {stores.map((store) => {
              const storeSessions = pastSessions.filter(
                (s) =>
                  (s as any).store === store._id || s.storeName === store.name,
              );
              const inProgress = storeSessions.find(
                (s) => s.status === "in_progress",
              );
              const finalized = storeSessions.filter(
                (s) => s.status === "finalized",
              );

              return (
                <div
                  key={store._id}
                  className="border border-muted rounded-xl p-5 bg-card"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <MdStorefront size={20} className="text-primary" />
                    <h2 className="font-semibold">{store.name}</h2>
                    {inProgress && (
                      <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                        En progreso
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleStartNew(store)}
                      disabled={saving}
                      className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      + Nuevo conteo
                    </button>

                    {inProgress && (
                      <button
                        onClick={() => handleResume(inProgress, store)}
                        className="text-sm bg-yellow-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Continuar conteo ({inProgress.scannedItems?.length ?? 0}{" "}
                        escaneados)
                      </button>
                    )}

                    {finalized.length > 0 && (
                      <button
                        onClick={() => handleViewReport(finalized[0], store)}
                        className="text-sm border border-muted px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <MdBarChart className="inline mr-1" />
                        Último reporte (
                        {new Date(finalized[0].finalizedAt!).toLocaleDateString(
                          "es-MX",
                        )}
                        )
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Render: scanning ─────────────────────────────────────────────────────────
  if (view === "scanning") {
    const items = activeSession?.scannedItems ?? [];

    return (
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              setView("store-select");
              fetchStores();
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Sucursales
          </button>
          <span className="text-muted-foreground">/</span>
          <h1 className="font-bold text-lg">{selectedStore?.name}</h1>
          <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
            En progreso · {items.length} escaneados
          </span>
        </div>

        {/* Scanner input */}
        <div className="border border-muted rounded-xl p-5 bg-card mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MdQrCodeScanner size={20} className="text-primary" />
            <h2 className="font-semibold text-sm">Escanear producto</h2>
          </div>
          <div className="flex gap-2">
            <input
              ref={scanInputRef}
              type="text"
              value={scanQuery}
              onChange={(e) => setScanQuery(e.target.value)}
              onKeyDown={handleScanKeyDown}
              placeholder="Escanea código de barras / QR o escribe el SKU…"
              className="flex-1 bg-muted rounded-lg px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => handleLookup(scanQuery)}
              disabled={lookupLoading || !scanQuery.trim()}
              className="bg-primary text-primary-foreground px-5 py-3 rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {lookupLoading ? "…" : "Buscar"}
            </button>
          </div>

          {lookupError && (
            <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
              <MdWarning /> {lookupError}
            </p>
          )}

          {/* Found product */}
          {lookupResult && (
            <div className="mt-4 border border-primary/30 rounded-lg p-4 bg-primary/5 flex items-start gap-4">
              {lookupResult.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={lookupResult.image}
                  alt={lookupResult.productTitle}
                  className="w-14 h-14 object-cover rounded-lg border border-muted flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {lookupResult.productTitle}
                </p>
                {lookupResult.variationTitle && (
                  <p className="text-xs text-muted-foreground">
                    {lookupResult.variationTitle}
                  </p>
                )}
                {lookupResult.sku && (
                  <p className="text-xs text-muted-foreground">
                    SKU: {lookupResult.sku}
                  </p>
                )}
                <p className="text-xs mt-1">
                  Sistema: <strong>{lookupResult.systemCount}</strong> unidades
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <label className="text-xs text-muted-foreground">Conteo:</label>
                <input
                  type="number"
                  min={0}
                  value={pendingCount}
                  onChange={(e) =>
                    setPendingCount(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleAddCount()}
                  className="w-20 bg-background border border-muted rounded-lg px-3 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleAddCount}
                  disabled={saving || pendingCount === ""}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  {saving ? "…" : "Agregar"}
                </button>
                <button
                  onClick={() => {
                    setLookupResult(null);
                    setScanQuery("");
                    scanInputRef.current?.focus();
                  }}
                  className="text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <MdClose size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scanned items list */}
        {items.length > 0 && (
          <div className="border border-muted rounded-xl bg-card overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-muted bg-muted/30 flex items-center justify-between">
              <h2 className="font-semibold text-sm">Productos escaneados</h2>
              <button
                onClick={() => {
                  const id = activeSession!._id;
                  fetch(`/api/admin/inventory-check/${id}`).then((r) =>
                    r.json().then((d) => setActiveSession(d.session)),
                  );
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <MdRefresh size={16} />
              </button>
            </div>
            <div className="divide-y divide-muted">
              {items.map((item) => (
                <div
                  key={item.variationId}
                  className="px-5 py-3 flex items-center gap-4"
                >
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.productTitle}
                      className="w-10 h-10 object-cover rounded-md border border-muted flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.productTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.variationTitle && `${item.variationTitle} · `}
                      {item.sku && `SKU: ${item.sku}`}
                    </p>
                  </div>
                  <div className="text-center flex-shrink-0">
                    <p className="text-xs text-muted-foreground">Físico</p>
                    <p className="font-bold text-sm">{item.physicalCount}</p>
                  </div>
                  <div className="text-center flex-shrink-0">
                    <p className="text-xs text-muted-foreground">Sistema</p>
                    <p className="text-sm">{item.systemCount}</p>
                  </div>
                  <div className="text-center w-16 flex-shrink-0">
                    <p className="text-xs text-muted-foreground">Dif.</p>
                    <p
                      className={`font-bold text-sm ${
                        item.difference === 0
                          ? "text-emerald-600"
                          : item.difference > 0
                            ? "text-blue-600"
                            : "text-red-500"
                      }`}
                    >
                      {item.difference > 0
                        ? `+${item.difference}`
                        : item.difference}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.variationId)}
                    className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <MdDelete size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Finalize button */}
        <div className="flex justify-end">
          <button
            onClick={handleFinalize}
            disabled={finalizing || items.length === 0}
            className="bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {finalizing ? "Finalizando…" : "Finalizar conteo y generar reporte"}
          </button>
        </div>
      </div>
    );
  }

  // ── Render: report ────────────────────────────────────────────────────────────
  if (view === "report" && activeSession) {
    const items = activeSession.scannedItems;
    const matched = items.filter((i) => i.difference === 0);
    const surplus = items.filter((i) => i.difference > 0);
    const missing = items.filter((i) => i.difference < 0);

    return (
      <div className="max-w-5xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button
            onClick={() => {
              setView("store-select");
              fetchStores();
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Sucursales
          </button>
          <span className="text-muted-foreground">/</span>
          <h1 className="font-bold text-lg">
            Reporte de conteo · {selectedStore?.name}
          </h1>
          <span className="ml-auto text-xs text-muted-foreground">
            {new Date(
              activeSession.finalizedAt || activeSession.startedAt,
            ).toLocaleString("es-MX")}
          </span>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 text-sm border border-muted px-3 py-2 rounded-lg hover:bg-muted transition-colors"
          >
            <MdDownload size={16} /> Exportar CSV
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="border border-muted rounded-xl p-4 bg-card text-center">
            <p className="text-xs text-muted-foreground mb-1">
              Total escaneados
            </p>
            <p className="text-3xl font-bold">{items.length}</p>
          </div>
          <div className="border border-emerald-500/30 rounded-xl p-4 bg-emerald-50 dark:bg-emerald-950/20 text-center">
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-1">
              Coinciden
            </p>
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
              {matched.length}
            </p>
          </div>
          <div className="border border-blue-500/30 rounded-xl p-4 bg-blue-50 dark:bg-blue-950/20 text-center">
            <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">
              Sobrante
            </p>
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              {surplus.length}
            </p>
          </div>
          <div className="border border-red-500/30 rounded-xl p-4 bg-red-50 dark:bg-red-950/20 text-center">
            <p className="text-xs text-red-700 dark:text-red-400 mb-1">
              Faltante
            </p>
            <p className="text-3xl font-bold text-red-700 dark:text-red-400">
              {missing.length}
            </p>
          </div>
        </div>

        {/* Full table */}
        <div className="border border-muted rounded-xl bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Producto</th>
                <th className="px-4 py-3 text-left">Variación</th>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-center">Físico</th>
                <th className="px-4 py-3 text-center">Sistema</th>
                <th className="px-4 py-3 text-center">Diferencia</th>
                <th className="px-4 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted">
              {items.map((item) => (
                <tr
                  key={item.variationId}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {item.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.productTitle}
                          className="w-8 h-8 object-cover rounded border border-muted flex-shrink-0"
                        />
                      )}
                      <span className="truncate max-w-[200px]">
                        {item.productTitle}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {item.variationTitle || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {item.sku || "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-bold">
                    {item.physicalCount}
                  </td>
                  <td className="px-4 py-3 text-center">{item.systemCount}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`font-bold ${
                        item.difference === 0
                          ? "text-emerald-600"
                          : item.difference > 0
                            ? "text-blue-600"
                            : "text-red-500"
                      }`}
                    >
                      {item.difference > 0
                        ? `+${item.difference}`
                        : item.difference}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.difference === 0 ? (
                      <MdCheckCircle
                        className="text-emerald-600 inline"
                        size={18}
                      />
                    ) : (
                      <MdWarning
                        className={
                          item.difference > 0
                            ? "text-blue-500 inline"
                            : "text-red-500 inline"
                        }
                        size={18}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}
