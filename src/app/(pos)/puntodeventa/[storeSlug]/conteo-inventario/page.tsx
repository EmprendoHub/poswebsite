"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import POSSidebar from "../_components/POSSidebar";
import {
  MdBarChart,
  MdCheckCircle,
  MdClose,
  MdDelete,
  MdDownload,
  MdInventory,
  MdQrCodeScanner,
  MdRefresh,
  MdWarning,
  MdLock,
  MdShield,
} from "react-icons/md";

/* ─── Manager code modal ─────────────────────────────────────────── */
function ManagerCodeModal({
  onAuthorized,
  onCancel,
}: {
  onAuthorized: () => void;
  onCancel: () => void;
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
        onAuthorized();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-xs">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-muted">
          <MdLock size={22} className="text-primary" />
          <div>
            <h2 className="font-bold text-base">Acceso restringido</h2>
            <p className="text-xs text-muted-foreground">
              Se requiere autorización de manager
            </p>
          </div>
        </div>
        <div className="px-6 py-5">
          <p className="text-xs text-muted-foreground mb-4">
            Ingresa el{" "}
            <span className="font-semibold text-foreground">
              código de manager
            </span>{" "}
            para acceder al conteo de inventario.
          </p>
          <input
            type="text"
            value={"•".repeat(code.length).padEnd(6, "*")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleVerify();
                return;
              }
              if (e.key === "Backspace") {
                setCode(code.slice(0, -1));
                setError("");
                e.preventDefault();
                return;
              }
              if (!/\d/.test(e.key)) {
                e.preventDefault();
                return;
              }
              if (code.length >= 6) {
                e.preventDefault();
                return;
              }
              setCode(code + e.key);
              setError("");
              e.preventDefault();
            }}
            inputMode="numeric"
            maxLength={6}
            autoFocus
            placeholder="******"
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
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <MdShield size={16} />
            {loading ? "Verificando..." : "Autorizar acceso"}
          </button>
          <button
            onClick={onCancel}
            className="w-full mt-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────
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

type View = "scanning" | "report" | "past-reports";

