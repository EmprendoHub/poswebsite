"use client";
import { useState } from "react";
import { MdClose } from "react-icons/md";

interface Store {
  _id?: string;
  name?: string;
  slug?: string;
  type?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  branchLegacyName?: string;
}

interface Props {
  store: Store | null;
  onClose: () => void;
  onSaved: () => void;
}

function toSlug(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function StoreFormModal({ store, onClose, onSaved }: Props) {
  const isEdit = Boolean(store?._id);
  const [form, setForm] = useState({
    name: store?.name ?? "",
    slug: store?.slug ?? "",
    type: store?.type ?? "fisica",
    address: store?.address ?? "",
    city: store?.city ?? "",
    state: store?.state ?? "",
    phone: store?.phone ?? "",
    email: store?.email ?? "",
    branchLegacyName: store?.branchLegacyName ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: isEdit ? f.slug : toSlug(name) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = isEdit ? `/api/stores/${store!._id}` : "/api/stores";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground";
  const labelClass =
    "text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-muted">
          <h2 className="font-bold text-lg">
            {isEdit ? "Editar Sucursal" : "Nueva Sucursal"}
          </h2>
          <button onClick={onClose}>
            <MdClose
              size={22}
              className="text-muted-foreground hover:text-foreground"
            />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Nombre *</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className={inputClass}
                placeholder="Ej. Sucursal Centro"
              />
            </div>
            <div>
              <label className={labelClass}>Slug (URL) *</label>
              <input
                required
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                className={inputClass}
                placeholder="sucursal-centro"
              />
            </div>
            <div>
              <label className={labelClass}>Tipo</label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value }))
                }
                className={inputClass}
              >
                <option value="fisica">Tienda Física</option>
                <option value="online">Online</option>
                <option value="instagram">Instagram</option>
                <option value="evento">Evento</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Dirección</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                className={inputClass}
                placeholder="Calle, número, colonia"
              />
            </div>
            <div>
              <label className={labelClass}>Ciudad</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Estado</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) =>
                  setForm((f) => ({ ...f, state: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Branch Legacy Name</label>
              <input
                type="text"
                value={form.branchLegacyName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, branchLegacyName: e.target.value }))
                }
                className={inputClass}
                placeholder='Ej. "Sucursal" o "Instagram" — para mapear pedidos históricos'
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ingresa el valor exacto del campo{" "}
                <code className="bg-muted px-1 rounded">branch</code> que usan
                los pedidos históricos para esta tienda.
              </p>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {loading
                ? "Guardando..."
                : isEdit
                  ? "Guardar Cambios"
                  : "Crear Sucursal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
