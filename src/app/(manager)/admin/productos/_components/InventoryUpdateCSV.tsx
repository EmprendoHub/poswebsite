"use client";
import React, { useCallback, useEffect, useState } from "react";
import Papa from "papaparse";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  FaCheckCircle,
  FaFileUpload,
  FaSearch,
  FaCloudUploadAlt,
  FaPlusCircle,
  FaBan,
  FaEdit,
} from "react-icons/fa";
import { FaArrowRightLong } from "react-icons/fa6";
import { MdStorefront } from "react-icons/md";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CsvRow {
  codigo: string;
  producto: string;
  p_costo: string;
  p_venta: string;
  p_mayoreo: string;
  existencia: string;
  inv_minimo: string;
  inv_maximo: string;
  departamento: string;
}

interface MatchResult {
  rowIndex: number;
  codigo: string;
  producto: string;
  departamento: string;
  matchedId: string | null;
  matchedTitle: string | null;
  matchMethod: "asin" | "name" | "none";
  similarity: number;
  currentStock: number | null;
  newStock: number;
  currentPrice: number | null;
  newPrice: number;
  markedUpPrice: number;
  newCost: number;
  action: "update" | "create";
  updated?: boolean;
  created?: boolean;
  createError?: string | null;
}

interface StoreOption {
  _id: string;
  name: string;
  slug: string;
}

// ── Column aliases ─────────────────────────────────────────────────────────────
const COL_MAP: Record<string, keyof CsvRow> = {
  código: "codigo",
  codigo: "codigo",
  cod: "codigo",
  sku: "codigo",
  asin: "codigo",
  producto: "producto",
  description: "producto",
  descripción: "producto",
  "p. costo": "p_costo",
  "p.costo": "p_costo",
  costo: "p_costo",
  "p. venta": "p_venta",
  "p.venta": "p_venta",
  venta: "p_venta",
  precio: "p_venta",
  "p. mayoreo": "p_mayoreo",
  "p.mayoreo": "p_mayoreo",
  mayoreo: "p_mayoreo",
  existencia: "existencia",
  existencias: "existencia",
  stock: "existencia",
  "inv. mínimo": "inv_minimo",
  "inv. minimo": "inv_minimo",
  "inv.minimo": "inv_minimo",
  "inv. máximo": "inv_maximo",
  "inv. maximo": "inv_maximo",
  "inv.maximo": "inv_maximo",
  departamento: "departamento",
  depto: "departamento",
  categoria: "departamento",
};

function normalizeKey(raw: string): keyof CsvRow | null {
  return COL_MAP[raw.trim().toLowerCase()] ?? null;
}

