"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";
import POSSidebar from "../../_components/POSSidebar";
import {
  MdArrowBack,
  MdSearch,
  MdClose,
  MdAdd,
  MdDelete,
  MdShield,
  MdLock,
} from "react-icons/md";

const TYPE_OPTIONS = [
  {
    value: "receive",
    label: "Recepción de mercancía",
    description: "Ingresar nuevo inventario a una sucursal",
  },
  {
    value: "transfer",
    label: "Transferencia entre sucursales",
    description: "Mover stock de una sucursal a otra",
  },
  {
    value: "adjustment",
    label: "Ajuste de inventario",
    description: "Corrección manual de existencias en una sucursal",
  },
];

interface Store {
  _id: string;
  name: string;
  slug: string;
}

interface OrderItem {
  productId: string;
  productTitle: string;
  variationId: string;
  variationTitle: string;
  quantity: number;
  unitCost: number | "";
}

interface SearchResult {
  _id: string;
  title: string;
  images: { url: string }[];
  variations: {
    _id: string;
    title?: string;
    color?: string;
    size?: string;
    price: number;
  }[];
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
            para crear órdenes de trabajo.
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

export default function NewWorkOrderPage() {
  const params = useParams();
  const storeSlug = params?.storeSlug as string;
  const router = useRouter();

  const [pageUnlocked, setPageUnlocked] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [stores, setStores] = useState<Store[]>([]);

  const [type, setType] = useState<"receive" | "transfer" | "adjustment">(
    "receive",
  );
  const [toStore, setToStore] = useState("");
  const [fromStore, setFromStore] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Product search
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((data: Store[]) => {
        const active = Array.isArray(data) ? data : [];
        setStores(active);
        const found = active.find((s) => s.slug === storeSlug);
        if (found) {
          setStoreName(found.name);
          setToStore(found._id);
        }
      });
  }, [storeSlug]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    fetch(`/api/pos/search?q=${encodeURIComponent(debouncedQuery)}&limit=8`)
      .then((r) => r.json())
      .then((data) => {
        setSearchResults(Array.isArray(data) ? data : []);
        setSearching(false);
      })
      .catch(() => setSearching(false));
  }, [debouncedQuery]);

  const addItem = useCallback(
    (product: SearchResult, variation: SearchResult["variations"][0]) => {
      const label =
        [variation.color, variation.size, variation.title]
          .filter(Boolean)
          .join(" / ") || "Default";
      const exists = items.findIndex(
        (i) => i.productId === product._id && i.variationId === variation._id,
      );
      if (exists !== -1) {
        setItems((prev) =>
          prev.map((i, idx) =>
            idx === exists ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        );
      } else {
        setItems((prev) => [
          ...prev,
          {
            productId: product._id,
            productTitle: product.title,
            variationId: variation._id,
            variationTitle: label,
            quantity: 1,
            unitCost: variation.price ?? "",
          },
        ]);
      }
      setQuery("");
      setSearchResults([]);
    },
    [items],
  );

  const updateItem = (idx: number, field: keyof OrderItem, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    setError("");
    if (!toStore) return setError("Selecciona la sucursal destino.");
    if (type === "transfer" && !fromStore)
      return setError("Selecciona la sucursal origen.");
    if (type === "transfer" && fromStore === toStore)
      return setError("Origen y destino no pueden ser la misma sucursal.");
    if (items.length === 0) return setError("Agrega al menos un producto.");

    setSubmitting(true);
    try {
      const payload: any = {
        type,
        toStore,
        notes,
        items: items.map((i) => ({
          product: i.productId,
          productTitle: i.productTitle,
          variationId: i.variationId,
          variationTitle: i.variationTitle,
          quantity: Number(i.quantity),
          unitCost: i.unitCost !== "" ? Number(i.unitCost) : undefined,
        })),
      };
      if (type === "transfer") payload.fromStore = fromStore;

      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear la orden");
      router.push(`/puntodeventa/${storeSlug}/ordenes-trabajo/${data._id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

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
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5"
        >
          <MdArrowBack size={16} /> Regresar
        </button>

        <h1 className="text-xl font-bold mb-1">Nueva Orden de Trabajo</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Registra recepciones, transferencias y ajustes de inventario.
        </p>

        {/* Type selector — card buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value as any)}
              className={`text-left border rounded-xl px-4 py-3 transition-all ${
                type === opt.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-muted hover:border-muted-foreground"
              }`}
            >
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {opt.description}
              </p>
            </button>
          ))}
        </div>

        {/* Store selectors */}
        <div
          className={`grid gap-4 mb-6 ${
            type === "transfer" ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {type === "transfer" && (
            <div>
              <label className="block text-xs font-medium mb-1">
                Sucursal origen
              </label>
              <select
                value={fromStore}
                onChange={(e) => setFromStore(e.target.value)}
                className="w-full bg-muted border border-muted rounded-lg px-3 py-2 text-sm outline-none"
              >
                <option value="">Seleccionar...</option>
                {stores.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1">
              {type === "transfer" ? "Sucursal destino" : "Sucursal"}
            </label>
            <select
              value={toStore}
              onChange={(e) => setToStore(e.target.value)}
              className="w-full bg-muted border border-muted rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option value="">Seleccionar...</option>
              {stores.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product search */}
        <div className="mb-2">
          <label className="block text-xs font-medium mb-1">
            Buscar y agregar productos
          </label>
          <div className="relative">
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
              <MdSearch
                size={18}
                className="text-muted-foreground flex-shrink-0"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, ID, marca..."
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    setSearchResults([]);
                  }}
                >
                  <MdClose size={16} className="text-muted-foreground" />
                </button>
              )}
            </div>

            {(searching || searchResults.length > 0) && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-muted rounded-xl shadow-xl max-h-64 overflow-y-auto">
                {searching && (
                  <p className="text-xs text-muted-foreground p-3 animate-pulse">
                    Buscando...
                  </p>
                )}
                {searchResults.map((product) =>
                  product.variations.map((v) => {
                    const label =
                      [v.color, v.size, v.title].filter(Boolean).join(" / ") ||
                      "Default";
                    return (
                      <button
                        key={`${product._id}-${v._id}`}
                        onClick={() => addItem(product, v)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left border-b border-muted last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {product.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {label}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-primary">
                          ${v.price?.toFixed(2)}
                        </span>
                        <MdAdd
                          size={16}
                          className="text-muted-foreground flex-shrink-0"
                        />
                      </button>
                    );
                  }),
                )}
              </div>
            )}
          </div>
        </div>

        {/* Items table */}
        {items.length > 0 && (
          <div className="border border-muted rounded-xl overflow-hidden mb-6 mt-4">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Producto / Variación</th>
                  <th className="px-4 py-2 text-center w-24">Cantidad</th>
                  {type === "receive" && (
                    <th className="px-4 py-2 text-right w-32">Costo Unit.</th>
                  )}
                  <th className="px-4 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-t border-muted">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-xs">{item.productTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.variationTitle}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(idx, "quantity", Number(e.target.value))
                        }
                        className="w-16 text-center bg-muted rounded-lg px-2 py-1 text-xs outline-none border border-muted"
                      />
                    </td>
                    {type === "receive" && (
                      <td className="px-4 py-2.5 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitCost}
                          onChange={(e) =>
                            updateItem(
                              idx,
                              "unitCost",
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                            )
                          }
                          placeholder="—"
                          className="w-24 text-right bg-muted rounded-lg px-2 py-1 text-xs outline-none border border-muted"
                        />
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
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
        <div className="mb-6">
          <label className="block text-xs font-medium mb-1">
            Notas (opcional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones, número de factura, proveedor, etc."
            className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none resize-none border border-muted"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <button
          disabled={submitting}
          onClick={handleSubmit}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {submitting ? "Creando orden..." : "Crear Orden de Trabajo"}
        </button>
      </div>
    </div>
  );
}
