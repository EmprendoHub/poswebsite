"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MdOpenInNew, MdCheckCircle, MdCancel, MdAdd } from "react-icons/md";

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

export default function AdminWorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const url = `/api/work-orders${statusFilter ? `?status=${statusFilter}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setWorkOrders(data?.workOrders ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statusFilter]);

  const pendingCount = workOrders.filter((w) => w.status === "pending").length;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Órdenes de Trabajo
            {pendingCount > 0 && (
              <span className="text-xs bg-amber-500 text-white rounded-full px-2 py-0.5 font-bold">
                {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Transferencias, recepciones y ajustes de inventario entre
            sucursales.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-muted border border-muted rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="">Todos los estados</option>
            {Object.entries(statusLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <Link
            href="/admin/ordenes-trabajo/nueva"
            className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
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
        <p className="text-muted-foreground text-sm py-10 text-center">
          No hay órdenes de trabajo.
        </p>
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
                  <td className="px-4 py-3 font-bold">#{wo.workOrderNumber}</td>
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
                      href={`/admin/ordenes-trabajo/${wo._id}`}
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
    </div>
  );
}
