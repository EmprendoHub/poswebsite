"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  MdPrint,
  MdSearch,
  MdClose,
  MdInventory2,
  MdStorefront,
  MdNavigateBefore,
  MdNavigateNext,
} from "react-icons/md";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface Store {
  _id: string;
  name: string;
  slug: string;
}
interface ProductResult {
  _id: string;
  title: string;
  ASIN?: string;
  brand?: string;
  variations: { _id: string; title: string }[];
  images?: { url: string }[];
}
interface InventoryRecord {
  variationId: string;
  quantity: number;
}
interface Movement {
  type: "sale" | "transfer_in" | "transfer_out" | "adjustment";
  date: string;
  reference?: string;
  orderId?: number;
  customerName?: string;
  phone?: string;
  orderStatus?: string;
  payMethod?: string;
  variationId: string;
  variationName?: string;
  quantity: number;
  stockImpact?: number;
  unitPrice: number;
  total: number;
  details?: string;
  authorizedBy?: string;
  branches?: string[];
}
interface CardexData {
  product: ProductResult;
  inventoryRecords: InventoryRecord[];
  movements: Movement[];
  storeName: string;
  storeStockMap?: { [storeName: string]: { [variationId: string]: number } };
}

/* ─── Helpers ─────────────────────────────────────────────────────── */
const fmt = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const fmtDate = (d: string) =>
  new Date(d).toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });

const payLabel = (ref?: string) => {
  const v = ref ?? "";
  if (v === "EFECTIVO") return "Efectivo";
  if (v.startsWith("MIXTO")) return "Mixto";
  if (v) return "Terminal";
  return "—";
};

const movementTypeLabel = (type: Movement["type"]) => {
  if (type === "sale") return "Venta";
  if (type === "transfer_in") return "Entrada";
  if (type === "transfer_out") return "Salida";
  return "Ajuste";
};

/* ─── Print view ─────────────────────────────────────────────────── */
function CardexPrintView({
  data,
  variationId,
  storeName,
}: {
  data: CardexData;
  variationId: string;
  storeName: string;
}) {
  const { product, inventoryRecords, movements } = data;
  const line = "─".repeat(80);
  const filtered = variationId
    ? movements.filter((m) => m.variationId === variationId)
    : movements;
  const selectedVar = variationId
    ? product.variations.find((v) => v._id === variationId)
    : null;
  const stock = variationId
    ? (inventoryRecords.find((r) => r.variationId === variationId)?.quantity ??
      0)
    : inventoryRecords.reduce((s, r) => s + r.quantity, 0);
  const totalSold = filtered
    .filter((m) => m.type === "sale")
    .reduce((s, m) => s + m.quantity, 0);

  return (
    <div
      id="pos-ticket"
      className="font-mono text-black bg-white text-xs"
      style={{ padding: "10mm", lineHeight: "1.5", width: "100%" }}
    >
      <div
        style={{
          textAlign: "center",
          fontWeight: "bold",
          fontSize: "16px",
          marginBottom: "4px",
        }}
      >
        SUPER COLLECTIBLES
      </div>
      <div
        style={{ textAlign: "center", fontSize: "12px", marginBottom: "2px" }}
      >
        {storeName}
      </div>
      <div
        style={{ textAlign: "center", fontSize: "11px", marginBottom: "6px" }}
      >
        Cardex de Producto — {new Date().toLocaleDateString("es-MX")}
      </div>
      <div>{line}</div>
      <div style={{ marginTop: "4px" }}>
        <strong>Producto:</strong> {product.title}
      </div>
      {product.ASIN && (
        <div>
          <strong>ASIN:</strong> {product.ASIN}
        </div>
      )}
      {product.brand && (
        <div>
          <strong>Cert:</strong> {product.brand}
        </div>
      )}
      {selectedVar && (
        <div>
          <strong>Variación:</strong> {selectedVar.title}
        </div>
      )}
      <div>
        <strong>Stock actual:</strong> {stock} unidades
      </div>
      <div>
        <strong>Total vendido:</strong> {totalSold} unidades
      </div>
      <div style={{ margin: "6px 0 2px" }}>{line}</div>
      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
        HISTORIAL DE MOVIMIENTOS
      </div>
      <div
        style={{
          display: "flex",
          gap: "4px",
          fontWeight: "bold",
          fontSize: "10px",
          borderBottom: "1px solid #000",
          paddingBottom: "2px",
          marginBottom: "2px",
        }}
      >
        <span style={{ width: "95px" }}>Tipo</span>
        <span style={{ width: "140px" }}>Fecha</span>
        <span style={{ width: "70px" }}>Ref.</span>
        <span style={{ width: "170px" }}>Detalle</span>
        <span style={{ width: "50px", textAlign: "right" }}>Impacto</span>
        <span style={{ width: "80px", textAlign: "right" }}>Total</span>
      </div>
      {filtered.length === 0 && (
        <div style={{ padding: "8px", color: "#555" }}>Sin movimientos.</div>
      )}
      {filtered.map((m, idx) => {
        const detail =
          m.type === "sale"
            ? `${m.customerName || "—"} · ${payLabel(m.payMethod)} · ${m.orderStatus || "—"}`
            : m.details || "—";
        const ref = m.reference || (m.orderId ? `#${m.orderId}` : "—");
        const impact = Number(m.stockImpact ?? 0);
        return (
          <div
            key={idx}
            style={{
              display: "flex",
              gap: "4px",
              fontSize: "10px",
              paddingBottom: "2px",
              borderBottom: "1px dotted #ccc",
            }}
          >
            <span style={{ width: "95px" }}>{movementTypeLabel(m.type)}</span>
            <span style={{ width: "140px" }}>{fmtDate(m.date)}</span>
            <span style={{ width: "70px" }}>{ref}</span>
            <span
              style={{
                width: "170px",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {detail}
            </span>

            <span style={{ width: "50px", textAlign: "right" }}>
              {impact > 0 ? `+${impact}` : `${impact}`}
            </span>
            <span style={{ width: "80px", textAlign: "right" }}>
              {fmt(m.total)}
            </span>
          </div>
        );
      })}
      <div style={{ marginTop: "6px" }}>{line}</div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "4px",
          fontWeight: "bold",
        }}
      >
        <span>TOTAL VENDIDO:</span>
        <span>{fmt(filtered.reduce((s, m) => s + m.total, 0))}</span>
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: "10px",
          marginTop: "8px",
          color: "#555",
        }}
      >
        Generado el {new Date().toLocaleString("es-MX")}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────── */
