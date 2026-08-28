"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MdArrowBack, MdCheck, MdLocalShipping, MdClose } from "react-icons/md";

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  approved: "Aprobado",
  in_transit: "En tránsito",
  completed: "Completado",
  cancelled: "Cancelado",
};
const statusColors: Record<string, string> = {
  draft: "text-muted-foreground",
  pending: "text-amber-500",
  approved: "text-blue-500",
  in_transit: "text-purple-500",
  completed: "text-green-600",
  cancelled: "text-red-500",
};
const typeLabels: Record<string, string> = {
  transfer: "Transferencia",
  receive: "Recepción",
  adjustment: "Ajuste",
  new_product: "Nuevo Producto",
};

export default function AdminWorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [wo, setWo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  const load = () => {
    fetch(`/api/work-orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setWo(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function transition(nextStatus: string, reason?: string) {
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, cancelReason: reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setWo(data);
      setShowCancel(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActing(false);
    }
  }

  if (loading)
    return (
      <div className="p-6 text-muted-foreground animate-pulse">Cargando...</div>
    );
  if (!wo)
    return (
      <div className="p-6 text-muted-foreground">Orden no encontrada.</div>
    );

  const nextActions: Record<string, { label: string; nextStatus: string }[]> = {
    pending: [{ label: "Aprobar", nextStatus: "approved" }],
    approved: [{ label: "Marcar En Tránsito", nextStatus: "in_transit" }],
    in_transit: [
      {
        label: "Marcar Completado (aplica inventario)",
        nextStatus: "completed",
      },
    ],
  };

  return (
    <div className="p-6 max-w-2xl">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5"
      >
        <MdArrowBack size={16} /> Regresar
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Orden #{wo.workOrderNumber}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {typeLabels[wo.type] ?? wo.type} ·{" "}
            {new Date(wo.createdAt).toLocaleString("es-MX")}
          </p>
          {wo.requestedBy && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Solicitado por:{" "}
              <span className="font-medium">{wo.requestedBy.name}</span>
            </p>
          )}
        </div>
        <span className={`text-sm font-bold ${statusColors[wo.status]}`}>
          {statusLabels[wo.status]}
        </span>
      </div>

      {/* Route */}
      <div className="bg-muted/50 rounded-xl p-4 text-sm grid grid-cols-2 gap-4 mb-5">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Origen</p>
          <p className="font-semibold">{wo.fromStore?.name ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Destino</p>
          <p className="font-semibold">{wo.toStore?.name}</p>
        </div>
      </div>

      {/* Items */}
      <div className="mb-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Artículos
        </p>
        <div className="border border-muted rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Producto / Variación</th>
                <th className="px-4 py-2 text-center">Cant.</th>
                <th className="px-4 py-2 text-right">Costo Unit.</th>
              </tr>
            </thead>
            <tbody>
              {wo.items?.map((item: any, i: number) => (
                <tr key={i} className="border-t border-muted">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-xs">{item.productTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.variationTitle}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-center font-bold">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground text-xs">
                    {item.unitCost ? `$${item.unitCost?.toFixed(2)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {wo.notes && (
        <div className="bg-muted/30 rounded-xl px-4 py-3 text-sm text-muted-foreground mb-5">
          <p className="text-xs font-medium uppercase tracking-wide mb-1">
            Notas
          </p>
          {wo.notes}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {/* Actions */}
      {nextActions[wo.status] && (
        <div className="flex flex-wrap gap-2 mb-3">
          {nextActions[wo.status].map((action) => (
            <button
              key={action.nextStatus}
              disabled={acting}
              onClick={() => transition(action.nextStatus)}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              <MdCheck size={16} /> {action.label}
            </button>
          ))}
          {!["completed", "cancelled"].includes(wo.status) && (
            <button
              onClick={() => setShowCancel(true)}
              className="flex items-center gap-2 border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              <MdClose size={16} /> Cancelar
            </button>
          )}
        </div>
      )}

      {showCancel && (
        <div className="border border-red-200 rounded-xl p-4 flex flex-col gap-3">
          <textarea
            placeholder="Motivo de cancelación"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={2}
            className="bg-muted rounded-lg px-3 py-2 text-sm outline-none resize-none"
          />
          <div className="flex gap-2">
            <button
              disabled={acting}
              onClick={() => transition("cancelled", cancelReason)}
              className="bg-red-500 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Confirmar cancelación
            </button>
            <button
              onClick={() => setShowCancel(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
