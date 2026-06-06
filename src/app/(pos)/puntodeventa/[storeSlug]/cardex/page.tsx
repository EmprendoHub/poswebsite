"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import POSSidebar from "../_components/POSSidebar";
import { MdPrint, MdSearch, MdClose, MdInventory2 } from "react-icons/md";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface ProductResult {
  _id: string;
  title: string;
  ASIN?: string;
  brand?: string;
  variations: { _id: string; title: string; color?: string; size?: string }[];
  images?: { url: string }[];
}
interface InventoryRecord {
  variationId: string;
  quantity: number;
}
interface Movement {
  type: "sale";
  date: string;
  orderId: number;
  customerName: string;
  phone: string;
  orderStatus: string;
  payMethod: string;
  variationId: string;
  variationName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
interface CardexData {
  product: ProductResult;
  inventoryRecords: InventoryRecord[];
  movements: Movement[];
  storeName: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────── */
function fmt(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

/* ─── Print ticket component ─────────────────────────────────────────── */
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
  const line = "─".repeat(60);

  const filteredMovements = variationId
    ? movements.filter((m) => m.variationId === variationId)
    : movements;

  const selectedVariation = variationId
    ? product.variations.find((v) => v._id === variationId)
    : null;

  const currentStock = variationId
    ? (inventoryRecords.find((r) => r.variationId === variationId)?.quantity ??
      0)
    : inventoryRecords.reduce((s, r) => s + r.quantity, 0);

  const totalSold = filteredMovements.reduce((s, m) => s + m.quantity, 0);

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
          fontSize: "14px",
          marginBottom: "4px",
        }}
      >
        SUPER COLLECTIBLES
      </div>
      <div
        style={{ textAlign: "center", fontSize: "11px", marginBottom: "2px" }}
      >
        {storeName}
      </div>
      <div
        style={{ textAlign: "center", fontSize: "10px", marginBottom: "6px" }}
      >
        Reporte de Cardex — {new Date().toLocaleDateString("es-MX")}
      </div>
      <div>{line}</div>

      <div style={{ marginTop: "4px", marginBottom: "4px" }}>
        <strong>Producto:</strong> {product.title}
      </div>
      {product.ASIN && (
        <div>
          <strong>ASIN:</strong> {product.ASIN}
        </div>
      )}
      {product.brand && (
        <div>
          <strong>Marca:</strong> {product.brand}
        </div>
      )}
      {selectedVariation && (
        <div>
          <strong>Variación:</strong> {selectedVariation.title}
        </div>
      )}
      <div style={{ marginTop: "2px" }}>
        <strong>Stock actual:</strong> {currentStock} unidades
      </div>
      <div>
        <strong>Total vendido (historial):</strong> {totalSold} unidades
      </div>

      <div style={{ marginTop: "6px", marginBottom: "2px" }}>{line}</div>
      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
        HISTORIAL DE MOVIMIENTOS
      </div>

