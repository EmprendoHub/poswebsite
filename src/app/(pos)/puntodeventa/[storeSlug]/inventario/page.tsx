"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import POSSidebar from "../_components/POSSidebar";
import Image from "next/image";
import { MdWarning, MdRefresh } from "react-icons/md";

interface InventoryItem {
  _id: string;
  variationId: string;
  quantity: number;
  minStock: number;
  product: {
    _id: string;
    title: string;
    images: { url: string }[];
    price: number;
    variations: {
      _id: string;
      color?: string;
      size?: string;
      title?: string;
    }[];
  };
}

export default function POSInventoryPage() {
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
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "low">("all");

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

  const loadInventory = () => {
    if (!storeId) return;
    setLoading(true);
    const url = `/api/store-inventory?storeId=${storeId}${filter === "low" ? "&lowStock=true" : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setInventory(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadInventory();
  }, [storeId, filter]);

  return (
    <div className="flex h-screen bg-background">
      <POSSidebar storeSlug={storeSlug} storeName={storeName} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Inventario</h1>
            <p className="text-xs text-muted-foreground">{storeName}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as "all" | "low")}
              className="text-xs bg-muted border border-muted rounded-lg px-3 py-2 outline-none"
            >
              <option value="all">Todo el inventario</option>
              <option value="low">⚠ Stock bajo</option>
            </select>
            <button
              onClick={loadInventory}
              className="p-2 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <MdRefresh size={18} />
            </button>
          </div>
        </div>

        {loading && (
          <p className="text-muted-foreground text-sm animate-pulse">
            Cargando inventario...
          </p>
        )}

        {!loading && inventory.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p>No hay registros de inventario para esta sucursal.</p>
            <p className="text-xs mt-1">
              Los productos aparecerán aquí cuando se procesen órdenes de
              trabajo.
            </p>
          </div>
        )}

        {!loading && inventory.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-muted">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Producto</th>
                  <th className="px-4 py-3 text-left">Variación</th>
                  <th className="px-4 py-3 text-center">Existencia</th>
                  <th className="px-4 py-3 text-center">Mín.</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => {
                  const variation = item.product?.variations?.find(
                    (v: any) => v._id?.toString() === item.variationId,
                  );
                  const varLabel = variation
                    ? [variation.color, variation.size, variation.title]
                        .filter(Boolean)
                        .join(" / ")
                    : item.variationId;
                  const isLow = item.quantity <= item.minStock;

                  return (
                    <tr
                      key={item._id}
                      className="border-t border-muted hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.product?.images?.[0]?.url && (
                            <Image
                              src={item.product.images[0].url}
                              alt={item.product.title}
                              width={36}
                              height={36}
                              className="rounded object-cover w-9 h-9 flex-shrink-0"
                            />
                          )}
                          <span className="font-medium text-xs line-clamp-2 max-w-[200px]">
                            {item.product?.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {varLabel}
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {item.minStock}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isLow ? (
                          <span className="flex items-center justify-center gap-1 text-amber-600 text-xs font-medium">
                            <MdWarning size={14} /> Bajo
                          </span>
                        ) : (
                          <span className="text-green-600 text-xs font-medium">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
