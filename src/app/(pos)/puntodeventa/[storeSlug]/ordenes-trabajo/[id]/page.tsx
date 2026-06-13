"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import POSSidebar from "../../_components/POSSidebar";
import {
  MdArrowBack,
  MdCheck,
  MdClose,
  MdLocalShipping,
  MdShield,
  MdLock,
} from "react-icons/md";

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
const nextActions: Record<
  string,
  { label: string; nextStatus: string; icon: any }[]
> = {
  pending: [{ label: "Aprobar", nextStatus: "approved", icon: MdCheck }],
  approved: [
    {
      label: "Marcar En Tránsito",
      nextStatus: "in_transit",
      icon: MdLocalShipping,
    },
  ],
  in_transit: [
    { label: "Confirmar Recepción", nextStatus: "completed", icon: MdCheck },
  ],
};

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
            para ver y gestionar esta orden de trabajo.
          </p>
          <input
            type="password"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            inputMode="numeric"
            maxLength={6}
            autoFocus
            placeholder="••••••"
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

export default function WorkOrderDetailPage() {
  const params = useParams();
  const storeSlug = params?.storeSlug as string;
  const workOrderId = params?.id as string;
  const router = useRouter();

  const [pageUnlocked, setPageUnlocked] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [wo, setWo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((stores: any[]) => {
        const found = stores.find((s) => s.slug === storeSlug);
        if (found) setStoreName(found.name);
      });
  }, [storeSlug]);

  useEffect(() => {
    if (!workOrderId) return;
    fetch(`/api/work-orders/${workOrderId}`)
      .then((r) => r.json())
      .then((data) => {
        setWo(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [workOrderId]);

  async function transition(nextStatus: string, reason?: string) {
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, cancelReason: reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al actualizar");
      setWo(data);
      setShowCancel(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActing(false);
    }
  }

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

  if (loading)
    return (
      <div className="flex h-screen bg-background">
        <POSSidebar storeSlug={storeSlug} storeName={storeName} />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground animate-pulse">Cargando...</p>
        </div>
      </div>
    );

  return (
    <div className="flex h-screen bg-background">
      <POSSidebar storeSlug={storeSlug} storeName={storeName} />
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5"
        >
          <MdArrowBack size={16} /> Regresar
        </button>

        {!wo ? (
          <p className="text-muted-foreground">Orden no encontrada.</p>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold">
                  Orden #{wo.workOrderNumber}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {wo.type} · {new Date(wo.createdAt).toLocaleString("es-MX")}
                </p>
              </div>
              <span className={`text-sm font-bold ${statusColors[wo.status]}`}>
                {statusLabels[wo.status]}
              </span>
            </div>

            {/* Route */}
            <div className="bg-muted/50 rounded-xl p-4 text-sm grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Origen</p>
                <p className="font-medium">{wo.fromStore?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Destino</p>
                <p className="font-medium">{wo.toStore?.name}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Artículos
              </p>
              <div className="border border-muted rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">Producto</th>
                      <th className="px-4 py-2 text-center">Cant.</th>
                      <th className="px-4 py-2 text-right">Costo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wo.items?.map((item: any, i: number) => (
                      <tr key={i} className="border-t border-muted">
                        <td className="px-4 py-2">
                          <p className="font-medium text-xs line-clamp-1">
                            {item.productTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.variationTitle}
                          </p>
                        </td>
                        <td className="px-4 py-2 text-center font-bold">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          {item.unitCost
                            ? `$${item.unitCost?.toFixed(2)}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {wo.notes && (
              <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl px-4 py-3">
                {wo.notes}
              </p>
            )}

            {error && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Action buttons */}
            {nextActions[wo.status] && (
              <div className="flex flex-wrap gap-2">
                {nextActions[wo.status].map((action) => (
                  <button
                    key={action.nextStatus}
                    disabled={acting}
                    onClick={() => transition(action.nextStatus)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    <action.icon size={16} /> {action.label}
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
        )}
      </div>
    </div>
  );
}
