"use client";
import { useState } from "react";
import {
  MdSync,
  MdCheckCircle,
  MdWarning,
  MdArrowForward,
  MdSearch,
  MdInventory,
} from "react-icons/md";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdjustmentRow {
  storeId: string | null;
  storeName: string;
  productId: string;
  productTitle: string;
  variationId: string;
  variationLabel: string;
  currentStoreQty: number | null;
  newStoreQty: number | null;
  storeDelta: number;
  currentVarStock: number;
  newVarStock: number;
  varDelta: number;
}

interface PreviewData {
  dryRun: true;
  dateFrom: string;
  dateTo: string;
  orderCount: number;
  workOrderCount: number;
  affectedProducts: number;
  affectedVariations: number;
  adjustments: AdjustmentRow[];
}

interface ApplyResult {
  dryRun: false;
  success: boolean;
  dateFrom: string;
  dateTo: string;
  orderCount: number;
  workOrderCount: number;
  adjustmentsApplied: number;
  affectedProducts: number;
  errors: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deltaClass(n: number) {
  if (n > 0) return "text-emerald-600 dark:text-emerald-400";
  if (n < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}
function fmtDelta(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}
function defaultDateRange() {
  const today = new Date().toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  return { today, monthAgo };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReconcileInventoryPage() {
  const { today, monthAgo } = defaultDateRange();
  const [dateFrom, setDateFrom] = useState(monthAgo);
  const [dateTo, setDateTo] = useState(today);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function handlePreview() {
    setPreviewing(true);
    setError("");
    setPreview(null);
    setResult(null);
    try {
      const res = await fetch("/api/store-inventory/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateFrom, dateTo, dryRun: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data as PreviewData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleApply() {
    if (!preview) return;
    setApplying(true);
    setError("");
    try {
      const res = await fetch("/api/store-inventory/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateFrom, dateTo, dryRun: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data as ApplyResult);
      setPreview(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApplying(false);
    }
  }

  const filtered = (preview?.adjustments ?? []).filter((row) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      row.productTitle.toLowerCase().includes(q) ||
      row.storeName.toLowerCase().includes(q) ||
      row.variationLabel.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <MdInventory size={28} className="text-primary" />
          Reconciliación de Inventario
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Busca órdenes con estado <strong>Entregado</strong> y órdenes de
          trabajo con estado <strong>Completado</strong> dentro del rango de
          fechas seleccionado, calcula el impacto neto en el inventario y aplica
          los ajustes a <em>StoreInventory</em> y al stock de variaciones del
          producto.
        </p>
      </div>

      {/* Date Range Form */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPreview(null);
                setResult(null);
              }}
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              max={today}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPreview(null);
                setResult(null);
              }}
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={handlePreview}
            disabled={previewing || applying || !dateFrom || !dateTo}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {previewing ? (
              <>
                <MdSync size={18} className="animate-spin" /> Calculando...
              </>
            ) : (
              <>
                <MdSearch size={18} /> Calcular cambios
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm mb-5">
          <MdWarning size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Apply Result */}
      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MdCheckCircle
              size={22}
              className="text-green-600 dark:text-green-400"
            />
            <h2 className="font-bold text-green-800 dark:text-green-300">
              Ajustes aplicados exitosamente
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { label: "Órdenes procesadas", value: result.orderCount },
              { label: "OTs procesadas", value: result.workOrderCount },
              { label: "Ajustes aplicados", value: result.adjustmentsApplied },
              {
                label: "Productos actualizados",
                value: result.affectedProducts,
              },
            ].map((c) => (
              <div
                key={c.label}
                className="bg-white dark:bg-green-900/30 rounded-lg p-3"
              >
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {c.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.label}
                </p>
              </div>
            ))}
          </div>
          {result.errors.length > 0 && (
            <div className="mt-4 text-xs bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="font-semibold text-red-700 dark:text-red-400 mb-1">
                Errores ({result.errors.length}):
              </p>
              <ul className="list-disc ml-4 space-y-0.5 text-red-600 dark:text-red-400">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Órdenes Entregado",
                value: preview.orderCount,
                color: "text-blue-600",
              },
              {
                label: "OTs Completadas",
                value: preview.workOrderCount,
                color: "text-purple-600",
              },
              {
                label: "Productos afectados",
                value: preview.affectedProducts,
                color: "text-amber-600",
              },
              {
                label: "Variaciones afectadas",
                value: preview.affectedVariations,
                color: "text-foreground",
              },
            ].map((c) => (
              <div
                key={c.label}
                className="bg-card border border-border rounded-xl px-4 py-3 text-center"
              >
                <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.label}
                </p>
              </div>
            ))}
          </div>

          {preview.adjustments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No se encontraron ajustes para el rango seleccionado.
            </div>
          ) : (
            <>
              {/* Warning + Apply */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
                <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                  <MdWarning size={18} className="mt-0.5 shrink-0" />
                  <span>
                    Se aplicarán <strong>{preview.adjustments.length}</strong>{" "}
                    ajustes al inventario de sucursales y al stock de
                    variaciones de <strong>{preview.affectedProducts}</strong>{" "}
                    producto(s). Esta acción{" "}
                    <strong>no se puede deshacer automáticamente</strong>.
                  </span>
                </div>
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="shrink-0 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {applying ? (
                    <>
                      <MdSync size={18} className="animate-spin" /> Aplicando...
                    </>
                  ) : (
                    <>
                      <MdCheckCircle size={18} /> Aplicar ajustes
                    </>
                  )}
                </button>
              </div>

              {/* Search filter */}
              <div className="relative">
                <MdSearch
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Filtrar por producto, sucursal o variación..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Adjustments table */}
              <div className="overflow-x-auto rounded-xl border border-muted">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Sucursal</th>
                      <th className="px-4 py-3 text-left">Producto</th>
                      <th className="px-4 py-3 text-left">Variación</th>
                      <th className="px-4 py-3 text-center">Stock Sucursal</th>
                      <th className="px-4 py-3 text-center">Stock Variación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-muted-foreground"
                        >
                          Sin resultados
                        </td>
                      </tr>
                    ) : (
                      filtered.map((row, i) => (
                        <tr
                          key={`${row.storeId}-${row.variationId}-${i}`}
                          className="border-t border-muted/50 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-2.5 font-medium text-xs whitespace-nowrap">
                            {row.storeName}
                          </td>
                          <td className="px-4 py-2.5 max-w-[200px]">
                            <p className="truncate text-xs font-medium">
                              {row.productTitle}
                            </p>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {row.variationLabel}
                          </td>
                          {/* Store inventory */}
                          <td className="px-4 py-2.5 text-center">
                            {row.storeDelta !== 0 &&
                            row.currentStoreQty !== null ? (
                              <span className="inline-flex items-center gap-1.5 text-xs">
                                <span className="font-semibold">
                                  {row.currentStoreQty}
                                </span>
                                <MdArrowForward
                                  size={12}
                                  className="text-muted-foreground"
                                />
                                <span
                                  className={`font-bold ${deltaClass(row.storeDelta)}`}
                                >
                                  {row.newStoreQty}
                                </span>
                                <span
                                  className={`text-[10px] ${deltaClass(row.storeDelta)}`}
                                >
                                  ({fmtDelta(row.storeDelta)})
                                </span>
                              </span>
                            ) : row.storeDelta === 0 ? (
                              <span className="text-xs text-muted-foreground">
                                sin cambio
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                          {/* Product variation stock */}
                          <td className="px-4 py-2.5 text-center">
                            {row.varDelta !== 0 ? (
                              <span className="inline-flex items-center gap-1.5 text-xs">
                                <span className="font-semibold">
                                  {row.currentVarStock}
                                </span>
                                <MdArrowForward
                                  size={12}
                                  className="text-muted-foreground"
                                />
                                <span
                                  className={`font-bold ${deltaClass(row.varDelta)}`}
                                >
                                  {row.newVarStock}
                                </span>
                                <span
                                  className={`text-[10px] ${deltaClass(row.varDelta)}`}
                                >
                                  ({fmtDelta(row.varDelta)})
                                </span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                sin cambio
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Mostrando {filtered.length} de {preview.adjustments.length}{" "}
                ajustes
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
