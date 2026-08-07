"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import POSSidebar from "../_components/POSSidebar";
import {
  MdPrint,
  MdSearch,
  MdClose,
  MdInventory2,
  MdLock,
  MdShield,
  MdNavigateBefore,
  MdNavigateNext,
  MdDownload,
} from "react-icons/md";

/* ─── Manager code modal ─────────────────────────────────────────── */
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
            para acceder al cardex de productos.
          </p>
          <input
            type="text"
            value={"•".repeat(code.length).padEnd(6, "•")}
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

/* ─── Types ─────────────────────────────────────────────────────────── */
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

/* ─── Main page ──────────────────────────────────────────────────── */
export default function POSCardexPage() {
  const params = useParams();
  const storeSlug = params?.storeSlug as string;
  const [storeName, setStoreName] = useState("");

  const [pageUnlocked, setPageUnlocked] = useState(false);

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

  // Pagination & filters for movements
  const [movementPage, setMovementPage] = useState(1);
  const [movementType, setMovementType] = useState<Movement["type"] | "all">(
    "all",
  );
  const [movementSearch, setMovementSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const movementsPerPage = 10;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Load store name ── */
  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((stores: any[]) => {
        const found = stores.find((s) => s.slug === storeSlug);
        if (found) {
          setStoreName(found.name);
        }
      });
  }, [storeSlug]);

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

  // Apply type and search filters
  const typeFilteredMovements = filteredMovements.filter((m) => {
    if (movementType !== "all" && m.type !== movementType) return false;
    if (movementSearch.trim()) {
      const searchLower = movementSearch.toLowerCase();
      if (
        !(m.reference && m.reference.toLowerCase().includes(searchLower)) &&
        !(
          m.customerName && m.customerName.toLowerCase().includes(searchLower)
        ) &&
        !(m.details && m.details.toLowerCase().includes(searchLower)) &&
        !(
          m.variationName && m.variationName.toLowerCase().includes(searchLower)
        )
      ) {
        return false;
      }
    }
    if (startDate || endDate) {
      const movementDate = new Date(m.date);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (movementDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (movementDate > end) return false;
      }
    }
    return true;
  });

  // Calculate pagination
  const totalPages = Math.ceil(typeFilteredMovements.length / movementsPerPage);
  const startIdx = (movementPage - 1) * movementsPerPage;
  const paginatedMovements = typeFilteredMovements.slice(
    startIdx,
    startIdx + movementsPerPage,
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setMovementPage(1);
  }, [selectedVariationId, movementType, movementSearch, startDate, endDate]);

  // Generate PDF report
  const generatePDFReport = () => {
    if (!cardex || !selectedProduct) return;

    const htmlContent = `
      <html>
      <head>
        <title>Cardex - ${selectedProduct.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 10mm; font-size: 12px; }
          h1 { font-size: 18px; text-align: center; margin: 0 0 5px 0; }
          h2 { font-size: 14px; border-bottom: 2px solid #333; padding-bottom: 5px; margin-top: 15px; margin-bottom: 10px; }
          .header-info { text-align: center; font-size: 10px; color: #666; margin-bottom: 10px; }
          .kpi-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
          .kpi-card { border: 1px solid #ddd; padding: 8px; border-radius: 4px; }
          .kpi-label { font-size: 10px; color: #666; }
          .kpi-value { font-size: 16px; font-weight: bold; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f5f5f5; border: 1px solid #ddd; padding: 6px; text-align: left; font-size: 10px; font-weight: bold; }
          td { border: 1px solid #ddd; padding: 6px; font-size: 9px; }
          tr:nth-child(even) { background: #fafafa; }
          .date-range { font-size: 10px; color: #666; margin-bottom: 10px; }
          .footer { text-align: center; font-size: 9px; color: #999; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>Super Collectibles - Cardex</h1>
        <div class="header-info">${storeName}</div>
        <div class="header-info" style="margin-bottom: 15px;"><strong>${selectedProduct.title}</strong></div>
        ${selectedProduct.brand ? `<div class="header-info">Cert: ${selectedProduct.brand}</div>` : ""}
        ${selectedProduct.ASIN ? `<div class="header-info">ASIN: ${selectedProduct.ASIN}</div>` : ""}
        <div class="date-range"><strong>Período:</strong> ${startDate ? new Date(startDate).toLocaleDateString("es-MX") : "Inicio"} al ${endDate ? new Date(endDate).toLocaleDateString("es-MX") : "Fin"}</div>

        <div class="kpi-container">
          <div class="kpi-card">
            <div class="kpi-label">Stock actual</div>
            <div class="kpi-value">${currentStock}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Movimientos</div>
            <div class="kpi-value">${typeFilteredMovements.length}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Uds. vendidas</div>
            <div class="kpi-value">${typeFilteredMovements.filter((m) => m.type === "sale").reduce((s, m) => s + m.quantity, 0)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Ingresos</div>
            <div class="kpi-value">${fmt(typeFilteredMovements.filter((m) => m.type === "sale").reduce((s, m) => s + m.total, 0))}</div>
          </div>
        </div>

        <h2>Historial de movimientos (${typeFilteredMovements.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Fecha</th>
              <th>Referencia</th>
              <th>Detalle</th>
              <th style="text-align: right;">Impacto</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${typeFilteredMovements
              .map((m) => {
                const ref = m.reference || (m.orderId ? `#${m.orderId}` : "—");
                const detail =
                  m.type === "sale"
                    ? `${m.customerName || "—"} · ${payLabel(m.payMethod)} · ${m.orderStatus || "—"}`
                    : m.details || "—";
                const v = selectedProduct.variations.find(
                  (vv) => vv._id === m.variationId,
                );
                const impact = Number(m.stockImpact ?? 0);
                return `
                  <tr>
                    <td>${movementTypeLabel(m.type)}</td>
                    <td>${fmtDate(m.date)}</td>
                    <td>${ref}</td>
                    <td>${detail}</td>
                    <td style="text-align: right;">${impact > 0 ? `+${impact}` : impact}</td>
                    <td style="text-align: right;">${fmt(m.total)}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>

        <div class="footer">
          Reporte generado el ${new Date().toLocaleString("es-MX")}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

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

  if (!pageUnlocked) {
    return (
      <div className="flex h-screen bg-background">
        <POSSidebar storeSlug={storeSlug} storeName={storeName} />
        <ManagerCodeModal
          onAuthorized={() => setPageUnlocked(true)}
          onCancel={() => {
            window.history.back();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <POSSidebar storeSlug={storeSlug} storeName={storeName} />
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MdInventory2 size={22} /> Cardex de Producto
            </h1>
            <p className="text-xs text-muted-foreground">
              Historial de movimientos en {storeName}
            </p>
          </div>
        </div>

        {/* Product search */}
        <div className="relative mb-6">
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
              {cardex.product.images?.[0]?.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cardex.product.images?.[0]?.url!}
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                  color: "text-blue-600",
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
                  <p className="text-xs text-muted-foreground mb-1">
                    {c.label}
                  </p>
                  <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Stock per store */}
            {cardex.storeStockMap &&
              Object.keys(
                cardex.storeStockMap as Record<string, Record<string, number>>,
              ).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Stock por sucursal
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-3 gap-4">
                    {Object.entries(
                      cardex.storeStockMap as Record<
                        string,
                        Record<string, number>
                      >,
                    ).map(([storeNameKey, variationStocks]) => (
                      <div
                        key={storeNameKey}
                        className="bg-card border border-muted rounded-lg p-4"
                      >
                        <div className="space-y-2">
                          {Object.entries(variationStocks).map(
                            ([varId, qty]) => {
                              const v = cardex.product.variations.find(
                                (vv) => vv._id === varId,
                              );
                              return (
                                <div
                                  key={varId}
                                  className="flex justify-between items-center text-xs"
                                >
                                  <h4 className="font-semibold text-sm mb-3">
                                    {storeNameKey}
                                  </h4>
                                  <span
                                    className={`font-semibold ${
                                      qty <= 0
                                        ? "text-red-500"
                                        : qty <= 3
                                          ? "text-amber-500"
                                          : "text-green-600"
                                    }`}
                                  >
                                    {qty}
                                  </span>
                                </div>
                              );
                            },
                          )}
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

            {/* Filters */}
            <div className="mb-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Type filter */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setMovementType("all")}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      movementType === "all"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-muted text-muted-foreground hover:border-foreground"
                    }`}
                  >
                    Todos
                  </button>
                  {["sale", "transfer_in", "transfer_out", "adjustment"].map(
                    (type) => (
                      <button
                        key={type}
                        onClick={() =>
                          setMovementType(type as Movement["type"])
                        }
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          movementType === type
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-muted text-muted-foreground hover:border-foreground"
                        }`}
                      >
                        {movementTypeLabel(type as Movement["type"])}
                      </button>
                    ),
                  )}
                </div>

                {/* Search in movements */}
                <div className="flex-1 flex items-center gap-2 bg-card border border-muted rounded-lg px-3 py-2">
                  <MdSearch
                    size={16}
                    className="text-muted-foreground flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={movementSearch}
                    onChange={(e) => setMovementSearch(e.target.value)}
                    placeholder="Buscar por referencia, cliente…"
                    className="flex-1 bg-transparent outline-none text-xs"
                  />
                  {movementSearch && (
                    <button
                      onClick={() => setMovementSearch("")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <MdClose size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Date range filter and PDF export */}
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex gap-2 flex-1 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1 font-medium">
                      Desde:
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-card border border-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1 font-medium">
                      Hasta:
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-card border border-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {(startDate || endDate) && (
                    <button
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                      }}
                      className="px-3 py-0 h-8 text-xs bg-muted text-slate-900 hover:bg-muted/80 rounded-lg transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <button
                  onClick={generatePDFReport}
                  disabled={!typeFilteredMovements.length}
                  className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  <MdDownload size={16} /> Exportar PDF
                </button>
              </div>
            </div>

            {/* Movement count */}
            <div className="mb-4 text-xs text-muted-foreground">
              Mostrando {paginatedMovements.length > 0 ? startIdx + 1 : 0} -{" "}
              {Math.min(
                startIdx + movementsPerPage,
                typeFilteredMovements.length,
              )}{" "}
              de {typeFilteredMovements.length} movimientos
            </div>

            {typeFilteredMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay movimientos registrados para este producto.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-muted mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs text-muted-foreground uppercase">
                      <tr>
                        <th className="px-2 py-2 text-left">Tipo</th>
                        <th className="px-2 py-2 text-left">Fecha</th>
                        <th className="px-2 py-2 text-left">Ref.</th>
                        <th className="px-2 py-2 text-left">Detalle</th>

                        <th className="px-4 py-3 text-left">Autorizado por</th>
                        <th className="px-4 py-3 text-left">Sucursales</th>

                        <th className="px-2 py-2 text-left">Impacto</th>
                        <th className="px-2 py-2 text-right">Precio unit.</th>
                        <th className="px-2 py-2 text-right">Total</th>
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
                        const v = cardex.product.variations.find(
                          (vv) => vv._id === m.variationId,
                        );
                        const impact = Number(m.stockImpact ?? 0);
                        return (
                          <tr key={idx} className="border-t border-muted">
                            <td className="pl-2 py-2">
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
                            <td className="px-2 py-2 text-xs">
                              {fmtDate(m.date)}
                            </td>
                            <td className="px-2 py-2 font-bold">{ref}</td>
                            <td className="px-2 py-2 text-xs">{detail}</td>
                            <td className="px-4 py-3 text-xs font-medium">
                              {m.authorizedBy || "—"}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {m.branches && m.branches.length > 0
                                ? m.branches.join(", ")
                                : "—"}
                            </td>

                            <td
                              className={`px-2 py-2 text-right font-bold ${
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
                  </table>
                </div>

                {/* Pagination controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between bg-card border border-muted rounded-lg px-4 py-3">
                    <div className="text-xs text-muted-foreground">
                      Página {movementPage} de {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setMovementPage(Math.max(1, movementPage - 1))
                        }
                        disabled={movementPage === 1}
                        className="flex items-center gap-1 px-3 py-1.5 bg-muted rounded-lg hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition-colors"
                      >
                        <MdNavigateBefore size={14} />
                        Anterior
                      </button>
                      <button
                        onClick={() =>
                          setMovementPage(
                            Math.min(totalPages, movementPage + 1),
                          )
                        }
                        disabled={movementPage === totalPages}
                        className="flex items-center gap-1 px-3 py-1.5 bg-muted rounded-lg hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition-colors"
                      >
                        Siguiente
                        <MdNavigateNext size={14} />
                      </button>
                    </div>
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
            <p className="text-sm">Busca un producto para ver su cardex</p>
          </div>
        )}
      </div>
    </div>
  );
}
