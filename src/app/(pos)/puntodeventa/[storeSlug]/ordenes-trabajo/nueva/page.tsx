"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import POSSidebar from "../../_components/POSSidebar";
import { MdArrowBack, MdAdd, MdDelete } from "react-icons/md";

interface Store {
  _id: string;
  name: string;
  slug: string;
}
interface Product {
  _id: string;
  title: string;
  variations: {
    _id: string;
    color?: string;
    size?: string;
    title?: string;
    price: number;
  }[];
}

interface LineItem {
  productId: string;
  productTitle: string;
  variationId: string;
  variationLabel: string;
  quantity: number;
  unitCost: number;
  notes: string;
}

const WORK_ORDER_TYPES = [
  { value: "transfer", label: "Transferencia entre sucursales" },
  { value: "receive", label: "Recepción de mercancía" },
  { value: "adjustment", label: "Ajuste de inventario" },
  { value: "new_product", label: "Agregar nuevo producto" },
];

export default function NewWorkOrderPage() {
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

  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [storeName, setStoreName] = useState("");

  const [type, setType] = useState("receive");
  const [fromStoreId, setFromStoreId] = useState("");
  const [toStoreId, setToStoreId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((stores: Store[]) => {
        setAllStores(stores);
        const found = stores.find((s) => s.slug === storeSlug);
        if (found) {
          setCurrentStore(found);
          setStoreName(found.name);
          setToStoreId(found._id);
        }
      });
  }, [storeSlug]);

  useEffect(() => {
    if (!productSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(
        `/api/products?keyword=${encodeURIComponent(productSearch)}&perpage=6`,
      )
        .then((r) => r.json())
        .then((d) => setSearchResults(d?.products ?? []));
    }, 300);
    return () => clearTimeout(t);
  }, [productSearch]);

  function addItem(product: Product, variation: Product["variations"][0]) {
    const label =
      [variation.color, variation.size, variation.title]
        .filter(Boolean)
        .join(" / ") || "Default";
    setItems((prev) => {
      if (prev.find((i) => i.variationId === variation._id)) return prev;
      return [
        ...prev,
        {
          productId: product._id,
          productTitle: product.title,
          variationId: variation._id,
          variationLabel: label,
          quantity: 1,
          unitCost: variation.price ?? 0,
          notes: "",
        },
      ];
    });
    setProductSearch("");
    setSearchResults([]);
  }

  function updateItem(variationId: string, field: keyof LineItem, value: any) {
    setItems((prev) =>
      prev.map((i) =>
        i.variationId === variationId ? { ...i, [field]: value } : i,
      ),
    );
  }

  function removeItem(variationId: string) {
    setItems((prev) => prev.filter((i) => i.variationId !== variationId));
  }

  async function handleSubmit() {
    setError("");
    if (!items.length) {
      setError("Agrega al menos un artículo.");
      return;
    }
    if (!toStoreId) {
      setError("Selecciona la sucursal destino.");
      return;
    }
    if (type === "transfer" && !fromStoreId) {
      setError("Selecciona la sucursal origen para la transferencia.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type,
        toStore: toStoreId,
        ...(type === "transfer" && { fromStore: fromStoreId }),
        notes,
        items: items.map((i) => ({
          product: i.productId,
          productTitle: i.productTitle,
          variationId: i.variationId,
          variationTitle: i.variationLabel,
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost),
          notes: i.notes,
        })),
      };

      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear la orden");
      router.push(`/puntodeventa/${storeSlug}/ordenes-trabajo`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <POSSidebar storeSlug={storeSlug} storeName={storeName} />
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5"
        >
          <MdArrowBack size={16} /> Regresar
        </button>

        <h1 className="text-xl font-bold mb-6">Nueva Orden de Trabajo</h1>

        <div className="flex flex-col gap-5">
          {/* Type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
              Tipo de orden
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none"
            >
              {WORK_ORDER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Store selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {type === "transfer" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                  Sucursal origen
                </label>
                <select
                  value={fromStoreId}
                  onChange={(e) => setFromStoreId(e.target.value)}
                  className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none"
                >
                  <option value="">— Seleccionar —</option>
                  {allStores
                    .filter((s) => s._id !== toStoreId)
                    .map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                Sucursal destino
              </label>
              <select
                value={toStoreId}
                onChange={(e) => setToStoreId(e.target.value)}
                className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none"
              >
                <option value="">— Seleccionar —</option>
                {allStores.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product search */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
              Agregar artículos
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar producto..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-muted rounded-xl shadow-xl max-h-64 overflow-y-auto">
                  {searchResults.map((product) => (
                    <div
                      key={product._id}
                      className="border-b border-muted last:border-0"
                    >
                      <p className="px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                        {product.title}
                      </p>
                      {product.variations?.map((v) => {
                        const label =
                          [v.color, v.size, v.title]
                            .filter(Boolean)
                            .join(" / ") || "Default";
                        return (
                          <button
                            key={v._id}
                            onClick={() => addItem(product, v)}
                            className="w-full flex items-center justify-between px-5 py-2 text-xs hover:bg-primary hover:text-primary-foreground transition-colors text-left"
                          >
                            <span>{label}</span>
                            <span className="font-semibold">
                              ${v.price?.toFixed(2)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="border border-muted rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      Producto / Variación
                    </th>
                    <th className="px-3 py-2 text-center">Cant.</th>
                    <th className="px-3 py-2 text-center">Costo Unit.</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.variationId}
                      className="border-t border-muted"
                    >
                      <td className="px-3 py-2">
                        <p className="font-medium line-clamp-1">
                          {item.productTitle}
                        </p>
                        <p className="text-muted-foreground">
                          {item.variationLabel}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              item.variationId,
                              "quantity",
                              e.target.value,
                            )
                          }
                          className="w-14 bg-muted rounded px-2 py-1 outline-none text-center"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={item.unitCost}
                          onChange={(e) =>
                            updateItem(
                              item.variationId,
                              "unitCost",
                              e.target.value,
                            )
                          }
                          className="w-20 bg-muted rounded px-2 py-1 outline-none text-center"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => removeItem(item.variationId)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <MdDelete size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes */}
          <textarea
            placeholder="Notas adicionales (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
          />

          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? "Guardando..." : "Crear Orden de Trabajo"}
          </button>
        </div>
      </div>
    </div>
  );
}
