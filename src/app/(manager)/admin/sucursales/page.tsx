"use client";
import { useEffect, useState } from "react";
import {
  MdAdd,
  MdEdit,
  MdToggleOn,
  MdToggleOff,
  MdStorefront,
  MdWarehouse,
} from "react-icons/md";
import Link from "next/link";
import StoreFormModal from "./_components/StoreFormModal";

interface Store {
  _id: string;
  name: string;
  slug: string;
  type: string;
  city?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  branchLegacyName?: string;
  managedBy?: { _id: string; name: string; email: string }[];
}

const typeLabels: Record<string, string> = {
  fisica: "Tienda Física",
  online: "Online",
  instagram: "Instagram",
  evento: "Evento",
  otro: "Otro",
};

export default function StoresAdminPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/stores")
      .then((r) => r.json())
      .then((data) => {
        setStores(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(store: Store) {
    await fetch(`/api/stores/${store._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !store.isActive }),
    });
    load();
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sucursales</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona las tiendas físicas y canales de venta del negocio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/sucursales/migrar-inventario"
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
          >
            <MdWarehouse size={18} /> Migrar Inventario
          </Link>
          <button
            onClick={() => {
              setEditingStore(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <MdAdd size={18} /> Nueva Sucursal
          </button>
        </div>
      </div>

      {loading && (
        <p className="text-muted-foreground text-sm animate-pulse">
          Cargando...
        </p>
      )}

      {!loading && stores.length === 0 && (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-muted rounded-xl">
          <MdStorefront size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay sucursales registradas aún.</p>
          <p className="text-xs mt-1">
            Crea la primera sucursal con el botón de arriba.
          </p>
        </div>
      )}

      {!loading && stores.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-muted">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Ciudad</th>
                <th className="px-4 py-3 text-left">Slug (POS)</th>
                <th className="px-4 py-3 text-left">Branch Legacy</th>
                <th className="px-4 py-3 text-center">Activa</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr
                  key={store._id}
                  className="border-t border-muted hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-semibold">{store.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {typeLabels[store.type] ?? store.type}
                  </td>
                  <td className="px-4 py-3 text-xs">{store.city ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-primary">
                    /puntodeventa/{store.slug}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {store.branchLegacyName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(store)}
                      className="hover:opacity-70 transition-opacity"
                    >
                      {store.isActive ? (
                        <MdToggleOn
                          size={26}
                          className="text-green-500 mx-auto"
                        />
                      ) : (
                        <MdToggleOff
                          size={26}
                          className="text-muted-foreground mx-auto"
                        />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        setEditingStore(store);
                        setShowForm(true);
                      }}
                      className="text-primary hover:underline flex items-center gap-1 text-xs mx-auto"
                    >
                      <MdEdit size={14} /> Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <StoreFormModal
          store={editingStore}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}
