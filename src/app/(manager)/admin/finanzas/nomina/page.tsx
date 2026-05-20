"use client";
import { useEffect, useState, useCallback } from "react";
import { MdAdd, MdCheckCircle, MdDelete, MdFilterList } from "react-icons/md";

const today = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};
const lastOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];
};

const EMPTY_FORM = {
  employeeName: "",
  periodStart: firstOfMonth(),
  periodEnd: lastOfMonth(),
  baseSalary: "",
  bonuses: "0",
  deductions: "0",
  store: "",
  notes: "",
};

export default function NominaPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [totalNet, setTotalNet] = useState(0);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Filters
  const [filterIsPaid, setFilterIsPaid] = useState<string>("");
  const [filterStore, setFilterStore] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterIsPaid !== "") params.set("isPaid", filterIsPaid);
    if (filterStore) params.set("storeId", filterStore);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    params.set("page", String(page));
    params.set("limit", String(limit));

    const res = await fetch(`/api/finanzas/payroll?${params.toString()}`);
    const data = await res.json();
    setEntries(data.entries ?? []);
    setTotalNet(data.totalNet ?? 0);
    setLoading(false);
  }, [filterIsPaid, filterStore, filterFrom, filterTo, page]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((d) => setStores(Array.isArray(d) ? d : (d.stores ?? [])));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employeeName || !form.baseSalary) return;
    setSaving(true);
    const body: any = {
      employeeName: form.employeeName,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      baseSalary: Number(form.baseSalary),
      bonuses: Number(form.bonuses),
      deductions: Number(form.deductions),
    };
    if (form.store) body.store = form.store;
    if (form.notes) body.notes = form.notes;

    const res = await fetch("/api/finanzas/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchEntries();
    }
    setSaving(false);
  }

  async function handleMarkPaid(id: string) {
    await fetch(`/api/finanzas/payroll/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaid: true }),
    });
    fetchEntries();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta entrada de nómina?")) return;
    await fetch(`/api/finanzas/payroll/${id}`, { method: "DELETE" });
    fetchEntries();
  }

  const netCalc =
    (Number(form.baseSalary) || 0) +
    (Number(form.bonuses) || 0) -
    (Number(form.deductions) || 0);

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold font-EB_Garamond">Nómina</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          <MdAdd size={18} /> Nueva Entrada
        </button>
      </div>

      {/* New entry form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-card border border-muted rounded-xl p-5 mb-6 grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
            <label className="text-xs text-muted-foreground">
              Nombre empleado *
            </label>
            <input
              required
              value={form.employeeName}
              onChange={(e) =>
                setForm({ ...form, employeeName: e.target.value })
              }
              className="border rounded-lg px-3 py-2 text-sm bg-background"
              placeholder="Nombre completo"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              Período inicio
            </label>
            <input
              type="date"
              value={form.periodStart}
              onChange={(e) =>
                setForm({ ...form, periodStart: e.target.value })
              }
              className="border rounded-lg px-3 py-2 text-sm bg-background"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Período fin</label>
            <input
              type="date"
              value={form.periodEnd}
              onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm bg-background"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              Salario base *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={form.baseSalary}
              onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm bg-background"
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Bonos</label>
            <input
              type="number"
              step="0.01"
              value={form.bonuses}
              onChange={(e) => setForm({ ...form, bonuses: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm bg-background"
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Deducciones</label>
            <input
              type="number"
              step="0.01"
              value={form.deductions}
              onChange={(e) => setForm({ ...form, deductions: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm bg-background"
              placeholder="0.00"
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
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs text-muted-foreground">Notas</label>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm bg-background"
              placeholder="Observaciones opcionales"
            />
          </div>

          {/* Net preview */}
          <div className="col-span-2 md:col-span-3 flex items-center justify-between bg-muted/40 rounded-lg px-4 py-2">
            <span className="text-sm text-muted-foreground">Neto a pagar:</span>
            <span className="font-bold text-base">
              ${netCalc.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
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
            <MdFilterList size={13} /> Estado pago
          </label>
          <select
            value={filterIsPaid}
            onChange={(e) => {
              setFilterIsPaid(e.target.value);
              setPage(1);
            }}
            className="border rounded-lg px-3 py-1.5 text-sm bg-card"
          >
            <option value="">Todos</option>
            <option value="false">Pendiente</option>
            <option value="true">Pagado</option>
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
        Total neto filtrado:{" "}
        <span className="font-bold text-foreground">
          ${totalNet.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Table */}
      <div className="border border-muted rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Empleado</th>
              <th className="px-4 py-2 text-left">Período</th>
              <th className="px-4 py-2 text-right">Base</th>
              <th className="px-4 py-2 text-right">Bonos</th>
              <th className="px-4 py-2 text-right">Deds.</th>
              <th className="px-4 py-2 text-right">Neto</th>
              <th className="px-4 py-2 text-center">Estado</th>
              <th className="px-4 py-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground animate-pulse"
                >
                  Cargando...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  Sin entradas de nómina
                </td>
              </tr>
            ) : (
              entries.map((entry: any) => (
                <tr
                  key={entry._id}
                  className="border-t border-muted hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5 font-medium">
                    {entry.employeeName}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {new Date(entry.periodStart).toLocaleDateString("es-MX")} –{" "}
                    {new Date(entry.periodEnd).toLocaleDateString("es-MX")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    $
                    {Number(entry.baseSalary).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-right text-green-600">
                    +$
                    {Number(entry.bonuses).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-right text-red-500">
                    -$
                    {Number(entry.deductions).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold">
                    $
                    {Number(entry.netAmount).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {entry.isPaid ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400">
                        Pagado
                      </span>
                    ) : (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full dark:bg-amber-900/30 dark:text-amber-400">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {!entry.isPaid && (
                        <button
                          onClick={() => handleMarkPaid(entry._id)}
                          className="text-green-500 hover:text-green-700 transition-colors"
                          title="Marcar como pagado"
                        >
                          <MdCheckCircle size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(entry._id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <MdDelete size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {entries.length === limit && (
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
