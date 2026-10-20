"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MdArrowBack, MdCheck, MdClose, MdEdit, MdSave, MdAdd, MdSearch, MdQrCodeScanner } from "react-icons/md";
import BarcodeScannerModal from "@/components/modals/BarcodeScannerModal";

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
  
  // Item editing state
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editQty, setEditQty] = useState<number | null>(null);
  const [editCost, setEditCost] = useState<number | null>(null);
  const [editItemNote, setEditItemNote] = useState("");

  // Add product state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariation, setSelectedVariation] = useState<any>(null);
  const [addQty, setAddQty] = useState(1);
  const [addCost, setAddCost] = useState<number | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/work-orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setWo(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

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

  async function saveItemEdit(itemIndex: number) {
    if (editQty === null && editCost === null) {
      setError("Debe cambiar al menos cantidad o costo");
      return;
    }

    const item = wo.items[itemIndex];
    if (editQty !== null && editQty <= 0) {
      setError("La cantidad debe ser mayor a 0");
      return;
    }
    if (editCost !== null && editCost < 0) {
      setError("El costo no puede ser negativo");
      return;
    }

    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemEdit: {
            itemIndex,
            newQuantity: editQty !== null ? editQty : item.quantity,
            newUnitCost: editCost !== null ? editCost : item.unitCost,
            editNote: editItemNote,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setWo(data);
      setEditingItemIndex(null);
      setEditQty(null);
      setEditCost(null);
      setEditItemNote("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActing(false);
    }
  }

  function startEditingItem(itemIndex: number) {
    const item = wo.items[itemIndex];
    setEditingItemIndex(itemIndex);
    setEditQty(item.quantity);
    setEditCost(item.unitCost || 0);
    setEditItemNote("");
  }

  async function searchProducts(query: string) {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(
        `/api/pos/search?q=${encodeURIComponent(query)}&limit=10`
      );
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function addProductToOrder() {
    if (!selectedProduct || !selectedVariation) {
      setError("Selecciona un producto y variación");
      return;
    }
    if (!addQty || addQty <= 0) {
      setError("La cantidad debe ser mayor a 0");
      return;
    }
    if (addCost === null || addCost < 0) {
      setError("El costo no puede ser negativo");
      return;
    }

    setActing(true);
    setError("");
    try {
      const variationLabel =
        [selectedVariation.color, selectedVariation.size, selectedVariation.title]
          .filter(Boolean)
          .join(" / ") || "Default";

      const res = await fetch(`/api/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addItem: {
            productId: selectedProduct._id,
            productTitle: selectedProduct.title,
            variationId: selectedVariation._id,
            variationTitle: variationLabel,
            quantity: addQty,
            unitCost: addCost || selectedVariation.price || 0,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setWo(data);
      setShowAddProduct(false);
      setProductSearch("");
      setSearchResults([]);
      setSelectedProduct(null);
      setSelectedVariation(null);
      setAddQty(1);
      setAddCost(null);
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
    <div className="p-6 max-w-4xl">
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

      {/* Items - Editable when approved */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Artículos {wo.status === "approved" && "(Editable)"}
          </p>
        </div>
        <div className="border border-muted rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Producto / Variación</th>
                <th className="px-4 py-2 text-center">Cant.</th>
                <th className="px-4 py-2 text-right">Costo Unit.</th>
                {wo.status === "approved" && <th className="px-4 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {wo.items?.map((item: any, idx: number) => (
                <tr key={idx} className="border-t border-muted">
                  {editingItemIndex === idx ? (
                    <>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-xs">{item.productTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.variationTitle}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="number"
                          min="1"
                          value={editQty || ""}
                          onChange={(e) =>
                            setEditQty(
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          className="w-16 bg-muted rounded px-2 py-1 text-center text-sm outline-none border border-primary"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editCost ?? ""}
                          onChange={(e) =>
                            setEditCost(
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                          className="w-24 bg-muted rounded px-2 py-1 text-right text-sm outline-none border border-primary"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          disabled={acting}
                          onClick={() => saveItemEdit(idx)}
                          className="text-green-600 hover:text-green-700 disabled:opacity-50"
                          title="Guardar"
                        >
                          <MdSave size={18} />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
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
                      {wo.status === "approved" && (
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => startEditingItem(idx)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Editar"
                          >
                            <MdEdit size={18} />
                          </button>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editingItemIndex !== null && (
          <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-3">
              Nota de Edición (opcional)
            </p>
            <textarea
              placeholder="Describe qué fue editado y por qué..."
              value={editItemNote}
              onChange={(e) => setEditItemNote(e.target.value)}
              rows={2}
              className="w-full bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none resize-none border border-blue-100 dark:border-blue-800 mb-3"
            />
            <div className="flex gap-2">
              <button
                disabled={acting}
                onClick={() => saveItemEdit(editingItemIndex)}
                className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                <MdSave size={16} /> Guardar Cambios
              </button>
              <button
                onClick={() => {
                  setEditingItemIndex(null);
                  setEditQty(null);
                  setEditCost(null);
                  setEditItemNote("");
                }}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {wo.status === "approved" && (
          <button
            onClick={() => setShowAddProduct(true)}
            className="mt-4 flex items-center gap-2 bg-green-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            <MdAdd size={18} /> Agregar Producto
          </button>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-muted bg-white dark:bg-slate-900">
              <h2 className="text-lg font-bold">Agregar Producto</h2>
              <button
                onClick={() => {
                  setShowAddProduct(false);
                  setProductSearch("");
                  setSearchResults([]);
                  setSelectedProduct(null);
                  setSelectedVariation(null);
                  setAddQty(1);
                  setAddCost(null);
                  setError("");
                }}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <MdClose size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Search section */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">
                  Buscar Producto
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1 flex items-center">
                    <MdSearch size={18} className="text-muted-foreground absolute left-3" />
                    <input
                      type="text"
                      placeholder="Nombre, SKU o escanea código..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        searchProducts(e.target.value);
                      }}
                      autoFocus
                      className="w-full bg-muted rounded-lg px-10 py-2.5 text-sm outline-none border border-muted-foreground/20 focus:border-primary"
                    />
                  </div>
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="bg-primary text-white rounded-lg px-4 py-2.5 hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <MdQrCodeScanner size={18} /> QR
                  </button>
                </div>

                {searchLoading && (
                  <p className="text-xs text-muted-foreground mt-2">Buscando...</p>
                )}

                {searchResults.length > 0 && (
                  <div className="mt-2 border border-muted rounded-lg bg-muted/30 max-h-40 overflow-y-auto">
                    {searchResults.map((product) => (
                      <button
                        key={product._id}
                        onClick={() => {
                          setSelectedProduct(product);
                          setSelectedVariation(product.variations?.[0] || null);
                          setProductSearch("");
                          setSearchResults([]);
                        }}
                        className={`w-full px-3 py-2.5 text-left text-xs border-b border-muted hover:bg-muted transition-colors ${
                          selectedProduct?._id === product._id
                            ? "bg-primary/10 border-l-2 border-l-primary"
                            : ""
                        }`}
                      >
                        <p className="font-semibold">{product.title}</p>
                        <p className="text-muted-foreground text-xs">{product.sku}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected product card */}
              {selectedProduct && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2 uppercase tracking-wide">
                    Producto Seleccionado
                  </p>
                  <p className="text-sm font-semibold mb-1">{selectedProduct.title}</p>
                  <p className="text-xs text-muted-foreground mb-3">{selectedProduct.sku}</p>

                
                </div>
              )}

              {/* Quantity and cost */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={addQty}
                    onChange={(e) => setAddQty(parseInt(e.target.value) || 1)}
                    className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none border border-muted-foreground/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">
                    Costo Unit.
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={selectedVariation?.price?.toFixed(2) || "0.00"}
                    value={addCost ?? ""}
                    onChange={(e) =>
                      setAddCost(e.target.value ? parseFloat(e.target.value) : null)
                    }
                    className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none border border-muted-foreground/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Error message */}
              {error && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3 border border-red-200 dark:border-red-800">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={addProductToOrder}
                  disabled={acting || !selectedProduct || !selectedVariation}
                  className="flex-1 bg-green-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <MdSave size={16} /> Agregar Producto
                </button>
                <button
                  onClick={() => {
                    setShowAddProduct(false);
                    setProductSearch("");
                    setSearchResults([]);
                    setSelectedProduct(null);
                    setSelectedVariation(null);
                    setAddQty(1);
                    setAddCost(null);
                    setError("");
                  }}
                  className="flex-1 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground border border-muted rounded-lg hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScannerModal
          onScan={(value) => {
            setProductSearch(value);
            searchProducts(value);
            setIsScannerOpen(false);
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {/* Edit History Display */}
      {wo.items?.some((item: any) => item.editHistory && item.editHistory.length > 0) && (
        <div className="mb-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Historial de Ediciones
          </p>
          <div className="space-y-3">
            {wo.items?.map((item: any, idx: number) =>
              item.editHistory?.map((edit: any, editIdx: number) => (
                <div
                  key={`${idx}-${editIdx}`}
                  className="bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-3 border border-amber-200 dark:border-amber-800"
                >
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-300 mb-1">
                    {item.productTitle}
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    <span className="font-medium">{edit.editedByName}</span> ·{" "}
                    {new Date(edit.createdAt).toLocaleString("es-MX")}
                  </p>
                  <div className="text-xs space-y-1 mb-2">
                    {edit.originalQuantity !== undefined && (
                      <p>
                        Cantidad: <span className="line-through">{edit.originalQuantity}</span> →{" "}
                        <span className="font-semibold">{edit.newQuantity}</span>
                      </p>
                    )}
                    {edit.originalUnitCost !== undefined && (
                      <p>
                        Costo: <span className="line-through">${edit.originalUnitCost?.toFixed(2)}</span> →{" "}
                        <span className="font-semibold">${edit.newUnitCost?.toFixed(2)}</span>
                      </p>
                    )}
                  </div>
                  {edit.editNote && (
                    <p className="text-xs italic">&quot;{edit.editNote}&quot;</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {wo.notes && (
        <div className="bg-muted/30 rounded-xl px-4 py-3 text-sm text-muted-foreground mb-5">
          <p className="text-xs font-medium uppercase tracking-wide mb-1">
            Notas Iniciales
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
