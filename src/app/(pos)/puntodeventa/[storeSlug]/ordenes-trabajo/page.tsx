"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import POSSidebar from "../_components/POSSidebar";
import Link from "next/link";
import { MdAdd, MdOpenInNew } from "react-icons/md";

interface WorkOrder {
  _id: string;
  workOrderNumber: number;
  type: string;
  status: string;
  fromStore?: { name: string };
  toStore: { name: string };
  items: { quantity: number }[];
  createdAt: string;
}

const statusColors: Record<string, string> = {
  draft: "text-muted-foreground",
  pending: "text-amber-500",
  approved: "text-blue-500",
  in_transit: "text-purple-500",
  completed: "text-green-600",
  cancelled: "text-red-500",
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

export default function POSWorkOrdersPage() {
  const params = useParams();
  const storeSlug = params?.storeSlug as string;
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    if ((session?.user as any)?.role !== "manager") {
      router.replace(`/puntodeventa/${storeSlug}`);
    }
  }, [session, status, router, storeSlug]);

  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/work-orders?storeId=${storeId}`)
      .then((r) => r.json())
      .then((data) => {
        setWorkOrders(data?.workOrders ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [storeId]);

  return (
    <div className="flex h-screen bg-background">
      <POSSidebar storeSlug={storeSlug} storeName={storeName} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Órdenes de Trabajo</h1>
            <p className="text-xs text-muted-foreground">{storeName}</p>
          </div>
          <Link
            href={`/puntodeventa/${storeSlug}/ordenes-trabajo/nueva`}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <MdAdd size={18} /> Nueva Orden
          </Link>
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
                    <td className="px-4 py-3 text-center">
                      {wo.items.reduce((s, i) => s + i.quantity, 0)}
                    </td>
                    <td
                      className={`px-4 py-3 text-xs font-semibold ${statusColors[wo.status]}`}
                    >
                      {statusLabels[wo.status] ?? wo.status}
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
      </div>
    </div>
  );
}
