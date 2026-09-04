"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import POSSidebar from "../_components/POSSidebar";
import Link from "next/link";
import { MdAdd, MdOpenInNew, MdShield, MdLock } from "react-icons/md";

interface WorkOrder {
  _id: string;
  workOrderNumber: number;
  type: string;
  status: string;
  fromStore?: { name: string };
  toStore: { name: string };
  requestedBy?: { name: string };
  items: { quantity: number }[];
  createdAt: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_transit:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  approved: "Aprobado",
  in_transit: "En tránsito",
  completed: "Completado",
  cancelled: "Cancelado",
};

const typeLabels: Record<string, string> = {
  transfer: "Transferencia",
  receive: "Recepción",
  adjustment: "Ajuste",
  new_product: "Nuevo Producto",
};

// Windowed page list with "..." gaps so it never overflows the page view
function getPageNumbers(current: number, total: number, offset = 1) {
  const pages: (number | "...")[] = [1];
  const start = Math.max(2, current - offset);
  const end = Math.min(total - 1, current + offset);

  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("...");
  if (total > 1) pages.push(total);

  return pages;
}

/* ─── Manager code gate ──────────────────────────────────────────── */
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
            para acceder a las órdenes de trabajo.
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

export default function POSWorkOrdersPage() {
  const params = useParams();
  const storeSlug = params?.storeSlug as string;
  const router = useRouter();

  const [pageUnlocked, setPageUnlocked] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

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

  // Reset to page 1 when status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    const url = `/api/work-orders?storeId=${storeId}${
      statusFilter ? `&status=${statusFilter}` : ""
    }&page=${currentPage}&limit=${itemsPerPage}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setWorkOrders(data?.workOrders ?? []);
        setTotalPages(data?.totalPages ?? 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [storeId, statusFilter, currentPage]);

  const pendingCount = workOrders.filter((w) => w.status === "pending").length;

  if (!pageUnlocked) {
    return (
      <div className="flex h-screen bg-background">
        <POSSidebar storeSlug={storeSlug} storeName={storeName} />
        <ManagerCodeModal
          onAuthorized={() => setPageUnlocked(true)}
          onCancel={() => router.push(`/puntodeventa/${storeSlug}/`)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <POSSidebar storeSlug={storeSlug} storeName={storeName} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              Órdenes de Trabajo
              {pendingCount > 0 && (
                <span className="text-xs bg-amber-500 text-white rounded-full px-2 py-0.5 font-bold">
                  {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground">{storeName}</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-muted border border-muted rounded-lg px-3 py-2 outline-none"
            >
              <option value="">Todos los estados</option>
              {Object.entries(statusLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <Link
              href={`/puntodeventa/${storeSlug}/ordenes-trabajo/nueva`}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <MdAdd size={18} /> Nueva Orden
            </Link>
          </div>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground animate-pulse">
            Cargando...
          </p>
        )}

        {!loading && workOrders.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p>No hay órdenes de trabajo para esta sucursal.</p>
          </div>
        )}

        {!loading && workOrders.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-muted">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">No.</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Origen → Destino</th>
                  <th className="px-4 py-3 text-left">Solicitado por</th>
                  <th className="px-4 py-3 text-center">Art.</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map((wo) => (
                  <tr
                    key={wo._id}
                    className="border-t border-muted hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-bold">
                      #{wo.workOrderNumber}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {typeLabels[wo.type] ?? wo.type}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {wo.fromStore ? `${wo.fromStore.name} → ` : "— → "}
                      {wo.toStore?.name}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {wo.requestedBy?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {wo.items.reduce((s, i) => s + i.quantity, 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[wo.status]}`}
                      >
                        {statusLabels[wo.status] ?? wo.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(wo.createdAt).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/puntodeventa/${storeSlug}/ordenes-trabajo/${wo._id}`}
                        className="text-primary hover:underline flex items-center gap-1 text-xs"
                      >
                        <MdOpenInNew size={14} /> Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && workOrders.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
            <p className="text-xs text-muted-foreground">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-muted rounded-lg text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              {getPageNumbers(currentPage, totalPages).map((page, i) =>
                page === "..." ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="px-2 text-sm text-muted-foreground select-none"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      currentPage === page
                        ? "bg-primary text-primary-foreground"
                        : "border border-muted hover:bg-muted"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-muted rounded-lg text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