      {/* Table header */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          fontWeight: "bold",
          fontSize: "9px",
          borderBottom: "1px solid #000",
          paddingBottom: "2px",
          marginBottom: "2px",
        }}
      >
        <span style={{ width: "120px" }}>Fecha</span>
        <span style={{ width: "50px" }}>Folio</span>
        <span style={{ width: "110px" }}>Cliente</span>
        <span style={{ width: "60px" }}>Pago</span>
        <span style={{ width: "30px", textAlign: "right" }}>Cant.</span>
        <span style={{ width: "70px", textAlign: "right" }}>Total</span>
        <span style={{ flex: 1 }}>Estado</span>
      </div>

      {filteredMovements.length === 0 && (
        <div style={{ textAlign: "center", padding: "8px", color: "#555" }}>
          Sin movimientos registrados.
        </div>
      )}

      {filteredMovements.map((m, idx) => {
        const payRef = m.payMethod ?? "";
        let payLabel = "—";
        if (payRef === "EFECTIVO") payLabel = "EFECT.";
        else if (payRef.startsWith("MIXTO")) payLabel = "MIXTO";
        else if (payRef) payLabel = "TERM.";

        return (
          <div
            key={idx}
            style={{
              display: "flex",
              gap: "4px",
              fontSize: "9px",
              paddingBottom: "2px",
              borderBottom: "1px dotted #ccc",
            }}
          >
            <span style={{ width: "120px" }}>{fmtDate(m.date)}</span>
            <span style={{ width: "50px" }}>#{m.orderId}</span>
            <span
              style={{
                width: "110px",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {m.customerName}
            </span>
            <span style={{ width: "60px" }}>{payLabel}</span>
            <span style={{ width: "30px", textAlign: "right" }}>
              {m.quantity}
            </span>
            <span style={{ width: "70px", textAlign: "right" }}>
              {fmt(m.total)}
            </span>
            <span style={{ flex: 1 }}>{m.orderStatus}</span>
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
        <span>{fmt(filteredMovements.reduce((s, m) => s + m.total, 0))}</span>
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: "9px",
          marginTop: "8px",
          color: "#555",
        }}
      >
        Documento generado el {new Date().toLocaleString("es-MX")}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────── */
export default function CardexPage() {
  const params = useParams();
  const storeSlug = params?.storeSlug as string;
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");

  // Search
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Selected product
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(
    null,
  );
  const [selectedVariationId, setSelectedVariationId] = useState("");

  // Cardex data
  const [cardex, setCardex] = useState<CardexData | null>(null);
  const [loadingCardex, setLoadingCardex] = useState(false);
  const [cardexError, setCardexError] = useState("");

  // Print preview
  const [showPrint, setShowPrint] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Redirect non-authorized roles ── */
  useEffect(() => {
    if (session && !["manager", "super_admin"].includes(role)) {
      window.location.href = `/puntodeventa/${storeSlug}`;
    }
  }, [session, role, storeSlug]);

  /* ── Load store ── */
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

  /* ── Debounced product search ── */
  useEffect(() => {
    if (!storeId || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/pos/cardex?storeId=${storeId}&q=${encodeURIComponent(query.trim())}`,
        );
        const data = await res.json();
        setSearchResults(data.products ?? []);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [query, storeId]);

  /* ── Load cardex detail ── */
  const loadCardex = useCallback(
    async (productId: string, variationId = "") => {
      if (!storeId) return;
      setLoadingCardex(true);
      setCardexError("");
      setCardex(null);
      try {
        const params = new URLSearchParams({ storeId, productId });
        if (variationId) params.set("variationId", variationId);
        const res = await fetch(`/api/pos/cardex?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al cargar cardex");
        setCardex(data);
      } catch (e: any) {
        setCardexError(e.message);
      } finally {
        setLoadingCardex(false);
      }
    },
    [storeId],
  );

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

  const currentStock = cardex
    ? selectedVariationId
      ? (cardex.inventoryRecords.find(
          (r) => r.variationId === selectedVariationId,
        )?.quantity ?? 0)
      : cardex.inventoryRecords.reduce((s, r) => s + r.quantity, 0)
    : 0;

  const totalSold = filteredMovements.reduce((s, m) => s + m.quantity, 0);
  const totalRevenue = filteredMovements.reduce((s, m) => s + m.total, 0);

  return (
    <div className="flex h-screen bg-background">
      <POSSidebar storeSlug={storeSlug} storeName={storeName} />

      {/* Print overlay */}
      {showPrint && cardex && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center print:bg-transparent print:inset-auto print:z-auto print:relative">
          <div className="bg-white rounded-xl shadow-xl p-4 flex flex-col items-center gap-4 max-w-4xl w-full mx-4 print:shadow-none print:p-0 print:rounded-none">
            <div className="no-print flex gap-3 items-center self-start">
              <span className="font-semibold text-black">
                Vista previa de impresión
              </span>
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
                storeName={storeName}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 no-print">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MdInventory2 size={22} /> Cardex de Producto
            </h1>
            <p className="text-xs text-muted-foreground">{storeName}</p>
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

        {/* Search */}
        <div className="relative mb-6" ref={searchRef}>
          <div className="flex items-center gap-2 bg-card border border-muted rounded-xl px-4 py-3">
            <MdSearch
              size={18}
              className="text-muted-foreground flex-shrink-0"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value) clearSearch();
              }}
              placeholder="Buscar producto por nombre, ASIN o marca…"
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

          {/* Dropdown results */}
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

        {/* Variation filter */}
        {selectedProduct && selectedProduct.variations.length > 1 && (
          <div className="mb-6">
            <label className="text-xs text-muted-foreground mb-2 block font-medium uppercase tracking-wide">
              Filtrar por variación
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleVariationChange("")}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selectedVariationId === ""
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-muted text-muted-foreground hover:border-foreground"
                }`}
              >
                Todas
              </button>
              {selectedProduct.variations.map((v) => (
                <button
                  key={v._id}
                  onClick={() => handleVariationChange(v._id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedVariationId === v._id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-muted text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {v.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loadingCardex && (
          <p className="text-sm text-muted-foreground animate-pulse">
            Cargando historial…
          </p>
        )}

        {cardexError && <p className="text-sm text-red-500">{cardexError}</p>}

        {/* Product header + KPIs */}
        {cardex && !loadingCardex && (
          <>
            <div className="bg-card border border-muted rounded-xl px-5 py-4 mb-5 flex items-start gap-4">
              {cardex.product.images?.[0]?.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cardex.product.images[0].url}
                  alt={cardex.product.title}
                  className="w-16 h-16 object-contain rounded-lg border border-muted flex-shrink-0"
                />
              )}
              <div>
                <h2 className="font-bold text-base">{cardex.product.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cardex.product.brand && `${cardex.product.brand} · `}
                  {cardex.product.ASIN && `ASIN: ${cardex.product.ASIN}`}
                </p>
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-card border border-muted rounded-xl px-4 py-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Stock actual
                </p>
                <p
                  className={`text-2xl font-bold ${currentStock <= 0 ? "text-red-500" : currentStock <= 3 ? "text-amber-500" : "text-green-600"}`}
                >
                  {currentStock}
                </p>
              </div>
              <div className="bg-card border border-muted rounded-xl px-4 py-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Movimientos
                </p>
                <p className="text-2xl font-bold">{filteredMovements.length}</p>
              </div>
              <div className="bg-card border border-muted rounded-xl px-4 py-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Uds. vendidas
                </p>
                <p className="text-2xl font-bold text-primary">{totalSold}</p>
              </div>
              <div className="bg-card border border-muted rounded-xl px-4 py-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Ingresos totales
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {fmt(totalRevenue)}
                </p>
              </div>
            </div>

            {/* Stock per variation table */}
            {cardex.inventoryRecords.length > 1 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Stock por variación
                </h3>
                <div className="overflow-x-auto rounded-xl border border-muted">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs text-muted-foreground uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Variación</th>
                        <th className="px-4 py-3 text-right">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cardex.inventoryRecords.map((r) => {
                        const v = cardex.product.variations.find(
                          (vv) => vv._id === r.variationId,
                        );
                        return (
                          <tr
                            key={r.variationId}
                            className="border-t border-muted"
                          >
                            <td className="px-4 py-3 text-sm">
                              {v?.title ?? r.variationId}
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-bold ${r.quantity <= 0 ? "text-red-500" : r.quantity <= 3 ? "text-amber-500" : "text-green-600"}`}
                            >
                              {r.quantity}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Movement history */}
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Historial de movimientos
            </h3>

            {filteredMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay movimientos registrados para este producto en esta
                sucursal.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-muted">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Folio</th>
                      <th className="px-4 py-3 text-left">Cliente</th>
                      <th className="px-4 py-3 text-left">Variación</th>
                      <th className="px-4 py-3 text-left">Forma de pago</th>
                      <th className="px-4 py-3 text-right">Cant.</th>
                      <th className="px-4 py-3 text-right">Precio unit.</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovements.map((m, idx) => {
                      const payRef = m.payMethod ?? "";
                      let payLabel = "—";
                      if (payRef === "EFECTIVO") payLabel = "Efectivo";
                      else if (payRef.startsWith("MIXTO")) payLabel = "Mixto";
                      else if (payRef) payLabel = "Terminal";

                      const v = cardex.product.variations.find(
                        (vv) => vv._id === m.variationId,
                      );

                      return (
                        <tr key={idx} className="border-t border-muted">
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              Venta
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {fmtDate(m.date)}
                          </td>
                          <td className="px-4 py-3 font-bold">#{m.orderId}</td>
                          <td className="px-4 py-3">
                            <p className="text-xs">{m.customerName}</p>
                            {m.phone && (
                              <p className="text-xs text-muted-foreground">
                                {m.phone}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {v?.title ?? m.variationName ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-xs">{payLabel}</td>
                          <td className="px-4 py-3 text-right font-bold">
                            {m.quantity}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {fmt(m.unitPrice)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">
                            {fmt(m.total)}
                          </td>
                          <td
                            className={`px-4 py-3 text-xs font-semibold ${
                              m.orderStatus === "Entregado"
                                ? "text-green-600"
                                : m.orderStatus === "Apartado"
                                  ? "text-amber-500"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {m.orderStatus}
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
                      <td></td>
                      <td className="px-4 py-3 text-right text-green-600">
                        {fmt(totalRevenue)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!selectedProduct && !loadingCardex && (
          <div className="flex flex-col items-center justify-center gap-3 mt-16 text-muted-foreground">
            <MdInventory2 size={48} />
            <p className="text-sm">Busca un producto para ver su cardex</p>
          </div>
        )}
      </div>
    </div>
  );
}
