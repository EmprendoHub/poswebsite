"use client";
import { useEffect, useState, useCallback } from "react";
import { MdAdd, MdDelete, MdFilterList } from "react-icons/md";

const CATEGORIES = [
  { value: "", label: "Todas las categorías" },
  { value: "renta", label: "Renta" },
  { value: "servicios", label: "Servicios" },
  { value: "nomina", label: "Nómina" },
  { value: "inventario", label: "Inventario" },
  { value: "marketing", label: "Marketing" },
  { value: "equipamiento", label: "Equipamiento" },
  { value: "transporte", label: "Transporte" },
  { value: "impuestos", label: "Impuestos" },
  { value: "otros", label: "Otros" },
];

const EMPTY_FORM = {
  amount: "",
  category: "otros",
  description: "",
  date: new Date().toISOString().split("T")[0],
  store: "",
  receiptUrl: "",
};

export default function GastosPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStore, setFilterStore] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCategory) params.set("category", filterCategory);
    if (filterStore) params.set("storeId", filterStore);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    params.set("page", String(page));
    params.set("limit", String(limit));

    const res = await fetch(`/api/finanzas/expenses?${params.toString()}`);
    const data = await res.json();
    setExpenses(data.expenses ?? []);
    setTotal(data.totalAmount ?? 0);
    setLoading(false);
  }, [filterCategory, filterStore, filterFrom, filterTo, page]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((d) => setStores(Array.isArray(d) ? d : (d.stores ?? [])));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || !form.description) return;
    setSaving(true);
    const body: any = {
      amount: Number(form.amount),
      category: form.category,
      description: form.description,
      date: form.date,
    };
    if (form.store) body.store = form.store;
    if (form.receiptUrl) body.receiptUrl = form.receiptUrl;

    const res = await fetch("/api/finanzas/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchExpenses();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    await fetch(`/api/finanzas/expenses/${id}`, { method: "DELETE" });
    fetchExpenses();
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold font-EB_Garamond">Gastos</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          <MdAdd size={18} /> Nuevo Gasto
        </button>
      </div>

      {/* New expense form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-card border border-muted rounded-xl p-5 mb-6 grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Monto *</label>
            <input
              type="number"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm bg-background"
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Categoría</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm bg-background"
            >
              {CATEGORIES.filter((c) => c.value).map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Fecha</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm bg-background"
            />
          </div>
          <div className="flex flex-col gap-1 col-span-2 md:col-span-3">
            <label className="text-xs text-muted-foreground">
              Descripción *
            </label>
            <input
              required
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="border rounded-lg px-3 py-2 text-sm bg-background"
              placeholder="Detalle del gasto"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Sucursal</label>
            <select
              value={form.store}
              onChange={(e) => setForm({ ...form, store: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm bg-background"
            >
              <option value="">Sin sucursal</option>
              {stores.map((s: any) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">URL Recibo</label>
            <input
              value={form.receiptUrl}
              onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm bg-background"
              placeholder="https://..."
            />
          </div>
          <div className="col-span-2 md:col-span-3 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(EMPTY_FORM);
              }}
              className="px-4 py-2 rounded-lg border text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <MdFilterList size={13} /> Categoría
          </label>
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setPage(1);
            }}
            className="border rounded-lg px-3 py-1.5 text-sm bg-card"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Sucursal</label>
          <select
            value={filterStore}
            onChange={(e) => {
              setFilterStore(e.target.value);
              setPage(1);
            }}
            className="border rounded-lg px-3 py-1.5 text-sm bg-card"
          >
            <option value="">Todas</option>
            {stores.map((s: any) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Desde</label>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => {
              setFilterFrom(e.target.value);
              setPage(1);
            }}
            className="border rounded-lg px-3 py-1.5 text-sm bg-card"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Hasta</label>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => {
              setFilterTo(e.target.value);
              setPage(1);
            }}
            className="border rounded-lg px-3 py-1.5 text-sm bg-card"
          />
        </div>
      </div>

      {/* Total */}
      <div className="text-sm text-muted-foreground mb-3">
        Total filtrado:{" "}
        <span className="font-bold text-foreground">
          ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Table */}
      <div className="border border-muted rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-left">Categoría</th>
              <th className="px-4 py-2 text-left">Descripción</th>
              <th className="px-4 py-2 text-left">Sucursal</th>
              <th className="px-4 py-2 text-right">Monto</th>
              <th className="px-4 py-2 text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground animate-pulse"
                >
                  Cargando...
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Sin gastos registrados
                </td>
              </tr>
            ) : (
              expenses.map((exp: any) => (
                <tr
                  key={exp._id}
                  className="border-t border-muted hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {new Date(exp.date).toLocaleDateString("es-MX")}
                  </td>
                  <td className="px-4 py-2.5 capitalize">{exp.category}</td>
                  <td className="px-4 py-2.5">{exp.description}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {exp.store?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold">
                    $
                    {Number(exp.amount).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => handleDelete(exp._id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <MdDelete size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {expenses.length === limit && (
        <div className="flex justify-end gap-2 mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border text-sm"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
