"use client";
import { useState } from "react";
import {
  MdWarehouse,
  MdPlayArrow,
  MdCheckCircle,
  MdError,
  MdPreview,
} from "react-icons/md";

interface MigrationResult {
  dryRun: boolean;
  store: { _id: string; name: string; slug: string };
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errorCount: number;
  errors: string[];
  results: {
    product: string;
    variationId: string;
    size: string;
    quantity: number;
    action: string;
  }[];
}

export default function MigrateInventoryPage() {
  const [storeSlug, setStoreSlug] = useState("centro-magno");
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function runMigration(isDryRun: boolean) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/migrate-online-to-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug, dryRun: isDryRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error en la migración");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const actionColor = (action: string) => {
    if (action === "created") return "text-green-600";
    if (action === "updated") return "text-blue-600";
    if (action === "error") return "text-red-600";
    return "text-muted-foreground";
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <MdWarehouse size={28} className="text-primary" />
        <div>
          <h1 className="text-2xl font-bold font-EB_Garamond">
            Migrar Inventario Online → Sucursal
          </h1>
          <p className="text-sm text-muted-foreground">
            Transfiere el stock de todos los productos con{" "}
            <code className="text-xs bg-muted px-1 rounded">
              availability.online: true
            </code>{" "}
            al inventario de una sucursal (StoreInventory).
          </p>
        </div>
      </div>

      {/* Config */}
      <div className="border rounded-xl p-5 mb-6 bg-muted/20 flex flex-wrap gap-5 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Slug de sucursal destino
          </label>
          <input
            value={storeSlug}
            onChange={(e) => setStoreSlug(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
            placeholder="centro-magno"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Usa el slug exacto de la sucursal (ej.{" "}
            <code className="bg-muted px-1 rounded">centro-magno</code>)
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              setConfirmed(false);
              runMigration(true);
            }}
            disabled={loading || !storeSlug}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <MdPreview />
            {loading && dryRun ? "Analizando..." : "Vista Previa (sin cambios)"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
          <MdError size={18} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Result preview */}
      {result && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Sucursal",
                value: result.store.name,
                color: "text-foreground",
              },
              {
                label: "Variaciones",
                value: result.processed,
                color: "text-foreground",
              },
              {
                label: result.dryRun ? "A crear" : "Creados",
                value: result.dryRun
                  ? result.results.filter((r) => r.action === "pending").length
                  : result.created,
                color: "text-green-600",
              },
              {
                label: result.dryRun ? "A actualizar" : "Actualizados",
                value: result.dryRun ? 0 : result.updated,
                color: "text-blue-600",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="border rounded-xl p-4 bg-background text-center"
              >
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className={`font-bold text-xl ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="font-semibold text-red-700 text-sm mb-2">
                {result.errors.length} error(es):
              </p>
              <ul className="text-xs text-red-600 space-y-1 list-disc pl-4">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Confirm & apply */}
          {result.dryRun && result.processed > 0 && !confirmed && (
            <div className="border border-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-5">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3">
                ¿Confirmas aplicar la migración a{" "}
                <strong>{result.store.name}</strong>?
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-4">
                Esta acción creará/actualizará{" "}
                <strong>{result.processed}</strong> registros en StoreInventory.
                El stock de cada variación se copiará tal como está en el
                producto. Esta operación es{" "}
                <strong>reversible individualmente</strong> por el módulo de
                inventario, pero no tiene un botón de &ldquo;deshacer
                todo&rdquo;.
              </p>
              <button
                onClick={() => {
                  setConfirmed(true);
                  setDryRun(false);
                  runMigration(false);
                }}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors"
              >
                <MdPlayArrow />
                Sí, aplicar migración
              </button>
            </div>
          )}

          {!result.dryRun && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-300 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">
              <MdCheckCircle size={18} />
              Migración completada: {result.created} creados, {result.updated}{" "}
              actualizados.
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Variación</th>
                  <th className="px-3 py-2 text-center">Stock</th>
                  <th className="px-3 py-2 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.results.map((r, i) => (
                  <tr key={i} className="bg-background">
                    <td
                      className="px-3 py-2 max-w-[240px] truncate text-xs"
                      title={r.product}
                    >
                      {r.product}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {r.size}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-sm">
                      {r.quantity}
                    </td>
                    <td
                      className={`px-3 py-2 text-center text-xs font-semibold capitalize ${actionColor(r.action)}`}
                    >
                      {r.action === "pending"
                        ? "Crear"
                        : r.action === "created"
                          ? "✓ Creado"
                          : r.action === "updated"
                            ? "↑ Actualizado"
                            : r.action === "error"
                              ? "✗ Error"
                              : r.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
