"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  MdAdd,
  MdBarChart,
  MdCheckCircle,
  MdClose,
  MdDelete,
  MdDownload,
  MdEdit,
  MdFilterList,
  MdInventory,
  MdQrCodeScanner,
  MdRefresh,
  MdStorefront,
  MdWarning,
  MdCheckBox,
  MdCheckBoxOutlineBlank,
} from "react-icons/md";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Store {
  _id: string;
  name: string;
  slug: string;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  subcategories?: Category[];
}

interface ScannedItem {
  variationId: string;
  productId: string;
  productTitle: string;
  variationTitle?: string;
  sku?: string;
  image?: string;
  price?: number;
  physicalCount: number;
  systemCount: number;
  difference: number;
  note?: string;
  isDiscrepancy?: boolean;
}

interface SelectedProduct {
  productId: string;
  productTitle: string;
  variationId: string;
  variationTitle?: string;
  sku?: string;
  image?: string;
  price?: number;
  systemCount: number;
}

interface CheckSession {
  _id: string;
  storeName: string;
  status: "in_progress" | "finalized";
  selectedProducts: SelectedProduct[];
  scannedItems: ScannedItem[];
  filters?: any;
  startedByName: string;
  startedAt: string;
  finalizedAt?: string;
  totalSelected: number;
  totalScanned: number;
  totalMatched: number;
  totalDiscrepancies: number;
}

interface LookupResult {
  productId: string;
  productTitle: string;
  variationId: string;
  variationTitle: string;
  sku: string;
  image: string;
  systemCount: number;
  price: number;
}

type View = "store-select" | "filter-select" | "scanning" | "report" | "past-reports" | "discrepancies";