export default function AdminCardexPage() {
  const { data: session, status } = useSession();
  const userRole = (session?.user as any)?.role;
  const canAccess = userRole === "manager" || userRole === "super_admin";

  const [stores, setStores] = useState<Store[]>([]);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(
    null,
  );
  const [selectedVariationId, setSelectedVariationId] = useState("");

  const [cardex, setCardex] = useState<CardexData | null>(null);
  const [loadingCardex, setLoadingCardex] = useState(false);
  const [cardexError, setCardexError] = useState("");
  const [showPrint, setShowPrint] = useState(false);

  const [movementPage, setMovementPage] = useState(1);
  const [movementType, setMovementType] = useState<"all" | Movement["type"]>(
    "all",
  );
  const [movementSearch, setMovementSearch] = useState("");
  const movementsPerPage = 10;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Load stores ── */
  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((data: Store[]) => setStores(data ?? []));
  }, []);

  /* ── Debounced product search ── */
  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/pos/cardex?q=${encodeURIComponent(query.trim())}`,
        );
        const data = await res.json();
        setSearchResults(data.products ?? []);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [query]);

  /* ── Load cardex ── */
  const loadCardex = useCallback(async (productId: string, varId = "") => {
    setLoadingCardex(true);
    setCardexError("");
    setCardex(null);
    try {
      const p = new URLSearchParams({ productId });
      if (varId) p.set("variationId", varId);
      const res = await fetch(`/api/pos/cardex?${p}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cargar cardex");
      setCardex(data);
    } catch (e: any) {
      setCardexError(e.message);
    } finally {
      setLoadingCardex(false);
    }
  }, []);

  function selectProduct(p: ProductResult) {
    setSelectedProduct(p);
    setSelectedVariationId("");
    setSearchResults([]);
    setQuery(p.title);
    loadCardex(p._id, "");
  }

  function handleVariationChange(varId: string) {
    setSelectedVariationId(varId);
    if (selectedProduct) loadCardex(selectedProduct._id, varId);
  }

  function clearSearch() {
    setQuery("");
    setSelectedProduct(null);
    setSelectedVariationId("");
    setSearchResults([]);
    setCardex(null);
    setCardexError("");
  }

  const filteredMovements = cardex
    ? selectedVariationId
      ? cardex.movements.filter((m) => m.variationId === selectedVariationId)
      : cardex.movements
    : [];

  /* ── Filter movements by type and search ── */
  const typeFilteredMovements = filteredMovements.filter((m) => {
    if (movementType !== "all" && m.type !== movementType) return false;
    if (movementSearch.trim()) {
      const searchLower = movementSearch.toLowerCase();
      return (
        (m.reference && m.reference.toLowerCase().includes(searchLower)) ||
        (m.customerName &&
          m.customerName.toLowerCase().includes(searchLower)) ||
        (m.details && m.details.toLowerCase().includes(searchLower)) ||
        (m.variationName && m.variationName.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  /* ── Pagination calculation ── */
  const totalPages = Math.ceil(typeFilteredMovements.length / movementsPerPage);
  const startIdx = (movementPage - 1) * movementsPerPage;
  const paginatedMovements = typeFilteredMovements.slice(
    startIdx,
    startIdx + movementsPerPage,
  );

  /* ── Reset page on filter change ── */
  useEffect(() => {
    setMovementPage(1);
  }, [movementType, movementSearch, selectedVariationId]);
  const currentStock = cardex
    ? selectedVariationId
      ? (cardex.inventoryRecords.find(
          (r) => r.variationId === selectedVariationId,
        )?.quantity ?? 0)
      : cardex.inventoryRecords.reduce((s, r) => s + r.quantity, 0)
    : 0;
  const totalSold = filteredMovements
    .filter((m) => m.type === "sale")
    .reduce((s, m) => s + m.quantity, 0);
  const totalRevenue = filteredMovements
    .filter((m) => m.type === "sale")
    .reduce((s, m) => s + m.total, 0);
  const netStockImpact = filteredMovements.reduce(
    (s, m) => s + Number(m.stockImpact ?? 0),
    0,
  );

  if (status !== "loading" && !canAccess) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <p className="text-sm text-red-500">No autorizado.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 no-print">
      {/* Print overlay */}
      {showPrint && cardex && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center print:bg-transparent print:inset-auto print:z-auto print:relative">
          <div className="bg-white rounded-xl shadow-xl p-4 flex flex-col items-center gap-4 max-w-5xl w-full mx-4 print:shadow-none print:p-0 print:rounded-none">
            <div className="no-print flex gap-3 items-center self-start">
              <span className="font-semibold text-black">Vista previa</span>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 bg-primary text-white text-sm px-4 py-2 rounded-lg"
              >
                <MdPrint size={16} /> Imprimir
              </button>
              <button
                onClick={() => setShowPrint(false)}
                className="text-gray-500 text-sm underline"
              >
                Cerrar
              </button>
            </div>
            <div className="w-full overflow-auto max-h-[70vh] print:max-h-none">
              <CardexPrintView
                data={cardex}
                variationId={selectedVariationId}
                storeName="Todas las sucursales"
              />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MdInventory2 size={22} /> Cardex de Producto (Global)
          </h1>
          <p className="text-xs text-muted-foreground">
            Historial de movimientos de todos los productos en todas las
            sucursales
          </p>
        </div>
        {cardex && (
          <button
            onClick={() => setShowPrint(true)}
            className="flex items-center gap-2 bg-muted hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <MdPrint size={16} /> Imprimir historial
          </button>
        )}
      </div>

      {/* Product search */}
      <div className="relative mb-6">
        <div className="flex items-center gap-2 bg-card border border-muted rounded-xl px-4 py-3">
          <MdSearch size={18} className="text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value) clearSearch();
            }}
            placeholder="Buscar producto por nombre, ASIN o Cert…"
            className="flex-1 bg-transparent outline-none text-sm"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="text-muted-foreground hover:text-foreground"
            >
              <MdClose size={18} />
            </button>
          )}
          {searching && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Buscando…
            </span>
          )}
        </div>
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-muted rounded-xl shadow-xl z-30 max-h-72 overflow-y-auto">
            {searchResults.map((p) => (
              <button
                key={p._id}
                onClick={() => selectProduct(p)}
                className="w-full text-left px-4 py-3 hover:bg-muted border-b border-muted last:border-0 transition-colors"
              >
                <p className="text-sm font-medium truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {p.brand && `${p.brand} · `}
                  {p.ASIN && `ASIN: ${p.ASIN} · `}
                  {p.variations.length} variación(es)
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Variation pills */}
      {selectedProduct && selectedProduct.variations.length > 1 && (
        <div className="mb-6">
          <label className="text-xs text-muted-foreground mb-2 block font-medium uppercase tracking-wide">
            Filtrar por variación
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleVariationChange("")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selectedVariationId === "" ? "bg-primary text-primary-foreground border-primary" : "border-muted text-muted-foreground hover:border-foreground"}`}
            >
              Todas
            </button>
            {selectedProduct.variations.map((v) => (
              <button
                key={v._id}
                onClick={() => handleVariationChange(v._id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selectedVariationId === v._id ? "bg-primary text-primary-foreground border-primary" : "border-muted text-muted-foreground hover:border-foreground"}`}
              >
                {v.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {loadingCardex && (
        <p className="text-sm text-muted-foreground animate-pulse">
          Cargando historial…
        </p>
      )}
      {cardexError && <p className="text-sm text-red-500">{cardexError}</p>}

      {/* Product header */}
      {cardex && !loadingCardex && (
        <>
          <div className="bg-card border border-muted rounded-xl px-5 py-4 mb-5 flex items-start gap-4">
            {cardex!.product.images?.[0]?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cardex!.product.images?.[0]?.url!}
                alt={cardex!.product.title}
                className="w-16 h-16 object-contain rounded-lg border border-muted flex-shrink-0"
              />
            )}
            <div>
              <h2 className="font-bold text-base">{cardex!.product.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cardex!.product.brand && `${cardex!.product.brand} · `}
                {cardex!.product.ASIN && `ASIN: ${cardex!.product.ASIN}`}
              </p>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: "Stock actual",
                value: currentStock,
                color:
                  currentStock <= 0
                    ? "text-red-500"
                    : currentStock <= 3
                      ? "text-amber-500"
                      : "text-green-600",
              },
              {
                label: "Movimientos",
                value: filteredMovements.length,
                color: "text-foreground",
              },
              {
                label: "Uds. vendidas",
                value: totalSold,
                color: "text-primary",
              },
              {
                label: "Ingresos totales",
                value: fmt(totalRevenue),
                color: "text-green-600",
              },
            ].map((c) => (
              <div
                key={c.label}
                className="bg-card border border-muted rounded-xl px-4 py-4"
              >
                <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Stock per store */}
          {cardex!.storeStockMap &&
            Object.keys(
              cardex!.storeStockMap as Record<string, Record<string, number>>,
            ).length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Stock por sucursal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(
                    cardex!.storeStockMap as Record<
                      string,
                      Record<string, number>
                    >,
                  ).map(([storeName, variationStocks]) => (
                    <div
                      key={storeName}
                      className="bg-card border border-muted rounded-lg p-4"
                    >
                      <h4 className="font-semibold text-sm mb-3">
                        {storeName}
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(variationStocks).map(([varId, qty]) => {
                          const v = cardex!.product.variations.find(
                            (vv) => vv._id === varId,
                          );
                          return (
                            <div
                              key={varId}
                              className="flex justify-between items-center text-xs"
                            >
                              <span className="text-muted-foreground">
                                {v?.title || varId}
                              </span>
                              <span
                                className={`font-semibold ${qty <= 0 ? "text-red-500" : qty <= 3 ? "text-amber-500" : "text-green-600"}`}
                              >
                                {qty}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Movement history */}
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Historial de movimientos
          </h3>

          {/* Movement type filter */}
          {filteredMovements.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide mr-2 flex items-center">
                Filtrar por tipo:
              </label>
              {[
                { value: "all", label: "Todos" },
                { value: "sale", label: "Ventas" },
                { value: "transfer_in", label: "Entradas" },
                { value: "transfer_out", label: "Salidas" },
                { value: "adjustment", label: "Ajustes" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMovementType(opt.value as any)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    movementType === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-muted text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Movement search */}
          {filteredMovements.length > 0 && (
            <div className="mb-4 flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-card border border-muted rounded-lg px-3 py-2">
                <MdSearch
                  size={16}
                  className="text-muted-foreground flex-shrink-0"
                />
                <input
                  type="text"
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                  placeholder="Buscar en movimientos (ref., cliente, detalle, variación)…"
                  className="flex-1 bg-transparent outline-none text-sm"
                />
                {movementSearch && (
                  <button
                    onClick={() => setMovementSearch("")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <MdClose size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Movement counter */}
          {filteredMovements.length > 0 && (
            <div className="mb-2 text-xs text-muted-foreground">
              Mostrando {paginatedMovements.length} de{" "}
              {typeFilteredMovements.length} movimiento(s)
            </div>
          )}

          {filteredMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay movimientos registrados para este producto en esta
              sucursal.
            </p>
          ) : typeFilteredMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay movimientos que coincidan con los filtros aplicados.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-muted">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Referencia</th>
                      <th className="px-4 py-3 text-left">Detalle</th>

                      <th className="px-4 py-3 text-left">Autorizado por</th>
                      <th className="px-4 py-3 text-left">Sucursales</th>

                      <th className="px-4 py-3 text-right">Impacto</th>
                      <th className="px-4 py-3 text-right">Precio unit.</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMovements.map((m, idx) => {
                      const ref =
                        m.reference || (m.orderId ? `#${m.orderId}` : "—");
                      const detail =
                        m.type === "sale"
                          ? `${m.customerName || "—"} · ${payLabel(m.payMethod)} · ${m.orderStatus || "—"}`
                          : m.details || "—";
                      const v = cardex!.product.variations.find(
                        (vv) => vv._id === m.variationId,
                      );
                      const impact = Number(m.stockImpact ?? 0);
                      return (
                        <tr key={idx} className="border-t border-muted">
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                m.type === "sale"
                                  ? "bg-blue-100 text-blue-700"
                                  : m.type === "transfer_in"
                                    ? "bg-green-100 text-green-700"
                                    : m.type === "transfer_out"
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-purple-100 text-purple-700"
                              }`}
                            >
                              {movementTypeLabel(m.type)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {fmtDate(m.date)}
                          </td>
                          <td className="px-4 py-3 font-bold">{ref}</td>
                          <td className="px-4 py-3 text-xs">{detail}</td>

                          <td className="px-4 py-3 text-xs font-medium">
                            {m.authorizedBy || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {m.branches && m.branches.length > 0
                              ? m.branches.join(", ")
                              : "—"}
                          </td>

                          <td
                            className={`px-4 py-3 text-right font-bold ${
                              impact > 0
                                ? "text-green-600"
                                : impact < 0
                                  ? "text-red-500"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {impact > 0 ? `+${impact}` : impact}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {fmt(m.unitPrice)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-bold ${
                              m.total > 0
                                ? "text-green-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {fmt(m.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-muted/30 font-bold text-sm">
                    <tr className="border-t-2 border-muted">
                      <td
                        colSpan={6}
                        className="px-4 py-3 text-right text-xs text-muted-foreground"
                      >
                        TOTALES
                      </td>
                      <td className="px-4 py-3 text-right">{totalSold}</td>
                      <td className="px-4 py-3 text-right">{netStockImpact}</td>
                      <td className="px-4 py-3 text-right text-green-600">
                        {fmt(totalRevenue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <button
                    onClick={() =>
                      setMovementPage(Math.max(1, movementPage - 1))
                    }
                    disabled={movementPage === 1}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg border border-muted hover:border-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <MdNavigateBefore size={16} /> Anterior
                  </button>
                  <span className="font-medium">
                    Página {movementPage} de {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setMovementPage(Math.min(totalPages, movementPage + 1))
                    }
                    disabled={movementPage === totalPages}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg border border-muted hover:border-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente <MdNavigateNext size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Empty state */}
      {!selectedProduct && !loadingCardex && (
        <div className="flex flex-col items-center justify-center gap-3 mt-12 text-muted-foreground">
          <MdInventory2 size={48} />
          <p className="text-sm">Busca un producto para ver su cardex global</p>
        </div>
      )}
    </div>
  );
}
