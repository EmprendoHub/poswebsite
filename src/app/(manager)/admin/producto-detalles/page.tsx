"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  MdAdd,
  MdDelete,
  MdEdit,
  MdSave,
  MdClose,
  MdCheckCircle,
} from "react-icons/md";

interface ProductDetail {
  _id: string;
  catType: "gender" | "brand" | "category";
  catTitle: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProductDetailsPage() {
  const { data: session } = useSession();
  const [details, setDetails] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"gender" | "brand" | "category">(
    "gender",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [newTitle, setNewTitle] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [productCounts, setProductCounts] = useState<{ [key: string]: number }>(
    {},
  );
  const [showDeleteReplaceModal, setShowDeleteReplaceModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ProductDetail | null>(null);
  const [replacementValue, setReplacementValue] = useState<string>("");

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/product-details?catType=${filter}`);
      const data = await res.json();
      if (data.success) {
        setDetails(data.details);
      }

      // Fetch product counts for this category type
      const countRes = await fetch(
        `/api/product-details/count?catType=${filter}`,
      );
      const countData = await countRes.json();
      if (countData.success) {
        setProductCounts(countData.counts);
      }
    } catch (error) {
      console.error("Error fetching details:", error);
      toast.error("Error al cargar detalles");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleAdd = async () => {
    if (!newTitle.trim()) {
      toast.error("Por favor ingresa un título");
      return;
    }

    try {
      const res = await fetch("/api/product-details", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catType: filter,
          catTitle: newTitle.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Detalle creado exitosamente");
        setNewTitle("");
        setShowAddForm(false);
        fetchDetails();
      } else {
        toast.error(data.error || "Error al crear detalle");
      }
    } catch (error) {
      console.error("Error adding detail:", error);
      toast.error("Error al crear detalle");
    }
  };

  const handleEdit = (detail: ProductDetail) => {
    setEditingId(detail._id);
    setEditingValue(detail.catTitle);
  };

  const handleSave = async (id: string) => {
    if (!editingValue.trim()) {
      toast.error("Por favor ingresa un valor");
      return;
    }

    try {
      const detail = details.find((d) => d._id === id);
      if (!detail) return;

      const res = await fetch(`/api/product-details/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catType: filter,
          catTitle: editingValue.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Update all products with the old value to the new value
        const updateRes = await fetch("/api/product-details/update-products", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            catType: filter,
            oldValue: detail.catTitle,
            newValue: editingValue.trim(),
          }),
        });

        const updateData = await updateRes.json();

        toast.success(
          `Detalle actualizado${updateData.modifiedCount ? ` (${updateData.modifiedCount} productos actualizados)` : ""}`,
        );
        setEditingId(null);
        fetchDetails();
      } else {
        toast.error(data.error || "Error al actualizar");
      }
    } catch (error) {
      console.error("Error saving detail:", error);
      toast.error("Error al actualizar detalle");
    }
  };

  const handleDeleteClick = (detail: ProductDetail) => {
    const count = productCounts[detail.catTitle] || 0;
    if (count > 0) {
      // Show modal to select replacement
      setDeleteItem(detail);
      setReplacementValue("");
      setShowDeleteReplaceModal(true);
    } else {
      // No products use this, proceed with delete
      handleDeleteConfirm(detail._id);
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      const res = await fetch(`/api/product-details/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Detalle eliminado");
        fetchDetails();
        setShowDeleteReplaceModal(false);
        setDeleteItem(null);
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al eliminar");
      }
    } catch (error) {
      console.error("Error deleting detail:", error);
      toast.error("Error al eliminar detalle");
    }
  };

  const handleDeleteWithReplacement = async () => {
    if (!deleteItem) return;

    if (!replacementValue.trim()) {
      toast.error("Por favor selecciona un reemplazo");
      return;
    }

    try {
      // Update all products to use the replacement value
      const updateRes = await fetch("/api/product-details/update-products", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catType: filter,
          oldValue: deleteItem.catTitle,
          newValue: replacementValue,
        }),
      });

      const updateData = await updateRes.json();

      if (updateRes.ok) {
        // Now delete the detail
        await handleDeleteConfirm(deleteItem._id);
        toast.success(
          `${updateData.modifiedCount} productos actualizado(s) a "${replacementValue}"`,
        );
      } else {
        toast.error("Error al actualizar productos");
      }
    } catch (error) {
      console.error("Error during delete with replacement:", error);
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Detalles de Productos</h1>
          <p className="text-muted-foreground">
            Gestiona géneros, marcas y categorías de productos
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["gender", "brand", "category"] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                setFilter(type);
                setEditingId(null);
                setShowAddForm(false);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === type
                  ? "bg-blue-600 text-white"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              }`}
            >
              {type === "gender"
                ? "Géneros"
                : type === "brand"
                  ? "Marcas"
                  : "Categorías"}
            </button>
          ))}
        </div>

        {/* Add Button */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="mb-4 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <MdAdd size={18} />
          Agregar Nuevo
        </button>

        {/* Add Form */}
        {showAddForm && (
          <div className="mb-6 p-4 border border-muted rounded-lg bg-muted/20">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-sm font-semibold mb-1 block">
                  Título
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ingresa el título..."
                  className="w-full px-3 py-2 border border-muted rounded-lg bg-background"
                  onKeyPress={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
              <button
                onClick={handleAdd}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <MdCheckCircle size={18} />
                Guardar
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex items-center gap-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <MdClose size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && details.length === 0 && (
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <p className="text-muted-foreground">
              No hay detalles para mostrar
            </p>
          </div>
        )}

        {/* Details List */}
        {!loading && details.length > 0 && (
          <div className="space-y-2">
            {details.map((detail) => (
              <div
                key={detail._id}
                className="flex items-center gap-3 p-4 border border-muted rounded-lg bg-card hover:shadow-md transition-shadow"
              >
                {editingId === detail._id ? (
                  <>
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-muted rounded-lg bg-background"
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleSave(detail._id)
                      }
                    />
                    <button
                      onClick={() => handleSave(detail._id)}
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <MdSave size={16} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <MdClose size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="font-medium">{detail.catTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(detail.updatedAt).toLocaleDateString("es-MX")}{" "}
                        • {productCounts[detail.catTitle] || 0}{" "}
                        {productCounts[detail.catTitle] === 1
                          ? "producto"
                          : "productos"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEdit(detail)}
                      className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <MdEdit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(detail)}
                      className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <MdDelete size={16} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Delete Replacement Modal */}
        {showDeleteReplaceModal && deleteItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-muted rounded-lg shadow-lg max-w-md w-full p-6">
              <h2 className="text-lg font-bold mb-4">Reemplazar productos</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Hay{" "}
                <strong>
                  {productCounts[deleteItem.catTitle] || 0} producto(s)
                </strong>{" "}
                usando <strong>{deleteItem.catTitle}</strong>. ¿A cuál deseas
                reemplazarlo(s)?
              </p>

              <div className="mb-6">
                <label className="text-sm font-semibold mb-2 block">
                  Selecciona el nuevo valor:
                </label>
                <select
                  value={replacementValue}
                  onChange={(e) => setReplacementValue(e.target.value)}
                  className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-foreground"
                >
                  <option value="">-- Selecciona una opción --</option>
                  {details
                    .filter((d) => d._id !== deleteItem._id)
                    .map((d) => (
                      <option key={d._id} value={d.catTitle}>
                        {d.catTitle}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteReplaceModal(false);
                    setDeleteItem(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteWithReplacement}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  Eliminar y Reemplazar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
