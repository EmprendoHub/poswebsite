"use client";
import React, { useCallback, useState } from "react";
import Papa from "papaparse";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaFileUpload,
  FaSearch,
  FaCloudUploadAlt,
  FaTrash,
} from "react-icons/fa";
import { FaArrowRightLong } from "react-icons/fa6";

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
  matchedId: string | null;
  matchedTitle: string | null;
  matchMethod: "asin" | "name" | "none";
  similarity: number;
  currentStock: number | null;
  newStock: number;
  currentPrice: number | null;
  newPrice: number;
  updated?: boolean;
}

// ── Column aliases: maps possible header spellings → canonical key ─────────
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

// ── Component ────────────────────────────────────────────────────────────────
const InventoryUpdateCSV = () => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewResults, setPreviewResults] = useState<MatchResult[] | null>(
    null,
  );
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [appliedResults, setAppliedResults] = useState<MatchResult[] | null>(
    null,
  );

  // Filter controls
  const [filterMatch, setFilterMatch] = useState<
    "all" | "matched" | "unmatched"
  >("all");
  const [searchText, setSearchText] = useState("");

  // ── Remove a single preview row ────────────────────────────────────────────
  const removePreviewRow = (rowIndex: number) => {
    setPreviewResults((prev) =>
      prev ? prev.filter((r) => r.rowIndex !== rowIndex) : null,
    );
  };

  // ── CSV parse ──────────────────────────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    setParseError(null);
    setPreviewResults(null);
    setAppliedResults(null);
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

        // Debug: log the first raw row so we can verify column names
        console.log("[CSV] Raw headers found:", Object.keys(raw[0] ?? {}));
        console.log("[CSV] First data row:", raw[0]);
        console.log("[CSV] Total rows:", raw.length);

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

        console.log("[CSV] First mapped row:", mapped[0]);
        setRows(mapped);
        toast(`${mapped.length} filas cargadas correctamente`);
      },
      error: (err) => {
        setParseError(`Error al leer el archivo: ${err.message}`);
      },
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
    try {
      const res = await fetch("/api/products/inventory-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, preview: true }),
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
    setApplying(true);

    // Only apply rows the user hasn't manually removed
    const activeIndices = new Set(previewResults.map((r) => r.rowIndex));
    const filteredRows = rows.filter((_, i) => activeIndices.has(i));

    try {
      const res = await fetch("/api/products/inventory-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: filteredRows, preview: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Error al aplicar cambios");
        return;
      }
      setAppliedResults(data.results);
      setPreviewResults(null);
      toast(`✅ ${data.updatedCount} producto(s) actualizados`);
    } catch {
      toast("Error de red al aplicar cambios");
    } finally {
      setApplying(false);
    }
  };

  // ── Derived display list ──────────────────────────────────────────────────
  const displayResults = appliedResults ?? previewResults;
  const filtered = displayResults?.filter((r) => {
    const matchOk =
      filterMatch === "all" ||
      (filterMatch === "matched" && r.matchedId) ||
      (filterMatch === "unmatched" && !r.matchedId);
    const textOk =
      !searchText ||
      r.producto.toLowerCase().includes(searchText.toLowerCase()) ||
      r.codigo.toLowerCase().includes(searchText.toLowerCase()) ||
      (r.matchedTitle ?? "").toLowerCase().includes(searchText.toLowerCase());
    return matchOk && textOk;
  });

  const matchedCount = displayResults?.filter((r) => r.matchedId).length ?? 0;
  const unmatchedCount =
    displayResults?.filter((r) => !r.matchedId).length ?? 0;

  const isApplied = Boolean(appliedResults);

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
        <div className="flex gap-3 mb-6">
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
              disabled={applying || matchedCount === 0}
              className="flex items-center gap-2 px-5 py-2 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <FaCloudUploadAlt />
              {applying ? "Aplicando..." : `Aplicar ${matchedCount} cambio(s)`}
            </button>
          )}
        </div>
      )}

      {/* ── Results table ───────────────────────────────────────────────── */}
      {displayResults && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <FaCheckCircle className="text-green-600" />
              <span>
                <strong>{matchedCount}</strong> coincidencias
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FaTimesCircle className="text-red-500" />
              <span>
                <strong>{unmatchedCount}</strong> sin coincidencia
              </span>
            </div>
            {isApplied && (
              <span className="ml-auto text-green-700 font-semibold text-sm">
                ✅ Cambios aplicados
              </span>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-3">
            <div className="flex rounded-lg overflow-hidden border text-sm">
              {(["all", "matched", "unmatched"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setFilterMatch(v)}
                  className={`px-3 py-1.5 transition-colors ${
                    filterMatch === v
                      ? "bg-foreground text-background"
                      : "hover:bg-muted"
                  }`}
                >
                  {v === "all"
                    ? "Todos"
                    : v === "matched"
                      ? "Coincidentes"
                      : "Sin coincidencia"}
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
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Código CSV</th>
                  <th className="px-3 py-2">Producto CSV</th>
                  <th className="px-3 py-2">Producto coincidente</th>
                  <th className="px-3 py-2">Método</th>
                  <th className="px-3 py-2 text-center">Stock actual</th>
                  <th className="px-3 py-2 text-center">Stock nuevo</th>
                  {!isApplied && (
                    <th className="px-3 py-2 text-center">Quitar</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered?.map((r, i) => {
                  const stockChanged = r.currentStock !== r.newStock;

                  return (
                    <tr
                      key={i}
                      className={`${
                        !r.matchedId
                          ? "bg-red-50 dark:bg-red-950/20"
                          : isApplied && r.updated
                            ? "bg-green-50 dark:bg-green-950/20"
                            : "bg-background"
                      }`}
                    >
                      {/* Status */}
                      <td className="px-3 py-2">
                        {!r.matchedId ? (
                          <span className="flex items-center gap-1 text-red-500 font-medium text-xs">
                            <FaTimesCircle /> Sin match
                          </span>
                        ) : isApplied && r.updated ? (
                          <span className="flex items-center gap-1 text-green-600 font-medium text-xs">
                            <FaCheckCircle /> Actualizado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-blue-600 font-medium text-xs">
                            <FaCheckCircle /> Listo
                          </span>
                        )}
                      </td>

                      {/* Código */}
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {r.codigo || "—"}
                      </td>

                      {/* Producto CSV */}
                      <td
                        className="px-3 py-2 max-w-[180px] truncate"
                        title={r.producto}
                      >
                        {r.producto}
                      </td>

                      {/* Matched product */}
                      <td className="px-3 py-2 max-w-[200px]">
                        {r.matchedTitle ? (
                          <span
                            className="truncate block"
                            title={r.matchedTitle}
                          >
                            {r.matchedTitle}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">
                            No encontrado
                          </span>
                        )}
                      </td>

                      {/* Match method */}
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
                        {r.matchMethod === "none" && (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="px-3 py-2 text-center text-muted-foreground">
                        {r.currentStock ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r.matchedId ? (
                          <span
                            className={`flex items-center justify-center gap-1 font-semibold ${
                              stockChanged
                                ? "text-blue-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {stockChanged && (
                              <FaArrowRightLong className="text-[10px]" />
                            )}
                            {r.newStock}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {r.newStock}
                          </span>
                        )}
                      </td>

                      {/* Remove row (preview only) */}
                      {!isApplied && (
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => removePreviewRow(r.rowIndex)}
                            title="Quitar esta coincidencia"
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filtered?.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      Sin resultados para los filtros actuales
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Apply button after preview (duplicate, sticky) */}
          {previewResults && !isApplied && matchedCount > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={applyUpdates}
                disabled={applying}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors shadow"
              >
                <FaCloudUploadAlt />
                {applying
                  ? "Aplicando..."
                  : `Confirmar y actualizar ${matchedCount} producto(s)`}
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