// ─── Main Component ────────────────────────────────────────────────────────────
export default function InventarioPage() {
  const [view, setView] = useState<View>("store-select");
  const [stores, setStores] = useState<Store[]>([]);
  const [pastSessions, setPastSessions] = useState<CheckSession[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [activeSession, setActiveSession] = useState<CheckSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Filter state
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [allAttributes, setAllAttributes] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<SelectedProduct[]>([]);
  const [selectedFilters, setSelectedFilters] = useState({
    mainCategory: "",
    subCategory: "",
    brand: "",
    attributes: [] as string[],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLoading, setFilterLoading] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scanning state
  const [scanQuery, setScanQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<LookupResult[]>([]);
  const [selectedLookupProduct, setSelectedLookupProduct] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | "">(1);

  // Notes modal
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesEditingVariationId, setNotesEditingVariationId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  // Get the current edited item from activeSession
  const notesEditingItem = notesEditingVariationId
    ? activeSession?.scannedItems.find((i) => i.variationId === notesEditingVariationId) || null
    : null;

  // Finalize confirmation modal
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load stores on mount
  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/inventory-check");
    const data = await res.json();
    setStores(data.stores || []);
    setPastSessions(data.sessions || []);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const res = await fetch("/api/admin/inventory-check/categories");
    const data = await res.json();
    setCategories(data.mainCategories || []);
    setBrands(data.brands || []);
    setAllAttributes(data.attributes || []);
  };

  const fetchFilteredProducts = useCallback(
    async (
      mainCat?: string,
      subCat?: string,
      attrs?: string[],
      search?: string,
      brand?: string
    ) => {
      setFilterLoading(true);
      const params = new URLSearchParams({
        storeId: selectedStore?._id || "",
      });
      if (mainCat) params.append("mainCategory", mainCat);
      if (subCat) params.append("subCategory", subCat);
      if (attrs?.length) params.append("attributes", attrs.join(","));
      if (search) params.append("search", search);
      if (brand) params.append("brand", brand);

      const res = await fetch(
        `/api/admin/inventory-check/products-filter?${params}`
      );
      const data = await res.json();
      setFilteredProducts(data.products || []);
      setFilterLoading(false);
    },
    [selectedStore]
  );

  // Start new session with filters
  const handleStartWithFilters = async (store: Store) => {
    if (!categories.length) await fetchCategories();
    setSelectedStore(store);
    setActiveSession({
      _id: "temp",
      storeName: store.name,
      status: "in_progress",
      selectedProducts: [],
      scannedItems: [],
      startedByName: "",
      startedAt: new Date().toISOString(),
      totalSelected: 0,
      totalScanned: 0,
      totalMatched: 0,
      totalDiscrepancies: 0,
    });
    setView("filter-select");
  };

  // Create session with selected products
  const handleCreateSession = async () => {
    if (!selectedStore || !activeSession) return;
    setSaving(true);

    const res = await fetch("/api/admin/inventory-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: selectedStore._id,
        selectedProducts: activeSession.selectedProducts,
        filters: selectedFilters,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (res.ok) {
      // Preserve selectedProducts from frontend state
      const sessionWithProducts = {
        ...data.session,
        selectedProducts: activeSession.selectedProducts,
      };
      setActiveSession(sessionWithProducts);
      setView("scanning");
      setTimeout(() => scanInputRef.current?.focus(), 200);
    }
  };

  // Resume existing session
  const handleResume = async (session: CheckSession, store: Store) => {
    setLoading(true);
    const res = await fetch(`/api/admin/inventory-check/${session._id}`);
    const data = await res.json();
    setLoading(false);
    setSelectedStore(store);
    setActiveSession(data.session);
    setView("scanning");
    setTimeout(() => scanInputRef.current?.focus(), 200);
  };

  // View finalized report
  const handleViewReport = async (session: CheckSession, store: Store) => {
    setLoading(true);
    const res = await fetch(`/api/admin/inventory-check/${session._id}`);
    const data = await res.json();
    setLoading(false);
    setSelectedStore(store);
    setActiveSession(data.session);
    setView("report");
  };

  // Lookup by scan/SKU
  const handleLookup = useCallback(
    async (query: string) => {
      if (!query.trim() || !selectedStore) return;
      setLookupLoading(true);
      setLookupError("");
      setLookupResults([]);
      setSelectedLookupProduct(null);
      const res = await fetch(
        `/api/admin/inventory-check/lookup?storeId=${selectedStore._id}&query=${encodeURIComponent(
          query.trim()
        )}`
      );
      const data = await res.json();
      setLookupLoading(false);
      if (!res.ok) {
        setLookupError(data.error || "Producto no encontrado");
      } else {
        // Handle both single result and array of results
        const results = Array.isArray(data) ? data : data.results ? data.results : [data];
        
        // Check for exact match (ASIN or title exact match)
        const queryLower = query.trim().toLowerCase();
        const exactMatch = results.find(
          (product: LookupResult) =>
            (product.sku && product.sku.toLowerCase() === queryLower) ||
            (product.productTitle && product.productTitle.toLowerCase() === queryLower)
        );
        
        if (exactMatch) {
          // If exact match found, show only that one
          setLookupResults([exactMatch]);
          setSelectedLookupProduct(exactMatch);
        } else {
          // Otherwise show all matches
          setLookupResults(results);
          if (results.length > 0) {
            setSelectedLookupProduct(results[0]);
          }
        }
        setPendingCount(1);
      }
    },
    [selectedStore]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (scanQuery.trim().length < 3) {
      setLookupResults([]);
      setSelectedLookupProduct(null);
      setLookupError("");
      return;
    }
    debounceRef.current = setTimeout(() => {
      handleLookup(scanQuery);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [scanQuery, handleLookup]);

  // Debounce search query for product filter
  useEffect(() => {
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    
    filterDebounceRef.current = setTimeout(() => {
      if (selectedStore) {
        // Search or filter even with just search query (no category required)
        if (searchQuery || selectedFilters.mainCategory) {
          fetchFilteredProducts(
            selectedFilters.mainCategory,
            selectedFilters.subCategory,
            selectedFilters.attributes,
            searchQuery,
            selectedFilters.brand
          );
        } else {
          // Clear products if no search and no filter
          setFilteredProducts([]);
        }
      }
    }, 300);

    return () => {
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    };
  }, [searchQuery, selectedFilters, selectedStore, fetchFilteredProducts]);

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      handleLookup(scanQuery);
    }
  };

  // Add / update scanned item
  const handleAddCount = async () => {
    if (!selectedLookupProduct || !activeSession || pendingCount === "") return;
    setSaving(true);
    const res = await fetch(`/api/admin/inventory-check/${activeSession._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...selectedLookupProduct,
        physicalCount: Number(pendingCount),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setActiveSession(data.session);
      setLookupResults([]);
      setSelectedLookupProduct(null);
      setScanQuery("");
      setPendingCount(1);
      setLookupError("");
      scanInputRef.current?.focus();
    }
  };

  // Update note
  const handleUpdateNote = async () => {
    if (!activeSession || !notesEditingVariationId) return;
    setSaving(true);
    const res = await fetch(`/api/admin/inventory-check/${activeSession._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variationId: notesEditingVariationId,
        note: noteText,
        updateNote: true,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setActiveSession(data.session);
      setNotesModalOpen(false);
      setNoteText("");
      setNotesEditingVariationId(null);
    }
  };

  // Toggle discrepancy flag
  const handleToggleDiscrepancy = async (item: ScannedItem) => {
    if (!activeSession) return;
    setSaving(true);
    const res = await fetch(`/api/admin/inventory-check/${activeSession._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variationId: item.variationId,
        isDiscrepancy: !item.isDiscrepancy,
        updateDiscrepancy: true,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setActiveSession(data.session);
    }
  };

  // Remove scanned item
  const handleRemoveItem = async (variationId: string) => {
    if (!activeSession) return;
    const res = await fetch(
      `/api/admin/inventory-check/${activeSession._id}?variationId=${variationId}`,
      { method: "DELETE" }
    );
    const data = await res.json();
    if (res.ok) setActiveSession(data.session);
  };

  // Finalize session
  const handleFinalize = () => {
    if (!activeSession) return;
    setConfirmFinalizeOpen(true);
  };

  // Confirm finalization
  const handleConfirmFinalize = async () => {
    if (!activeSession) return;
    setFinalizing(true);
    setConfirmFinalizeOpen(false);
    const res = await fetch(
      `/api/admin/inventory-check/${activeSession._id}/finalize`,
      { method: "POST" }
    );
    const data = await res.json();
    setFinalizing(false);
    if (res.ok) {
      setActiveSession(data.session);
      setView("report");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!activeSession) return;
    const rows = [
      [
        "Producto",
        "Variación",
        "SKU",
        "Precio",
        "Conteo Físico",
        "Sistema",
        "Diferencia",
        "Nota",
        "Discrepancia",
      ],
      ...activeSession.scannedItems.map((i) => [
        `"${i.productTitle}"`,
        `"${i.variationTitle || ""}"`,
        `"${i.sku || ""}"`,
        i.price || "",
        i.physicalCount,
        i.systemCount,
        i.difference,
        `"${i.note || ""}"`,
        i.isDiscrepancy ? "Sí" : "No",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conteo-${selectedStore?.name}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render Views ──────────────────────────────────────────────────────────────

  // Store select view
  if (view === "store-select") {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <MdInventory size={28} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Conteo de Inventario</h1>
            <p className="text-muted-foreground text-sm">
              Selecciona una sucursal y filtra productos para inventariar
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Cargando sucursales...</p>
        ) : (
          <div className="grid gap-4">
            {stores.map((store) => {
              const storeSessions = pastSessions.filter(
                (s) =>
                  (s as any).store === store._id || s.storeName === store.name
              );
              const inProgress = storeSessions.find(
                (s) => s.status === "in_progress"
              );
              const finalized = storeSessions.filter(
                (s) => s.status === "finalized"
              );

              return (
                <div
                  key={store._id}
                  className="border border-muted rounded-xl p-5 bg-card hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <MdStorefront size={20} className="text-primary" />
                    <h2 className="font-semibold flex-1">{store.name}</h2>
                    {inProgress && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                        En progreso
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleStartWithFilters(store)}
                      disabled={saving}
                      className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                    >
                      <MdFilterList size={16} /> Nuevo conteo con filtros
                    </button>

                    {inProgress && (
                      <button
                        onClick={() => handleResume(inProgress, store)}
                        className="text-sm bg-yellow-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1"
                      >
                        <MdQrCodeScanner size={16} /> Continuar (
                        {inProgress.scannedItems?.length ?? 0})
                      </button>
                    )}

                    {finalized.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectedStore(store);
                          setPastSessions(storeSessions);
                          setView("past-reports");
                        }}
                        className="text-sm border border-muted px-4 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-1"
                      >
                        <MdBarChart size={16} /> Reportes ({finalized.length})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Filter selection view
  if (view === "filter-select") {
    const hasActiveFilters = selectedFilters.mainCategory || selectedFilters.subCategory || searchQuery;
    
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              setView("store-select");
              fetchStores();
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Atrás
          </button>
          <h1 className="font-bold text-lg">{selectedStore?.name} - Filtrar productos</h1>
        </div>

        {/* Search and filters bar */}
        <div className="flex gap-3 mb-6 flex-wrap items-center">
          <div className="flex-1 min-w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeSession) {
                  setActiveSession({
                    ...activeSession,
                    selectedProducts: [],
                  });
                  setSelectAllChecked(false);
                }
              }}
              placeholder="Buscar por nombre, SKU, ASIN..."
              className="w-full bg-background border border-muted rounded-lg px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            onClick={() => {
              if (!categories.length) {
                fetchCategories();
              }
              setShowFilterModal(true);
            }}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              hasActiveFilters
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "border border-muted hover:bg-muted"
            }`}
          >
            <MdFilterList size={16} /> Filtros
            {hasActiveFilters && (
              <span className="bg-primary-foreground/20 px-2 py-0.5 rounded text-xs font-semibold">
                Activos
              </span>
            )}
          </button>

          <button
            onClick={handleCreateSession}
            disabled={
              saving ||
              filterLoading ||
              filteredProducts.length === 0 ||
              (!selectedFilters.mainCategory && !searchQuery)
            }
            className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Crear sesión ({filteredProducts.length})
          </button>
        </div>

        {/* Products grid */}
        <div className="border border-muted rounded-xl bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-muted bg-muted/30">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">
                Productos {filteredProducts.length > 0 && `(${filteredProducts.length})`}
              </h2>
              {filteredProducts.length > 0 && (
                <button
                  onClick={() => {
                    if (activeSession) {
                      const newChecked = !selectAllChecked;
                      setSelectAllChecked(newChecked);
                      if (newChecked) {
                        // Seleccionar todos
                        setActiveSession({
                          ...activeSession,
                          selectedProducts: filteredProducts,
                        });
                      } else {
                        // Deseleccionar todos
                        setActiveSession({
                          ...activeSession,
                          selectedProducts: [],
                        });
                      }
                    }
                  }}
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded hover:bg-muted/50 transition-colors"
                >
                  {(selectAllChecked || activeSession?.selectedProducts?.length === filteredProducts.length) && filteredProducts.length > 0 ? (
                    <MdCheckBox size={16} className="text-primary" />
                  ) : (
                    <MdCheckBoxOutlineBlank size={16} className="text-muted-foreground" />
                  )}
                  <span className="font-medium text-muted-foreground">
                    {selectAllChecked || activeSession?.selectedProducts?.length === filteredProducts.length
                      ? "Deseleccionar todos"
                      : "Seleccionar todos"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {filterLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Buscando productos...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="mb-2">
                {searchQuery || selectedFilters.mainCategory
                  ? "No se encontraron productos con esa búsqueda"
                  : "Comienza a buscar o selecciona filtros"}
              </p>
              {!selectedFilters.mainCategory && !searchQuery && (
                <button
                  onClick={() => {
                    if (!categories.length) {
                      fetchCategories();
                    }
                    setShowFilterModal(true);
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Abre los filtros →
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-muted max-h-[calc(100vh-300px)] overflow-y-auto">
              {filteredProducts.map((product) => (
                <div
                  key={product.variationId}
                  className="px-5 py-3 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => {
                    if (activeSession) {
                      const isSelected = activeSession.selectedProducts.some(
                        (p) => p.variationId === product.variationId
                      );
                      const updated = isSelected
                        ? activeSession.selectedProducts.filter(
                            (p) => p.variationId !== product.variationId
                          )
                        : [...(activeSession.selectedProducts || []), product];
                      setActiveSession({
                        ...activeSession,
                        selectedProducts: updated,
                      });
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {activeSession?.selectedProducts?.some(
                        (p) => p.variationId === product.variationId
                      ) ? (
                        <MdCheckBox size={18} className="text-primary" />
                      ) : (
                        <MdCheckBoxOutlineBlank
                          size={18}
                          className="text-muted-foreground"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {product.productTitle}
                      </p>
                      {product.variationTitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {product.variationTitle}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        {product.sku && <span className="font-mono">{product.sku}</span>}
                        {product.systemCount > -1 && (
                          <span>Stock: {product.systemCount}</span>
                        )}
                        {product.price && (
                          <span>${product.price.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter Modal */}
        {showFilterModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-xl max-w-md w-full max-h-96 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Filtrar productos</h2>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MdClose size={20} />
                </button>
              </div>

              {/* Main category */}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Categoría Principal
                </label>
                <select
                  value={selectedFilters.mainCategory}
                  onChange={(e) => {
                    setSelectedFilters({
                      ...selectedFilters,
                      mainCategory: e.target.value,
                      subCategory: "",
                    });
                    if (activeSession) {
                      setActiveSession({
                        ...activeSession,
                        selectedProducts: [],
                      });
                      setSelectAllChecked(false);
                    }
                  }}
                  className="w-full bg-muted border border-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub category */}
              {selectedFilters.mainCategory && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    Subcategoría
                  </label>
                  <select
                    value={selectedFilters.subCategory}
                    onChange={(e) => {
                      setSelectedFilters({
                        ...selectedFilters,
                        subCategory: e.target.value,
                      });
                      if (activeSession) {
                        setActiveSession({
                          ...activeSession,
                          selectedProducts: [],
                        });
                        setSelectAllChecked(false);
                      }
                    }}
                    className="w-full bg-muted border border-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Todas</option>
                    {categories
                      .find((c) => c._id === selectedFilters.mainCategory)
                      ?.subcategories?.map((sub: any) => (
                        <option key={sub._id} value={sub._id}>
                          {sub.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Brand */}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Marca (Cert.)
                </label>
                <select
                  value={selectedFilters.brand}
                  onChange={(e) => {
                    setSelectedFilters({
                      ...selectedFilters,
                      brand: e.target.value,
                    });
                    if (activeSession) {
                      setActiveSession({
                        ...activeSession,
                        selectedProducts: [],
                      });
                      setSelectAllChecked(false);
                    }
                  }}
                  className="w-full bg-muted border border-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Todas las marcas</option>
                  {brands.map((brand) => (
                    <option key={brand._id || brand.name} value={brand._id || brand.name}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Attributes */}
              {allAttributes.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    Atributos
                  </label>
                  <div className="space-y-2">
                    {allAttributes.map((attr) => (
                      <label key={attr._id || attr.name} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFilters.attributes.includes(attr._id || attr.name)}
                          onChange={(e) => {
                            const value = attr._id || attr.name;
                            setSelectedFilters({
                              ...selectedFilters,
                              attributes: e.target.checked
                                ? [...selectedFilters.attributes, value]
                                : selectedFilters.attributes.filter((a) => a !== value),
                            });
                            if (activeSession) {
                              setActiveSession({
                                ...activeSession,
                                selectedProducts: [],
                              });
                              setSelectAllChecked(false);
                            }
                          }}
                          className="w-4 h-4 rounded border-muted bg-muted cursor-pointer"
                        />
                        <span className="text-sm">{attr.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-4 border-t border-muted">
                <button
                  onClick={() => {
                    setSelectedFilters({
                      mainCategory: "",
                      subCategory: "",
                      brand: "",
                      attributes: [],
                    });
                    setSearchQuery("");
                    if (activeSession) {
                      setActiveSession({
                        ...activeSession,
                        selectedProducts: [],
                      });
                      setSelectAllChecked(false);
                    }
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-muted hover:bg-muted transition-colors text-sm font-medium"
                >
                  Limpiar
                </button>
                <button
                  onClick={() => {
                    if (selectedFilters.mainCategory || searchQuery) {
                      fetchFilteredProducts(
                        selectedFilters.mainCategory,
                        selectedFilters.subCategory,
                        selectedFilters.attributes,
                        searchQuery,
                        selectedFilters.brand
                      );
                    }
                    setShowFilterModal(false);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Scanning view
  if (view === "scanning") {
    const items = activeSession?.scannedItems ?? [];
    const discrepancies = items.filter(
      (i) => i.isDiscrepancy || i.difference !== 0
    );
    
    // Get products that were selected but not scanned
    const selectedProducts = activeSession?.selectedProducts ?? [];
    const scannedVariationIds = new Set(items.map((i) => i.variationId));
    const unscannedProducts = selectedProducts.filter(
      (p) => !scannedVariationIds.has(p.variationId)
    );

    return (
      <div className="max-w-6xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button
            onClick={() => {
              setView("store-select");
              fetchStores();
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Sucursales
          </button>
          <span className="text-muted-foreground">/</span>
          <h1 className="font-bold text-lg">{selectedStore?.name}</h1>
          <div className="ml-auto flex gap-2 flex-wrap">
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
              Escaneados: {items.length}
            </span>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
              Coinciden: {activeSession?.totalMatched ?? 0}
            </span>
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
              Discrepancias: {discrepancies.length}
            </span>
              <button
                onClick={handleFinalize}
                disabled={finalizing || items.length === 0}
                className="w-[200px] bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {finalizing ? "Finalizando…" : "Finalizar conteo"}
              </button>
          </div>
        </div>

        <div className="grid grid-cols-1  gap-6">
          
          {/* Scanner panel */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between gap-4 border border-muted rounded-xl p-5 bg-card sticky top-4 space-y-4">
              <div className="flex items-center flex-col w-full gap-2 w-full">
                <div className="flex items-center w-full gap-2 mb-3 justify-center">
                  <MdQrCodeScanner size={20} className="text-primary" />
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanQuery}
                  onChange={(e) => setScanQuery(e.target.value)}
                  onKeyDown={handleScanKeyDown}
                  placeholder="Escanea código / SKU…"
                  className="w-full bg-muted rounded-lg px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                </div>
               
                {lookupError && (
                  <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                    <MdWarning size={14} /> {lookupError}
                  </p>
                )}
                {lookupResults.length > 0 && (
                  <div className="border w-full border-primary/30 rounded-lg p-3 bg-primary/5 space-y-3">
                    {/* Multiple results list */}
                    {lookupResults.length > 1 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        <p className="text-xs font-medium text-muted-foreground">Selecciona un producto:</p>
                        {lookupResults.map((result, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedLookupProduct(result)}
                            className={`w-full text-left p-2 rounded-lg border transition-all ${
                              selectedLookupProduct?.variationId === result.variationId
                                ? "border-primary bg-primary/10"
                                : "border-muted hover:bg-muted/50"
                            }`}
                          >
                            <p className="text-xs font-medium truncate">{result.productTitle}</p>
                            {result.variationTitle && (
                              <p className="text-xs text-muted-foreground truncate">{result.variationTitle}</p>
                            )}
                            {result.sku && <p className="text-xs text-muted-foreground">SKU: {result.sku}</p>}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Selected product details */}
                    {selectedLookupProduct && (
                      <>
                        {selectedLookupProduct.image && (
                          <Image
                            src={selectedLookupProduct.image}
                            alt={selectedLookupProduct.productTitle}
                            width={96}
                            height={96}
                            className="w-24 h-24 object-cover rounded-lg border border-muted"
                          />
                        )}
                        <div className="space-y-1">
                          <p className="font-semibold text-xs line-clamp-2">
                            {selectedLookupProduct.productTitle}
                          </p>
                          {selectedLookupProduct.variationTitle && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {selectedLookupProduct.variationTitle}
                            </p>
                          )}
                          <p className="text-xs">
                            <span className="text-muted-foreground">Stock:</span>{" "}
                            <strong>{selectedLookupProduct.systemCount}</strong>
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">
                            Conteo físico
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={pendingCount}
                            onChange={(e) =>
                              setPendingCount(
                                e.target.value === "" ? "" : Number(e.target.value)
                              )
                            }
                            onKeyDown={(e) => e.key === "Enter" && handleAddCount()}
                            className="w-full bg-background border border-muted rounded-lg px-3 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddCount}
                            disabled={saving || pendingCount === ""}
                            className="flex-1 bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                          >
                            {saving ? "…" : "Agregar"}
                          </button>
                          <button
                            onClick={() => {
                              setLookupResults([]);
                              setSelectedLookupProduct(null);
                              setScanQuery("");
                              scanInputRef.current?.focus();
                            }}
                            className="px-3 py-2 rounded-lg border border-muted hover:bg-muted transition-colors"
                          >
                            <MdClose size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

            

            
            </div>
          </div>

          {/* Items list */}
          <div className="lg:col-span-2">
            {items.length === 0 ? (
              <div className="border border-dashed border-muted rounded-xl p-8 text-center bg-muted/20">
                <MdInventory size={32} className="text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground">Comienza escaneando productos</p>
              </div>
            ) : (
              <div className="border border-muted rounded-xl bg-card overflow-hidden">
                <div className="px-5 py-3 border-b border-muted bg-muted/30">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-sm">
                      Productos escaneados ({items.length})
                    </h2>
                    {unscannedProducts.length > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 px-2 py-1 rounded font-semibold">
                        {unscannedProducts.length} sin escanear
                      </span>
                    )}
                  </div>
                </div>
                <div className="divide-y divide-muted max-h-96 overflow-y-auto">
                  {unscannedProducts.length > 0 && (
                    <>
                      <div className="px-5 py-2 bg-amber-50 dark:bg-amber-950/20 sticky top-0 z-10 font-semibold text-xs text-amber-800 dark:text-amber-200">
                        ⚠ PRODUCTOS NO ESCANEADOS
                      </div>
                      {unscannedProducts.map((product) => (
                        <div
                          key={product.variationId}
                          className="px-5 py-3 space-y-2 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-400"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate text-amber-900 dark:text-amber-100">
                                {product.productTitle}
                              </p>
                              {product.variationTitle && (
                                <p className="text-xs text-amber-700 dark:text-amber-300 truncate">
                                  {product.variationTitle}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-xs bg-amber-100 dark:bg-amber-900/40 rounded px-2 py-1 font-semibold text-amber-700 dark:text-amber-200 inline-block">
                            ❌ NO ESCANEADO
                          </div>
                          {product.sku && (
                            <div className="text-xs text-amber-600 dark:text-amber-400">
                              SKU: <span className="font-mono">{product.sku}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                  {items.map((item, idx) => {
                    const status =
                      item.difference === 0
                        ? "match"
                        : item.difference > 0
                          ? "excess"
                          : "deficit";

                    return (
                      <div
                        key={item.variationId}
                        className={`px-5 py-3 space-y-2 ${
                          item.isDiscrepancy ? "bg-red-50 dark:bg-red-950/20" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {idx + 1}. {item.productTitle}
                            </p>
                            {item.variationTitle && (
                              <p className="text-xs text-muted-foreground truncate">
                                {item.variationTitle}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.variationId)}
                            className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                          >
                            <MdDelete size={16} />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-muted/50 rounded px-2 py-1">
                            <span className="text-muted-foreground">Sistema</span>
                            <p className="font-semibold">{item.systemCount}</p>
                          </div>
                          <div className="bg-muted/50 rounded px-2 py-1">
                            <span className="text-muted-foreground">Conteo</span>
                            <p className="font-semibold">{item.physicalCount}</p>
                          </div>
                          <div
                            className={`rounded px-2 py-1 ${
                              status === "match"
                                ? "bg-emerald-100 dark:bg-emerald-900/30"
                                : status === "excess"
                                  ? "bg-blue-100 dark:bg-blue-900/30"
                                  : "bg-red-100 dark:bg-red-900/30"
                            }`}
                          >
                            <span className="text-muted-foreground">Dif.</span>
                            <p className="font-semibold">
                              {item.difference > 0 ? "+" : ""}
                              {item.difference}
                            </p>
                          </div>
                        </div>

                        {(item.difference !== 0) && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setNotesEditingVariationId(item.variationId);
                                setNoteText(item.note || "");
                                setNotesModalOpen(true);
                              }}
                              className="text-xs flex items-center gap-1 px-2 py-1 rounded border border-muted hover:bg-muted transition-colors"
                            >
                              <MdEdit size={14} /> Nota {item.note && <span className="text-emerald-600">✓</span>}
                            </button>
                            <button
                              onClick={() => handleToggleDiscrepancy(item)}
                              className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                                item.isDiscrepancy
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30"
                                  : "border border-muted hover:bg-muted"
                              }`}
                            >
                              <MdWarning size={14} />{" "}
                              {item.isDiscrepancy ? "Marcada" : "Marcar"}
                            </button>
                          </div>
                        )}

                        {item.note && (
                          <div className="text-xs bg-emerald-50 dark:bg-emerald-950/20 rounded px-2 py-1 italic border border-emerald-200 dark:border-emerald-900/30">
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">Nota: </span>
                            <span className="text-emerald-900 dark:text-emerald-300">&quot;{item.note}&quot;</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Selected products list */}
          <div className="lg:col-span-1">
            {!activeSession?.selectedProducts || activeSession.selectedProducts.length === 0 ? (
              <div className="border border-dashed border-muted rounded-xl p-4 text-center bg-muted/20 text-muted-foreground text-sm">
                <p>No hay productos pre-seleccionados</p>
              </div>
            ) : (
              <div className="border border-muted rounded-xl bg-card overflow-hidden sticky top-4">
                <div className="px-4 py-3 border-b border-muted bg-muted/30">
                  <h2 className="font-semibold text-sm">
                    Por inventariar ({activeSession.selectedProducts.length})
                  </h2>
                </div>
                <div className="divide-y divide-muted max-h-[calc(100vh-200px)] overflow-y-auto">
                  {activeSession.selectedProducts.map((product) => {
                    const isScanned = items.some(
                      (i) => i.variationId === product.variationId
                    );
                    return (
                      <div
                        key={product.variationId}
                        className={`px-4 py-2 text-xs transition-colors ${
                          isScanned
                            ? "bg-emerald-50 dark:bg-emerald-950/20"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">
                            {isScanned ? (
                              <MdCheckBox size={14} className="text-emerald-600" />
                            ) : (
                              <MdCheckBoxOutlineBlank
                                size={14}
                                className="text-muted-foreground"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs truncate">
                              {product.productTitle}
                            </p>
                            {product.variationTitle && (
                              <p className="text-xs text-muted-foreground truncate">
                                {product.variationTitle}
                              </p>
                            )}
                            {product.sku && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {product.sku}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes Modal */}
        {notesModalOpen && notesEditingItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Agregar nota</h2>
                <button
                  onClick={() => {
                    setNotesModalOpen(false);
                    setNoteText("");
                    setNotesEditingVariationId(null);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MdClose size={20} />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                {notesEditingItem.productTitle}
              </p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Escribe tu nota aquí…"
                className="w-full bg-muted rounded-lg px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary resize-none h-24"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setNotesModalOpen(false);
                    setNoteText("");
                    setNotesEditingVariationId(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-muted hover:bg-muted transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateNote}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? "…" : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Finalize Confirmation Modal */}
        {confirmFinalizeOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-xl max-w-md w-full p-6 space-y-6 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <MdWarning size={24} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">¿Finalizar conteo?</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Esta acción no se puede deshacer
                  </p>
                </div>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4">
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  Una vez finalizado, ya no podrás modificar los conteos, notas ni discrepancias registradas en esta sesión.
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setConfirmFinalizeOpen(false)}
                  disabled={finalizing}
                  className="px-4 py-2 rounded-lg border border-muted hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmFinalize}
                  disabled={finalizing}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {finalizing ? "Finalizando…" : "Sí, finalizar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Discrepancies view
  if (view === "discrepancies") {
    const discrepancies = (activeSession?.scannedItems || []).filter(
      (i) => i.isDiscrepancy || i.difference !== 0
    );

    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <button
          onClick={() => setView("scanning")}
          className="text-muted-foreground hover:text-foreground mb-6 transition-colors flex items-center gap-1"
        >
          ← Volver al escaneo
        </button>

        <div className="flex items-center gap-3 mb-6">
          <MdWarning size={28} className="text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold">Discrepancias encontradas</h1>
            <p className="text-muted-foreground text-sm">
              Productos con diferencias entre conteo físico y sistema
            </p>
          </div>
        </div>

        {discrepancies.length === 0 ? (
          <div className="text-center text-muted-foreground">
            No hay discrepancias
          </div>
        ) : (
          <div className="space-y-3">
            {discrepancies.map((item) => (
              <div
                key={item.variationId}
                className="border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold">{item.productTitle}</p>
                    {item.variationTitle && (
                      <p className="text-sm text-muted-foreground">
                        {item.variationTitle}
                      </p>
                    )}
                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Sistema:</span>
                        <p className="font-semibold">{item.systemCount}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Conteo:</span>
                        <p className="font-semibold">{item.physicalCount}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Diferencia:</span>
                        <p className="font-semibold text-red-600">
                          {item.difference > 0 ? "+" : ""}
                          {item.difference}
                        </p>
                      </div>
                    </div>
                    {item.note && (
                      <p className="mt-2 text-sm italic">
                        <span className="font-medium">Nota:</span> {item.note}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setNotesEditingVariationId(item.variationId);
                        setNoteText(item.note || "");
                        setNotesModalOpen(true);
                      }}
                      className="px-3 py-2 rounded-lg border border-muted hover:bg-muted transition-colors text-sm font-medium flex items-center gap-1 flex-shrink-0"
                    >
                      <MdEdit size={14} /> Nota {item.note && <span className="text-emerald-600">✓</span>}
                    </button>
                    <button
                      onClick={() => handleToggleDiscrepancy(item)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 flex-shrink-0 transition-all ${
                        item.isDiscrepancy
                          ? "bg-red-500 text-white hover:bg-red-600 shadow-md"
                          : "border-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-950/30"
                      }`}
                    >
                      <MdWarning size={14} /> {item.isDiscrepancy ? "✓ Marcada" : "Marcar"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notes Modal for Discrepancies */}
        {notesModalOpen && notesEditingItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-xl max-w-md w-full p-6 space-y-4">
              <h2 className="font-semibold">Editar nota de discrepancia</h2>
              <p className="text-sm text-muted-foreground">
                {notesEditingItem.productTitle}
              </p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Describe por qué hay discrepancia…"
                className="w-full bg-muted rounded-lg px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary resize-none h-24"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setNotesModalOpen(false);
                    setNoteText("");
                    setNotesEditingVariationId(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-muted hover:bg-muted transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateNote}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? "…" : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Report view
  if (view === "report") {
    const items = activeSession?.scannedItems ?? [];
    const discrepancies = items.filter((i) => i.isDiscrepancy || i.difference !== 0);

    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <button
          onClick={() => {
            setView("store-select");
            fetchStores();
          }}
          className="text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          ← Sucursales
        </button>

        <div className="flex items-center gap-3 mb-8">
          <MdCheckCircle size={28} className="text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold">Conteo finalizado</h1>
            <p className="text-muted-foreground text-sm">
              {selectedStore?.name}
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="border border-muted rounded-lg p-4 bg-card">
            <p className="text-muted-foreground text-xs mb-1">Escaneados</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </div>
          <div className="border border-muted rounded-lg p-4 bg-card">
            <p className="text-muted-foreground text-xs mb-1">Coincidencias</p>
            <p className="text-2xl font-bold text-emerald-600">
              {activeSession?.totalMatched}
            </p>
          </div>
          <div className="border border-muted rounded-lg p-4 bg-card">
            <p className="text-muted-foreground text-xs mb-1">Discrepancias</p>
            <p className="text-2xl font-bold text-red-600">
              {discrepancies.length}
            </p>
          </div>
          <div className="border border-muted rounded-lg p-4 bg-card">
            <p className="text-muted-foreground text-xs mb-1">Exactitud</p>
            <p className="text-2xl font-bold">
              {items.length > 0
                ? Math.round(
                    ((activeSession?.totalMatched ?? 0) / items.length) * 100
                  )
                : 0}
              %
            </p>
          </div>
        </div>

        {/* Items table */}
        <div className="border border-muted rounded-xl bg-card overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-muted bg-muted/30 flex items-center justify-between">
            <h2 className="font-semibold text-sm">Detalle de productos</h2>
            <button
              onClick={handleExportCSV}
              className="text-xs flex items-center gap-1 px-3 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <MdDownload size={14} /> Exportar CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-muted bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Producto</th>
                  <th className="px-5 py-3 text-center font-medium">Sistema</th>
                  <th className="px-5 py-3 text-center font-medium">Conteo</th>
                  <th className="px-5 py-3 text-center font-medium">Diferencia</th>
                  <th className="px-5 py-3 text-left font-medium">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {items.map((item) => (
                  <tr
                    key={item.variationId}
                    className={
                      item.isDiscrepancy || item.difference !== 0
                        ? "bg-red-50 dark:bg-red-950/10"
                        : ""
                    }
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-sm truncate">
                        {item.productTitle}
                      </p>
                      {item.variationTitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.variationTitle}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">{item.systemCount}</td>
                    <td className="px-5 py-3 text-center font-semibold">
                      {item.physicalCount}
                    </td>
                    <td
                      className={`px-5 py-3 text-center font-semibold ${
                        item.difference === 0
                          ? "text-emerald-600"
                          : item.difference > 0
                            ? "text-blue-600"
                            : "text-red-600"
                      }`}
                    >
                      {item.difference > 0 ? "+" : ""}
                      {item.difference}
                    </td>
                    <td className="px-5 py-3 text-xs italic">
                      {item.note || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Past reports view
  if (view === "past-reports") {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <button
          onClick={() => {
            setView("store-select");
            fetchStores();
          }}
          className="text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          ← Sucursales
        </button>

        <h1 className="text-2xl font-bold mb-6">Reportes finalizados - {selectedStore?.name}</h1>

        {pastSessions.length === 0 ? (
          <p className="text-muted-foreground">No hay reportes</p>
        ) : (
          <div className="space-y-3">
            {pastSessions.map((session) => (
              <div
                key={session._id}
                className="border border-muted rounded-lg p-4 bg-card hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {new Date(session.startedAt).toLocaleDateString()} -{" "}
                      {session.startedByName}
                    </p>
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      <span>
                        Escaneados:{" "}
                        <strong className="text-foreground">
                          {session.totalScanned}
                        </strong>
                      </span>
                      <span>
                        Coincidencias:{" "}
                        <strong className="text-emerald-600">
                          {session.totalMatched}
                        </strong>
                      </span>
                      <span>
                        Discrepancias:{" "}
                        <strong className="text-red-600">
                          {session.totalDiscrepancies}
                        </strong>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewReport(session, selectedStore!)}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0"
                  >
                    Ver reporte
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