// ── Component ──────────────────────────────────────────────────────────────────
const InventoryUpdateCSV = () => {
  // Branch selector
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState<string>("");

  // CSV
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  // Preview / apply
  const [previewResults, setPreviewResults] = useState<MatchResult[] | null>(
    null,
  );
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [appliedResults, setAppliedResults] = useState<MatchResult[] | null>(
    null,
  );
  const [appliedCounts, setAppliedCounts] = useState<{
    updated: number;
    created: number;
  } | null>(null);

  // Per-row action overrides: "update" | "create" | "skip"
  const [rowActions, setRowActions] = useState<
    Record<number, "update" | "create" | "skip">
  >({});

  // Filters
  const [filterAction, setFilterAction] = useState<
    "all" | "update" | "create" | "skip"
  >("all");
  const [searchText, setSearchText] = useState("");
  const [pricesOnly, setPricesOnly] = useState(false);

  // ── Load stores ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((data: StoreOption[]) => {
        if (!Array.isArray(data)) return;
        setStores(data);
        if (data.length === 1) setStoreId(data[0]._id);
      })
      .catch(() => {});
  }, []);

  // ── Effective action for a row ─────────────────────────────────────────────
  const effectiveAction = (r: MatchResult): "update" | "create" | "skip" => {
    const base = rowActions[r.rowIndex] ?? r.action;
    if (pricesOnly && base === "create") return "skip";
    return base;
  };

  const toggleAction = (
    rowIndex: number,
    current: "update" | "create" | "skip",
    defaultAction: "update" | "create",
  ) => {
    setRowActions((prev) => ({
      ...prev,
      [rowIndex]: current === "skip" ? defaultAction : "skip",
    }));
  };

  // ── CSV parse ──────────────────────────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    setParseError(null);
    setPreviewResults(null);
    setAppliedResults(null);
    setAppliedCounts(null);
    setRowActions({});
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      encoding: "UTF-8",
      complete: (result) => {
        const raw = result.data as Record<string, string>[];
        if (!raw.length) {
          setParseError("El archivo está vacío o no tiene filas de datos.");
          return;
        }
        const mapped: CsvRow[] = raw.map((r) => {
          const row: Partial<CsvRow> = {
            codigo: "",
            producto: "",
            p_costo: "",
            p_venta: "",
            p_mayoreo: "",
            existencia: "",
            inv_minimo: "",
            inv_maximo: "",
            departamento: "",
          };
          for (const [rawKey, val] of Object.entries(r)) {
            const canonical = normalizeKey(rawKey);
            if (canonical) row[canonical] = (val ?? "").trim();
          }
          return row as CsvRow;
        });
        setRows(mapped);
        toast(`${mapped.length} filas cargadas correctamente`);
      },
      error: (err) => setParseError(`Error al leer el archivo: ${err.message}`),
    });
  }, []);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) parseFile(accepted[0]);
    },
    [parseFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "text/plain": [".txt", ".csv"] },
    maxFiles: 1,
  });

  // ── Preview ────────────────────────────────────────────────────────────────
  const runPreview = async () => {
    if (!rows.length) return;
    setLoadingPreview(true);
    setAppliedResults(null);
    setAppliedCounts(null);
    setRowActions({});
    try {
      const res = await fetch("/api/products/inventory-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows,
          preview: true,
          pricesOnly,
          storeId: storeId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Error al generar vista previa");
        return;
      }
      setPreviewResults(data.results);
    } catch {
      toast("Error de red al generar vista previa");
    } finally {
      setLoadingPreview(false);
    }
  };

  // ── Apply ──────────────────────────────────────────────────────────────────
  const applyUpdates = async () => {
    if (!rows.length || !previewResults) return;
    if (!storeId) {
      toast("Selecciona una sucursal antes de aplicar");
      return;
    }
    setApplying(true);

    // Merge default actions with user overrides
    const finalActions: Record<string, "update" | "create" | "skip"> = {};
    for (const r of previewResults) {
      finalActions[String(r.rowIndex)] = rowActions[r.rowIndex] ?? r.action;
    }

    try {
      const res = await fetch("/api/products/inventory-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows,
          preview: false,
          pricesOnly,
          storeId,
          rowActions: finalActions,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Error al aplicar cambios");
        return;
      }
      setAppliedResults(data.results);
      setAppliedCounts({
        updated: data.updatedCount,
        created: data.createdCount,
      });
      setPreviewResults(null);
      toast(
        `✅ ${data.updatedCount} actualizados · ${data.createdCount} creados`,
      );
    } catch {
      toast("Error de red al aplicar cambios");
    } finally {
      setApplying(false);
    }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const displayResults = appliedResults ?? previewResults;
  const isApplied = Boolean(appliedResults);

  const updateCount =
    displayResults?.filter((r) => effectiveAction(r) === "update").length ?? 0;
  const createCount =
    displayResults?.filter((r) => effectiveAction(r) === "create").length ?? 0;
  const skipCount =
    displayResults?.filter((r) => effectiveAction(r) === "skip").length ?? 0;
  const actionableCount = updateCount + createCount;

  const filtered = displayResults?.filter((r) => {
    const act = effectiveAction(r);
    const actionOk = filterAction === "all" || filterAction === act;
    const textOk =
      !searchText ||
      r.producto.toLowerCase().includes(searchText.toLowerCase()) ||
      r.codigo.toLowerCase().includes(searchText.toLowerCase()) ||
      (r.matchedTitle ?? "").toLowerCase().includes(searchText.toLowerCase());
    return actionOk && textOk;
  });

  return (
    <div className="p-5 maxsm:p-2 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold font-EB_Garamond mb-1">
        Actualizar Inventario por CSV
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Sube un archivo CSV con las columnas:{" "}
        <code className="text-xs bg-muted px-1 rounded">
          Código · Producto · P. Costo · P. Venta · P. Mayoreo · Existencia ·
          Inv. Mínimo · Inv. Máximo · Departamento
        </code>
      </p>

      {/* ── Branch selector ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5 p-4 rounded-xl border bg-muted/30">
        <MdStorefront size={22} className="text-primary flex-shrink-0" />
        <div className="flex-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
            Sucursal destino
          </label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="w-full max-w-xs bg-background border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">— Seleccionar sucursal —</option>
            {stores.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {!storeId && !pricesOnly && (
          <p className="text-xs text-amber-600 dark:text-amber-400 self-end pb-0.5">
            Requerido para aplicar cambios
          </p>
        )}
      </div>

      {/* ── Drop zone ───────────────────────────────────────────────────── */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-5 ${
          isDragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
            : "border-gray-300 hover:border-blue-400 hover:bg-muted/20"
        }`}
      >
        <input {...getInputProps()} />
        <FaFileUpload className="mx-auto text-3xl text-muted-foreground mb-2" />
        {fileName ? (
          <p className="font-medium">
            📄 {fileName}{" "}
            <span className="text-muted-foreground text-sm">
              — {rows.length} filas
            </span>
          </p>
        ) : (
          <p className="text-muted-foreground">
            Arrastra tu archivo CSV aquí, o{" "}
            <span className="text-blue-500 underline">
              haz clic para seleccionar
            </span>
          </p>
        )}
      </div>

      {parseError && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {parseError}
        </div>
      )}

      {/* ── Action buttons ──────────────────────────────────────────────── */}
      {rows.length > 0 && !isApplied && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none px-3 py-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={pricesOnly}
              onChange={(e) => setPricesOnly(e.target.checked)}
              className="accent-primary w-4 h-4"
            />
            <span className="font-medium">Solo precios</span>
          </label>

          <div className="h-6 border-l border-muted-foreground/20" />

          <button
            onClick={runPreview}
            disabled={loadingPreview}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <FaSearch />
            {loadingPreview ? "Analizando..." : "Vista Previa"}
          </button>

          {previewResults && (
            <button
              onClick={applyUpdates}
              disabled={applying || actionableCount === 0 || (!storeId && !pricesOnly)}
              title={!storeId && !pricesOnly ? "Selecciona una sucursal primero" : undefined}
              className="flex items-center gap-2 px-5 py-2 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <FaCloudUploadAlt />
              {applying
                ? "Aplicando..."
                : [
                    updateCount > 0 ? `${updateCount} actualizar` : "",
                    createCount > 0 ? `${createCount} crear` : "",
                  ]
                    .filter(Boolean)
                    .join(" + ")}
            </button>
          )}
        </div>
      )}

      {/* ── Results table ───────────────────────────────────────────────── */}
      {displayResults && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {isApplied && appliedCounts ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <FaEdit className="text-blue-500" />
                  <span>
                    <strong>{appliedCounts.updated}</strong> actualizados
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FaPlusCircle className="text-green-600" />
                  <span>
                    <strong>{appliedCounts.created}</strong> creados
                  </span>
                </div>
                <span className="ml-auto text-green-700 font-semibold text-sm">
                  ✅ Cambios aplicados
                </span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <FaEdit className="text-blue-500" />
                  <span>
                    <strong>{updateCount}</strong> a actualizar
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FaPlusCircle className="text-green-600" />
                  <span>
                    <strong>{createCount}</strong> a crear
                  </span>
                </div>
                {skipCount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FaBan />
                    <span>
                      <strong>{skipCount}</strong> omitidos
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-3">
            <div className="flex rounded-lg overflow-hidden border text-sm">
              {(["all", "update", "create", "skip"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setFilterAction(v)}
                  className={`px-3 py-1.5 transition-colors ${
                    filterAction === v
                      ? "bg-foreground text-background"
                      : "hover:bg-muted"
                  }`}
                >
                  {v === "all"
                    ? "Todos"
                    : v === "update"
                      ? "Actualizar"
                      : v === "create"
                        ? "Crear"
                        : "Omitir"}
                </button>
              ))}
            </div>

            <div className="relative flex-1 min-w-48">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border rounded-lg w-full bg-background"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-3 py-2">Acción</th>
                  <th className="px-3 py-2">Código CSV</th>
                  <th className="px-3 py-2">Producto CSV</th>
                  <th className="px-3 py-2">Coincidencia / Nuevo</th>
                  <th className="px-3 py-2">Método</th>
                  <th className="px-3 py-2 text-center">Stock actual</th>
                  <th className="px-3 py-2 text-center">
                    Stock nuevo
                    {pricesOnly && (
                      <span className="ml-1 text-[10px] text-amber-500 font-normal normal-case">
                        (sin cambio)
                      </span>
                    )}
                  </th>
                  <th className="px-3 py-2 text-center">P. Venta</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered?.map((r) => {
                  const act = effectiveAction(r);
                  const isSkipped = act === "skip";
                  const stockChanged = r.currentStock !== r.newStock;
                  const priceChanged =
                    r.currentPrice !== null &&
                    r.newPrice > 0 &&
                    r.currentPrice !== r.newPrice;

                  return (
                    <tr
                      key={r.rowIndex}
                      className={`${
                        isSkipped
                          ? "opacity-40"
                          : isApplied && r.created
                            ? "bg-green-50 dark:bg-green-950/20"
                            : isApplied && r.updated
                              ? "bg-blue-50 dark:bg-blue-950/20"
                              : act === "create"
                                ? "bg-emerald-50/40 dark:bg-emerald-950/10"
                                : "bg-background"
                      }`}
                    >
                      {/* Acción toggle */}
                      <td className="px-3 py-2">
                        {isApplied ? (
                          r.created ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                              <FaPlusCircle /> Creado
                            </span>
                          ) : r.updated ? (
                            <span className="flex items-center gap-1 text-blue-600 text-xs font-semibold">
                              <FaCheckCircle /> Actualizado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground text-xs">
                              <FaBan /> Omitido
                            </span>
                          )
                        ) : (
                          <button
                            onClick={() =>
                              toggleAction(r.rowIndex, act, r.action)
                            }
                            title={
                              isSkipped
                                ? "Clic para incluir"
                                : "Clic para omitir"
                            }
                            className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                              act === "update"
                                ? "border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                : act === "create"
                                  ? "border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                  : "border-gray-300 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            }`}
                          >
                            {act === "update" ? (
                              <>
                                <FaEdit size={10} /> Actualizar
                              </>
                            ) : act === "create" ? (
                              <>
                                <FaPlusCircle size={10} /> Crear
                              </>
                            ) : (
                              <>
                                <FaBan size={10} /> Omitir
                              </>
                            )}
                          </button>
                        )}
                      </td>

                      {/* Código */}
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {r.codigo || "—"}
                      </td>

                      {/* Producto CSV */}
                      <td
                        className="px-3 py-2 max-w-[160px] truncate"
                        title={r.producto}
                      >
                        {r.producto}
                      </td>

                      {/* Coincidencia / Nuevo */}
                      <td className="px-3 py-2 max-w-[200px]">
                        {r.matchedTitle ? (
                          <span
                            className="truncate block"
                            title={r.matchedTitle}
                          >
                            {r.matchedTitle}
                          </span>
                        ) : act === "create" ? (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            + Nuevo · {r.departamento || "Sin categoría"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">
                            No encontrado
                          </span>
                        )}
                      </td>

                      {/* Método */}
                      <td className="px-3 py-2">
                        {r.matchMethod === "asin" && (
                          <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs rounded px-1.5 py-0.5">
                            ASIN
                          </span>
                        )}
                        {r.matchMethod === "name" && (
                          <span
                            className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs rounded px-1.5 py-0.5"
                            title={`${Math.round(r.similarity * 100)}% similitud`}
                          >
                            Nombre {Math.round(r.similarity * 100)}%
                          </span>
                        )}
                        {r.matchMethod === "none" && r.matchedId === null && (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                      </td>

                      {/* Stock actual */}
                      <td className="px-3 py-2 text-center text-muted-foreground">
                        {r.currentStock ?? "—"}
                      </td>

                      {/* Stock nuevo */}
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`flex items-center justify-center gap-1 font-semibold ${
                            stockChanged && !isSkipped && !pricesOnly
                              ? "text-blue-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          {stockChanged && !isSkipped && !pricesOnly && (
                            <FaArrowRightLong className="text-[10px]" />
                          )}
                          {r.newStock}
                        </span>
                      </td>

                      {/* P. Venta */}
                      <td className="px-3 py-2 text-center">
                        {act === "create" && !isApplied ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs font-semibold text-emerald-600">
                              {r.markedUpPrice > 0
                                ? `$${r.markedUpPrice.toFixed(2)}`
                                : "—"}
                            </span>
                            {r.newPrice > 0 && (
                              <span className="text-[10px] text-zinc-400 line-through">
                                ${r.newPrice.toFixed(2)}
                              </span>
                            )}
                            {r.newPrice > 0 && (
                              <span className="text-[9px] font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 rounded px-1">
                                +10%
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            className={`text-xs font-semibold ${
                              priceChanged && !isSkipped
                                ? "text-amber-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {r.newPrice > 0 ? `$${r.newPrice.toFixed(2)}` : "—"}
                          </span>
                        )}
                        {r.createError && (
                          <span
                            className="block text-[10px] text-red-500 mt-0.5 max-w-[100px] truncate"
                            title={r.createError}
                          >
                            ⚠ {r.createError}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered?.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      Sin resultados para los filtros actuales
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Sticky apply button */}
          {previewResults && !isApplied && actionableCount > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={applyUpdates}
                disabled={applying || (!storeId && !pricesOnly)}
                title={!storeId && !pricesOnly ? "Selecciona una sucursal primero" : undefined}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors shadow"
              >
                <FaCloudUploadAlt />
                {applying
                  ? "Aplicando..."
                  : `Confirmar: ${[
                      updateCount > 0 ? `${updateCount} actualizar` : "",
                      createCount > 0 ? `${createCount} crear` : "",
                    ]
                      .filter(Boolean)
                      .join(" + ")}`}
              </button>
            </div>
          )}

          {/* Upload another */}
          {isApplied && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setRows([]);
                  setFileName(null);
                  setAppliedResults(null);
                  setPreviewResults(null);
                  setAppliedCounts(null);
                  setRowActions({});
                }}
                className="px-5 py-2 border rounded-lg text-sm hover:bg-muted/20 transition-colors"
              >
                Cargar otro archivo
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InventoryUpdateCSV;
