"use client";
import React, { useEffect, useState } from "react";
import {
  MdWarning,
  MdEdit,
  MdClose,
  MdCheckCircle,
  MdArrowBack,
  MdStorefront,
  MdSave,
} from "react-icons/md";

interface Store {
  _id: string;
  name: string;
  slug: string;
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

interface CheckSession {
  _id: string;
  storeName: string;
  status: "in_progress" | "finalized";
  selectedProducts: any[];
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

export default function AjusteDiscrepanciasPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [sessions, setSessions] = useState<CheckSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CheckSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notes modal
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesEditingItem, setNotesEditingItem] = useState<ScannedItem | null>(null);
  const [noteText, setNoteText] = useState("");

  // Track edited items
  const [editedItems, setEditedItems] = useState<Map<string, ScannedItem>>(new Map());

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/inventory-check");
    const data = await res.json();
    setStores(data.stores || []);
    setLoading(false);
  };

  const fetchSessionsByStore = async (store: Store) => {
    setLoading(true);
    const res = await fetch(`/api/admin/inventory-check`);
    const data = await res.json();
    
    // Filter finalized sessions for this store that have discrepancies
    const filteredSessions = (data.sessions || [])
      .filter(
        (s: CheckSession) =>
          s.status === "finalized" &&
          (s.storeName === store.name || (s as any).store === store._id) &&
          s.scannedItems.some((item) => item.isDiscrepancy || item.difference !== 0)
      );
    
    setSessions(filteredSessions);
    setLoading(false);
  };

  const handleSelectStore = (store: Store) => {
    setSelectedStore(store);
    setSelectedSession(null);
    fetchSessionsByStore(store);
  };

  const handleSelectSession = (session: CheckSession) => {
    setSelectedSession(session);
    setEditedItems(new Map());
  };

  const updateItemCount = (item: ScannedItem, newCount: number) => {
    const updated = {
      ...item,
      physicalCount: newCount,
      difference: item.systemCount - newCount,
    };
    
    const newMap = new Map(editedItems);
    newMap.set(item.variationId, updated);
    setEditedItems(newMap);
  };

  const handleToggleDiscrepancy = (item: ScannedItem) => {
    const updated = {
      ...item,
      isDiscrepancy: !item.isDiscrepancy,
    };
    
    const newMap = new Map(editedItems);
    newMap.set(item.variationId, updated);
    setEditedItems(newMap);
  };

  const handleUpdateNote = async (item: ScannedItem) => {
    if (!selectedSession) return;
    setSaving(true);
    
    // Get the current display item (which may have edits)
    const currentItem = getDisplayItem(item);
    const updated = {
      ...currentItem,
      note: noteText,
    };
    
    const newMap = new Map(editedItems);
    newMap.set(item.variationId, updated);
    setEditedItems(newMap);
    
    setSaving(false);
    setNotesModalOpen(false);
    setNotesEditingItem(null);
    setNoteText("");
  };

  const handleSaveChanges = async () => {
    if (!selectedSession || editedItems.size === 0) return;
    setSaving(true);

    try {
      // Update each edited item
      for (const [variationId, item] of editedItems) {
        await fetch(
          `/api/admin/inventory-check/${selectedSession._id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          }
        );
      }

      // Reload session to get updated data
      const res = await fetch(`/api/admin/inventory-check/${selectedSession._id}`);
      const data = await res.json();
      setSelectedSession(data.session);
      setEditedItems(new Map());
    } catch (error) {
      console.error("Error saving changes:", error);
    }

    setSaving(false);
  };

  const getDisplayItem = (original: ScannedItem): ScannedItem => {
    return editedItems.get(original.variationId) || original;
  };

  // View: Store selection
  if (!selectedStore || !selectedSession) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <MdWarning size={28} className="text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Ajuste de Discrepancias</h1>
            <p className="text-muted-foreground text-sm">
              Revisa y actualiza productos después de finalizar el conteo
            </p>
          </div>
        </div>

        {!selectedStore ? (
          // Store selection
          <>
            {loading ? (
              <p className="text-muted-foreground">Cargando sucursales...</p>
            ) : (
              <div className="grid gap-4">
                {stores.map((store) => (
                  <div
                    key={store._id}
                    className="border border-muted rounded-xl p-5 bg-card hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => handleSelectStore(store)}
                  >
                    <div className="flex items-center gap-3">
                      <MdStorefront size={20} className="text-primary" />
                      <h2 className="font-semibold flex-1">{store.name}</h2>
                      <MdArrowBack size={20} className="text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          // Session selection
          <>
            <button
              onClick={() => {
                setSelectedStore(null);
                setSessions([]);
              }}
              className="text-muted-foreground hover:text-foreground mb-6 transition-colors flex items-center gap-1"
            >
              ← Cambiar sucursal
            </button>

            <h2 className="text-xl font-semibold mb-4">{selectedStore.name}</h2>

            {loading ? (
              <p className="text-muted-foreground">Cargando sesiones...</p>
            ) : sessions.length === 0 ? (
              <p className="text-muted-foreground">
                No hay sesiones finalizadas con discrepancias en esta sucursal
              </p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session._id}
                    className="border border-muted rounded-lg p-4 bg-card hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => handleSelectSession(session)}
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
                            Discrepancias:{" "}
                            <strong className="text-red-600">
                              {session.totalDiscrepancies}
                            </strong>
                          </span>
                        </div>
                      </div>
                      <MdArrowBack size={20} className="text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // View: Adjust discrepancies
  const discrepancies = selectedSession.scannedItems.filter(
    (i) => i.isDiscrepancy || i.difference !== 0
  );

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <button
        onClick={() => setSelectedSession(null)}
        className="text-muted-foreground hover:text-foreground mb-6 transition-colors flex items-center gap-1"
      >
        ← Volver a sesiones
      </button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MdEdit size={28} className="text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Ajustando discrepancias</h1>
            <p className="text-muted-foreground text-sm">
              {selectedStore?.name} •{" "}
              {new Date(selectedSession.startedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {editedItems.size > 0 && (
          <button
            onClick={handleSaveChanges}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <MdSave size={18} /> Guardar cambios ({editedItems.size})
          </button>
        )}
      </div>

      {discrepancies.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <MdCheckCircle size={48} className="mx-auto mb-3 opacity-50" />
          <p>No hay discrepancias en esta sesión</p>
        </div>
      ) : (
        <div className="space-y-4">
          {discrepancies.map((item) => {
            const displayItem = getDisplayItem(item);

            return (
              <div
                key={item.variationId}
                className="border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20 rounded-lg p-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Producto info */}
                  <div className="md:col-span-1">
                    <p className="font-semibold text-sm mb-2">Producto</p>
                    <p className="font-medium">{item.productTitle}</p>
                    {item.variationTitle && (
                      <p className="text-xs text-muted-foreground">
                        {item.variationTitle}
                      </p>
                    )}
                    {item.sku && (
                      <p className="text-xs text-muted-foreground mt-1">SKU: {item.sku}</p>
                    )}
                  </div>

                  {/* Conteos */}
                  <div className="md:col-span-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                          Conteo Sistema
                        </label>
                        <div className="bg-background rounded px-3 py-2 text-sm font-semibold border border-muted">
                          {item.systemCount}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                          Conteo Físico
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={displayItem.physicalCount}
                          onChange={(e) =>
                            updateItemCount(item, Number(e.target.value))
                          }
                          className="w-full bg-background border border-muted rounded px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                          Diferencia
                        </label>
                        <div
                          className={`rounded px-3 py-2 text-sm font-semibold text-center ${
                            displayItem.difference === 0
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700"
                              : displayItem.difference > 0
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700"
                                : "bg-red-100 dark:bg-red-900/30 text-red-700"
                          }`}
                        >
                          {displayItem.difference > 0 ? "+" : ""}
                          {displayItem.difference}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nota */}
                {displayItem.note && (
                  <div className="mb-4 p-3 bg-background rounded border border-muted">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Nota:
                    </p>
                    <p className="text-sm italic">&quot;{displayItem.note}&quot;</p>
                  </div>
                )}

                {/* Botones */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setNotesEditingItem(item);
                      setNoteText(displayItem.note || "");
                      setNotesModalOpen(true);
                    }}
                    className="text-sm flex items-center gap-1 px-3 py-2 rounded border border-muted hover:bg-muted transition-colors"
                  >
                    <MdEdit size={14} /> Nota
                  </button>
                  <button
                    onClick={() => handleToggleDiscrepancy(item)}
                    className={`text-sm flex items-center gap-1 px-3 py-2 rounded transition-all font-medium ${
                      displayItem.isDiscrepancy
                        ? "bg-red-500 text-white hover:bg-red-600 shadow-md"
                        : "border-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-950/30"
                    }`}
                  >
                    <MdWarning size={14} />{" "}
                    {displayItem.isDiscrepancy ? "✓ Marcada" : "Marcar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes Modal */}
      {notesModalOpen && notesEditingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Editar nota</h2>
              <button
                onClick={() => setNotesModalOpen(false)}
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
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setNotesModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-muted hover:bg-muted transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleUpdateNote(notesEditingItem)}
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
