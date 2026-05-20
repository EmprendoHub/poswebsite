"use client";
import { useEffect, useState } from "react";
import {
  MdStorefront,
  MdInventory,
  MdCheckCircle,
  MdWarning,
  MdRefresh,
} from "react-icons/md";

interface Store {
  _id: string;
  name: string;
  isActive: boolean;
}

interface Preview {
  storeName: string;
  activeProducts: number;
  totalVariations: number;
  alreadyAssigned: number;
}

interface Result {
  message: string;
  created: number;
  updated: number;
  total: number;
}

export default function BulkInventoryPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((data) =>
        setStores(
          Array.isArray(data) ? data.filter((s: Store) => s.isActive) : [],
        ),
      );
  }, []);

  const loadPreview = async (storeId: string) => {
    if (!storeId) return;
    setLoadingPreview(true);
    setPreview(null);
    setResult(null);
    setError("");
    try {
      const res = await fetch(
        `/api/store-inventory/bulk-assign?storeId=${storeId}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStore(e.target.value);
    setResult(null);
    loadPreview(e.target.value);
  };

  const handleAssign = async () => {
    if (!selectedStore) return;
    setAssigning(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/store-inventory/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: selectedStore, overwrite }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      // Refresh preview counts
      loadPreview(selectedStore);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAssigning(false);
    }
  };

  const newVariations = preview
    ? preview.totalVariations - preview.alreadyAssigned
    : 0;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <MdInventory size={28} className="text-primary" />
          Asignar Inventario Inicial
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Crea registros de inventario en una sucursal usando el stock actual de
          todos los productos activos. Solo se crean entradas nuevas (no
          sobrescribe a menos que lo indiques).
        </p>
      </div>

      {/* Store selector */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">
            <MdStorefront className="inline mr-1" />
            Sucursal de destino
          </label>
          <select
            value={selectedStore}
            onChange={handleStoreChange}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">— Selecciona una sucursal —</option>
            {stores.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Preview */}
        {loadingPreview && (
          <p className="text-sm text-muted-foreground animate-pulse">
            Calculando...
          </p>
        )}

        {preview && !loadingPreview && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{preview.activeProducts}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Productos activos
              </p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{preview.totalVariations}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Variaciones totales
              </p>
            </div>
            <div
              className={`rounded-lg p-3 text-center ${
                newVariations > 0
                  ? "bg-green-50 dark:bg-green-900/20"
                  : "bg-muted/40"
              }`}
            >
              <p
                className={`text-2xl font-bold ${
                  newVariations > 0 ? "text-green-600 dark:text-green-400" : ""
                }`}
              >
                {newVariations}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nuevas a crear
              </p>
            </div>
          </div>
        )}

        {preview && preview.alreadyAssigned > 0 && (
          <div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-lg px-3 py-2">
            <MdWarning size={18} className="mt-0.5 shrink-0" />
            <span>
              Ya hay <strong>{preview.alreadyAssigned}</strong> variaciones
              asignadas a esta sucursal.{" "}
              {overwrite
                ? "Se actualizarán con el stock actual del producto."
                : "Se omitirán (activa 'Sobrescribir' para actualizarlas)."}
            </span>
          </div>
        )}

        {/* Overwrite toggle */}
        {preview && (
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm">
              Sobrescribir cantidades ya asignadas con el stock actual del
              producto
            </span>
          </label>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Result */}
        {result && (
          <div className="flex items-start gap-2 text-sm bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg px-3 py-2">
            <MdCheckCircle size={18} className="mt-0.5 shrink-0" />
            <span>
              <strong>{result.message}</strong> — {result.created} registros
              creados, {result.updated} actualizados de {result.total} totales.
            </span>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleAssign}
          disabled={!selectedStore || assigning || loadingPreview}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {assigning ? (
            <>
              <MdRefresh size={18} className="animate-spin" /> Asignando...
            </>
          ) : (
            <>
              <MdInventory size={18} />{" "}
              {result ? "Volver a asignar" : "Asignar inventario"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