// ─── Component ─────────────────────────────────────────────────────────────────
export default function POSInventarioPage() {
  const params = useParams();
  const storeSlug = params?.storeSlug as string;
  const [storeName, setStoreName] = useState("");
  const [storeId, setStoreId] = useState<string | null>(null);

  const [pageUnlocked, setPageUnlocked] = useState(false);
  const [view, setView] = useState<View>("scanning");
  const [activeSession, setActiveSession] = useState<CheckSession | null>(null);
  const [pastSessions, setPastSessions] = useState<CheckSession[]>([]);
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load store info on mount ─────────────────────────────────────────────────
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

  // ── Start new session on mount (only for POS) ────────────────────────────────
  useEffect(() => {
    if (!pageUnlocked || !storeId) return;
    if (activeSession) return;

    const initSession = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/inventory-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeId }),
        });
        const data = await res.json();
        setLoading(false);
        if (res.ok) {
          setActiveSession(data.session);
          setView("scanning");
          setTimeout(() => scanInputRef.current?.focus(), 200);
        }
      } catch {
        setLoading(false);
      }
    };

    initSession();
  }, [pageUnlocked, storeId, activeSession]);

  // ── Fetch past sessions for this store ──────────────────────────────────────
  const fetchPastSessions = async () => {
    if (!storeId) return;
    const res = await fetch(`/api/admin/inventory-check?storeId=${storeId}`);
    const data = await res.json();
    setPastSessions(data.sessions || []);
  };

  // ── View finalized report ────────────────────────────────────────────────────
  const handleViewReport = async (session: CheckSession) => {
    setLoading(true);
    const res = await fetch(`/api/admin/inventory-check/${session._id}`);
    const data = await res.json();
    setLoading(false);
    setActiveSession(data.session);
    setView("report");
  };

  // ── Lookup by scan/SKU ───────────────────────────────────────────────────────
  const handleLookup = useCallback(
    async (query: string) => {
      if (!query.trim() || !storeId) return;
      setLookupLoading(true);
      setLookupError("");
      setLookupResult(null);
      const res = await fetch(
        `/api/admin/inventory-check/lookup?storeId=${storeId}&query=${encodeURIComponent(query.trim())}`,
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
    [storeId],
  );

  // Debounced auto-search: fires 400 ms after user stops typing (min 3 chars)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (scanQuery.trim().length < 3) {
      setLookupResult(null);
      setLookupError("");
      return;
    }
    debounceRef.current = setTimeout(() => {
      handleLookup(scanQuery);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [scanQuery, handleLookup]);

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
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
    a.download = `conteo-${storeName}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!pageUnlocked) {
    return (
      <div className="flex h-screen bg-background">
        <POSSidebar storeSlug={storeSlug} storeName={storeName} />
        <ManagerCodeModal
          onAuthorized={() => setPageUnlocked(true)}
          onCancel={() => {
            window.history.back();
          }}
        />
      </div>
    );
  }

  // ── Render: scanning ─────────────────────────────────────────────────────────
  if (view === "scanning") {
    const items = activeSession?.scannedItems ?? [];

    return (
      <div className="flex h-screen bg-background">
        <POSSidebar storeSlug={storeSlug} storeName={storeName} />
        <div className="flex-1 overflow-y-auto p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <h1 className="font-bold text-lg flex items-center gap-2">
              <MdInventory size={24} />
              Conteo de Inventario - {storeName}
            </h1>
            <button
              onClick={() => {
                fetchPastSessions();
                setView("past-reports");
              }}
              className="text-sm border border-muted px-4 py-2 rounded-lg hover:bg-muted transition-colors ml-auto"
            >
              <MdBarChart className="inline mr-1" />
              Reportes anteriores
            </button>
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
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
                    Sistema: <strong>{lookupResult.systemCount}</strong>{" "}
                    unidades
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <label className="text-xs text-muted-foreground">
                    Conteo:
                  </label>
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
              {finalizing
                ? "Finalizando…"
                : "Finalizar conteo y generar reporte"}
            </button>
          </div>
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
      <div className="flex h-screen bg-background">
        <POSSidebar storeSlug={storeSlug} storeName={storeName} />
        <div className="flex-1 overflow-y-auto p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <h1 className="font-bold text-lg flex items-center gap-2">
              <MdBarChart size={24} />
              Reporte de conteo · {storeName}
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
                    <td className="px-4 py-3 text-center">
                      {item.systemCount}
                    </td>
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
      </div>
    );
  }

  // ── Render: past-reports ────────────────────────────────────────────────────
  if (view === "past-reports") {
    const finalizedSessions = pastSessions.filter(
      (s) => s.status === "finalized",
    );

    return (
      <div className="flex h-screen bg-background">
        <POSSidebar storeSlug={storeSlug} storeName={storeName} />
        <div className="flex-1 overflow-y-auto p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => {
                setView("scanning");
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Conteo
            </button>
            <span className="text-muted-foreground">/</span>
            <h1 className="font-bold text-lg">Reportes anteriores</h1>
          </div>

          {/* List of past reports */}
          <div className="space-y-3">
            {finalizedSessions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MdBarChart className="inline text-2xl mb-2 opacity-50" />
                <p>No hay reportes finalizados para esta sucursal</p>
              </div>
            ) : (
              finalizedSessions.map((session) => (
                <div
                  key={session._id}
                  className="border border-muted rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleViewReport(session)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <MdBarChart className="text-blue-600" />
                        Reporte de{" "}
                        {new Date(session.finalizedAt!).toLocaleDateString(
                          "es-MX",
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Iniciado por: {session.startedByName} •{" "}
                        {new Date(session.startedAt).toLocaleTimeString(
                          "es-MX",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 px-2 py-1 rounded-full inline-block">
                        {session.totalScanned} escaneados
                      </p>
                      <p className="text-xs mt-2 text-muted-foreground">
                        <span className="text-emerald-600 font-semibold">
                          {session.totalMatched}
                        </span>{" "}
                        coincidencias
                      </p>
                      {session.totalDiscrepancies > 0 && (
                        <p className="text-xs mt-1 text-red-600 font-semibold">
                          {session.totalDiscrepancies} discrepancias
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
