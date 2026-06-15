"use client";
import { useEffect, useState, useCallback } from "react";
import {
  MdAttachMoney,
  MdShoppingCart,
  MdPeople,
  MdInventory,
  MdDownload,
  MdFilterList,
  MdPrint,
  MdOutlineReceipt,
  MdPercent,
  MdEmail,
  MdSend,
  MdCheckCircle,
} from "react-icons/md";

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab =
  | "ventas"
  | "finanzas"
  | "inventario"
  | "nomina"
  | "gastos"
  | "impuestos"
  | "enviar";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "ventas", label: "Ventas", icon: <MdShoppingCart size={16} /> },
  { id: "finanzas", label: "Finanzas", icon: <MdAttachMoney size={16} /> },
  { id: "inventario", label: "Inventario", icon: <MdInventory size={16} /> },
  { id: "nomina", label: "Nómina", icon: <MdPeople size={16} /> },
  { id: "gastos", label: "Gastos", icon: <MdOutlineReceipt size={16} /> },
  { id: "impuestos", label: "Impuestos (IVA)", icon: <MdPercent size={16} /> },
  { id: "enviar", label: "Enviar Reporte", icon: <MdEmail size={16} /> },
];

const CAT_LABELS: Record<string, string> = {
  renta: "Renta",
  servicios: "Servicios",
  nomina: "Nómina",
  inventario: "Inventario",
  marketing: "Marketing",
  equipamiento: "Equipamiento",
  transporte: "Transporte",
  impuestos: "Impuestos",
  otros: "Otros",
};

const WO_STATUS: Record<string, string> = {
  completed: "Completada",
  pending: "Pendiente",
  approved: "Aprobada",
  in_transit: "En tránsito",
  cancelled: "Cancelada",
  draft: "Borrador",
};

const STATUS_COLOR: Record<string, string> = {
  Pagado: "text-green-600",
  Entregado: "text-green-700",
  Enviado: "text-blue-600",
  Procesando: "text-amber-600",
  Apartado: "text-orange-500",
  Pendiente: "text-gray-500",
  Cancelado: "text-red-500",
};

const fmt = (n: number) =>
  "$" + Number(n ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 });

const today = () => new Date().toISOString().split("T")[0];
const firstYear = () => `${new Date().getFullYear()}-01-01`;

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ReportesClient() {
  const [tab, setTab] = useState<Tab>("ventas");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<any[]>([]);

  const [from, setFrom] = useState(firstYear());
  const [to, setTo] = useState(today());
  const [storeId, setStoreId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ from, to, section: "all" });
    if (storeId) params.set("storeId", storeId);
    try {
      const res = await fetch(`/api/reports/full?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [from, to, storeId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((d) => setStores(Array.isArray(d) ? d : (d?.stores ?? [])))
      .catch(() => {});
  }, []);

  /* ── CSV export ─────────────────────────────────────────────────────────── */
  function exportCSV() {
    if (!data) return;
    const rows: (string | number)[][] = [];

    if (tab === "ventas" && data.ventas) {
      rows.push(["Tendencia Mensual"]);
      rows.push(["Año", "Mes", "Ingresos", "Pedidos"]);
      data.ventas.monthlyTrend.forEach((r: any) =>
        rows.push([r._id.year, r._id.month, r.revenue, r.orders]),
      );
      rows.push([]);
      rows.push(["Top Productos"]);
      rows.push(["Producto", "Unidades", "Ingresos"]);
      data.ventas.topProducts.forEach((p: any) =>
        rows.push([p.name, p.totalQty, p.totalRevenue]),
      );
    } else if (tab === "finanzas" && data.finanzas) {
      rows.push(["Gastos por Categoría"]);
      rows.push(["Categoría", "Registros", "Total"]);
      data.finanzas.expByCategory.forEach((r: any) =>
        rows.push([CAT_LABELS[r._id] ?? r._id, r.count, r.total]),
      );
      rows.push([]);
      rows.push(["Nómina por Empleado"]);
      rows.push(["Empleado", "Períodos", "Pagados", "Neto"]);
      data.finanzas.payByEmployee.forEach((r: any) =>
        rows.push([r._id, r.periods, r.paid, r.total]),
      );
    } else if (tab === "inventario" && data.inventario) {
      rows.push([
        "#",
        "Sucursal",
        "Estado",
        "Unidades",
        "Costo Total",
        "Fecha",
      ]);
      data.inventario.purchaseSummary.forEach((r: any) =>
        rows.push([
          r.workOrderNumber,
          r.store,
          WO_STATUS[r.status] ?? r.status,
          r.totalUnits,
          r.totalCost,
          new Date(r.createdAt).toLocaleDateString("es-MX"),
        ]),
      );
    } else if (tab === "nomina" && data.nomina) {
      rows.push([
        "Empleado",
        "Inicio",
        "Fin",
        "Base",
        "Bonos",
        "Deds.",
        "Neto",
        "Pagado",
      ]);
      data.nomina.entries.forEach((e: any) =>
        rows.push([
          e.employeeName,
          new Date(e.periodStart).toLocaleDateString("es-MX"),
          new Date(e.periodEnd).toLocaleDateString("es-MX"),
          e.baseSalary,
          e.bonuses,
          e.deductions,
          e.netAmount,
          e.isPaid ? "Sí" : "No",
        ]),
      );
    } else if (tab === "gastos" && data.gastos) {
      rows.push(["Fecha", "Categoría", "Descripción", "Sucursal", "Monto"]);
      data.gastos.expenseList.forEach((e: any) =>
        rows.push([
          new Date(e.date).toLocaleDateString("es-MX"),
          CAT_LABELS[e.category] ?? e.category,
          `"${e.description}"`,
          e.storeName,
          e.amount,
        ]),
      );
    } else if (tab === "impuestos" && data.impuestos) {
      rows.push([
        "Pedido",
        "Cliente",
        "Sucursal",
        "Fecha",
        "Total",
        "IVA (16%)",
      ]);
      data.impuestos.ivaOrders.forEach((o: any) =>
        rows.push([
          o.orderId,
          `"${o.customerName ?? ""}"`,
          o.branch ?? "WWW",
          new Date(o.createdAt).toLocaleDateString("es-MX"),
          o.paymentInfo?.amountPaid ?? 0,
          o.paymentInfo?.taxPaid ?? 0,
        ]),
      );
    }

    const csv = rows.map((r) => r.map(String).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${tab}-${from}-${to}.csv`;
    a.click();
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 no-print">
        <h1 className="text-2xl font-bold font-EB_Garamond">Reportes</h1>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            disabled={!data || loading}
            className="flex items-center gap-2 border px-4 py-1.5 rounded-lg text-sm
                       hover:bg-muted transition disabled:opacity-40"
          >
            <MdPrint size={16} /> Imprimir PDF
          </button>
          <button
            onClick={exportCSV}
            disabled={!data || loading}
            className="flex items-center gap-2 border px-4 py-1.5 rounded-lg text-sm
                       hover:bg-muted transition disabled:opacity-40"
          >
            <MdDownload size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Print header — only visible when printing */}
      <div className="print-only mb-6">
        <h1 className="text-2xl font-bold">
          Reporte — {TABS.find((t) => t.id === tab)?.label}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Período: {from} al {to}
          {storeId
            ? ` · Sucursal: ${stores.find((s) => s._id === storeId)?.name ?? storeId}`
            : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="no-print flex flex-wrap gap-3 mb-6 items-end bg-card border border-muted rounded-xl p-4">
        <MdFilterList size={18} className="text-muted-foreground self-center" />
        <Field label="Desde">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background"
          />
        </Field>
        <Field label="Hasta">
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background"
          />
        </Field>
        <Field label="Sucursal">
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background"
          >
            <option value="">Todas</option>
            {stores.map((s: any) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <button
          onClick={load}
          className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground
                     text-sm font-medium hover:opacity-90 transition"
        >
          Aplicar
        </button>
      </div>

      {/* Tabs */}
      <div className="no-print flex gap-1 mb-6 border-b border-muted overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium
              border-b-2 -mb-px whitespace-nowrap transition
              ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "enviar" ? (
        <EnviarTab stores={stores} />
      ) : loading ? (
        <div className="py-16 text-center text-muted-foreground animate-pulse">
          Cargando reporte…
        </div>
      ) : !data ? null : (
        <>
          {tab === "ventas" && <VentasTab data={data.ventas} />}
          {tab === "finanzas" && <FinanzasTab data={data.finanzas} />}
          {tab === "inventario" && <InventarioTab data={data.inventario} />}
          {tab === "nomina" && <NominaTab data={data.nomina} />}
          {tab === "gastos" && <GastosTab data={data.gastos} />}
          {tab === "impuestos" && <ImpuestosTab data={data.impuestos} />}
        </>
      )}
    </div>
  );
}

// ── Ventas ────────────────────────────────────────────────────────────────────
function payMethodLabel(ref: string): string {
  if (!ref) return "—";
  if (ref === "EFECTIVO") return "Efectivo";
  if (ref.startsWith("MIXTO")) return "Mixto";
  if (ref === "POS" || ref === "POS-OFFLINE") return "POS";
  return "Terminal";
}

function VentasTab({ data }: { data: any }) {
  const [showDetail, setShowDetail] = useState(false);
  if (!data) return null;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Kpi
          label="Ingresos Totales"
          value={fmt(data.totalRevenue)}
          color="text-green-600"
        />
        <Kpi
          label="💵 Efectivo"
          value={fmt(data.revenueEfectivo ?? 0)}
          color="text-sky-600"
        />
        <Kpi
          label="💳 Terminal"
          value={fmt(data.revenueTerminal ?? 0)}
          color="text-violet-600"
        />
        <Kpi label="Pedidos" value={data.totalOrders} />
        <Kpi label="Artículos" value={data.totalItems} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Section title="Por Método de Pago">
          <Table
            cols={["Método", "Pedidos", "Total"]}
            rows={(data.byPayMethod ?? []).map((r: any) => [
              r._id,
              r.count,
              fmt(r.total),
            ])}
          />
        </Section>
        <Section title="Por Estado">
          <Table
            cols={["Estado", "Pedidos", "Total"]}
            rows={data.byStatus.map((r: any) => [
              <span key={r._id} className={STATUS_COLOR[r._id] ?? ""}>
                {r._id}
              </span>,
              r.count,
              fmt(r.total),
            ])}
          />
        </Section>
        <Section title="Por Sucursal / Canal">
          <Table
            cols={["Sucursal", "Pedidos", "Total"]}
            rows={data.byBranch.map((r: any) => [
              r._id || "WWW",
              r.count,
              fmt(r.total),
            ])}
          />
        </Section>
      </div>

      <Section title="Top 10 Productos">
        <Table
          cols={["Producto", "Unidades", "Ingresos"]}
          rows={data.topProducts.map((p: any) => [
            p.name,
            p.totalQty,
            fmt(p.totalRevenue),
          ])}
        />
      </Section>

      <Section title="Tendencia Mensual">
        <Table
          cols={["Año", "Mes", "Ingresos", "Pedidos"]}
          rows={data.monthlyTrend.map((r: any) => [
            r._id.year,
            r._id.month,
            fmt(r.revenue),
            r.orders,
          ])}
        />
      </Section>

      {/* Detailed orders toggle */}
      {Array.isArray(data.orderList) && (
        <div>
          <button
            onClick={() => setShowDetail((v) => !v)}
            className="flex bg-orange-500 items-center gap-2 text-sm font-medium border border-muted rounded-lg px-4 py-2 hover:bg-muted transition mb-4"
          >
            <MdOutlineReceipt size={16} />
            {showDetail
              ? "Ocultar detalle de pedidos"
              : `Ver detalle de pedidos (${data.orderList.length})`}
          </button>

          {showDetail && (
            <Section title={`Detalle de Pedidos (${data.orderList.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                    <tr>
                      {[
                        "# Pedido",
                        "Cliente",
                        "Sucursal",
                        "Fecha",
                        "Método",
                        "Total",
                        "Estado",
                      ].map((h) => (
                        <th key={h} className="px-4 py-2 text-left">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.orderList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          Sin pedidos
                        </td>
                      </tr>
                    ) : (
                      data.orderList.map((o: any) => {
                        const isCancelled = o.orderStatus === "Cancelado";
                        return (
                          <tr
                            key={o._id}
                            className={`border-t border-muted hover:bg-muted/20 ${isCancelled ? "opacity-50" : ""}`}
                          >
                            <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                              #{o.orderId}
                            </td>
                            <td className="px-4 py-2.5 truncate max-w-[140px]">
                              {o.customerName || "—"}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">
                              {o.branch || "WWW"}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(o.createdAt).toLocaleDateString(
                                "es-MX",
                              )}{" "}
                              {new Date(o.createdAt).toLocaleTimeString(
                                "es-MX",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-xs">
                              {payMethodLabel(o.paymentInfo?.id ?? "")}
                            </td>
                            <td
                              className={`px-4 py-2.5 font-semibold ${
                                isCancelled
                                  ? "line-through text-muted-foreground"
                                  : "text-green-700 dark:text-green-400"
                              }`}
                            >
                              {fmt(o.paymentInfo?.amountPaid ?? 0)}
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full bg-muted ${STATUS_COLOR[o.orderStatus] ?? "text-muted-foreground"}`}
                              >
                                {o.orderStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot className="bg-muted/30 font-bold text-sm border-t-2 border-muted">
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-3 text-right text-xs text-muted-foreground"
                      >
                        TOTAL (activos)
                      </td>
                      <td className="px-4 py-3 text-green-700 dark:text-green-400">
                        {fmt(
                          data.orderList
                            .filter((o: any) => o.orderStatus !== "Cancelado")
                            .reduce(
                              (s: number, o: any) =>
                                s + (o.paymentInfo?.amountPaid ?? 0),
                              0,
                            ),
                        )}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

// ── Finanzas ──────────────────────────────────────────────────────────────────
function FinanzasTab({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="Total Gastos"
          value={fmt(data.totalExpenses)}
          color="text-red-500"
        />
        <Kpi
          label="Nómina"
          value={fmt(data.totalPayroll)}
          color="text-amber-600"
        />
        <Kpi
          label="Costo de Venta"
          value={fmt(data.totalCOGS)}
          color="text-purple-600"
        />
        <Kpi
          label="Margen Neto"
          value={fmt(data.netMargin)}
          color={data.netMargin >= 0 ? "text-green-600" : "text-red-600"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Section title="Gastos por Categoría">
          <Table
            cols={["Categoría", "Registros", "Total"]}
            rows={data.expByCategory.map((r: any) => [
              CAT_LABELS[r._id] ?? r._id,
              r.count,
              fmt(r.total),
            ])}
          />
        </Section>
        <Section title="Nómina por Empleado">
          <Table
            cols={["Empleado", "Períodos", "Pagados", "Neto"]}
            rows={data.payByEmployee.map((r: any) => [
              r._id,
              r.periods,
              r.paid,
              fmt(r.total),
            ])}
          />
        </Section>
      </div>
    </div>
  );
}

// ── Inventario ────────────────────────────────────────────────────────────────
function InventarioTab({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-8">
      <Section title="Inventario por Sucursal">
        <Table
          cols={["Sucursal", "Variaciones", "Unidades", "Stock Bajo"]}
          rows={data.inventoryByStore.map((r: any) => [
            r.storeName,
            r.totalItems,
            r.totalQty,
            <span
              key={r._id}
              className={r.lowStock > 0 ? "text-red-500 font-semibold" : ""}
            >
              {r.lowStock}
            </span>,
          ])}
        />
      </Section>

      <Section title="Resumen de Órdenes de Trabajo">
        <Table
          cols={["Tipo", "Estado", "Cantidad"]}
          rows={data.woSummary.map((r: any) => [
            r._id.type,
            WO_STATUS[r._id.status] ?? r._id.status,
            r.count,
          ])}
        />
      </Section>

      <Section title="Órdenes de Compra (Receive)">
        <Table
          cols={["#", "Sucursal", "Estado", "Unidades", "Costo Total", "Fecha"]}
          rows={data.purchaseSummary.map((r: any) => [
            r.workOrderNumber,
            r.store,
            <span
              key={r.workOrderNumber}
              className={
                r.status === "completed"
                  ? "text-green-600"
                  : r.status === "cancelled"
                    ? "text-red-500"
                    : "text-amber-600"
              }
            >
              {WO_STATUS[r.status] ?? r.status}
            </span>,
            r.totalUnits,
            fmt(r.totalCost),
            new Date(r.createdAt).toLocaleDateString("es-MX"),
          ])}
        />
      </Section>
    </div>
  );
}

// ── Nómina ────────────────────────────────────────────────────────────────────
function NominaTab({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Entradas" value={data.count} />
        <Kpi
          label="Neto Total"
          value={fmt(data.totalNet)}
          color="text-amber-600"
        />
        <Kpi
          label="Pagado"
          value={fmt(data.totalPaid)}
          color="text-green-600"
        />
        <Kpi
          label="Pendiente"
          value={fmt(data.totalPending)}
          color="text-red-500"
        />
      </div>

      <Section title="Detalle de Entradas">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
              <tr>
                {[
                  "Empleado",
                  "Período",
                  "Base",
                  "Bonos",
                  "Deds.",
                  "Neto",
                  "Estado",
                ].map((h) => (
                  <th key={h} className="px-4 py-2 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Sin entradas
                  </td>
                </tr>
              ) : (
                data.entries.map((e: any) => (
                  <tr
                    key={e._id}
                    className="border-t border-muted hover:bg-muted/20"
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {e.employeeName}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(e.periodStart).toLocaleDateString("es-MX")} –{" "}
                      {new Date(e.periodEnd).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-4 py-2.5">{fmt(e.baseSalary)}</td>
                    <td className="px-4 py-2.5 text-green-600">
                      +{fmt(e.bonuses)}
                    </td>
                    <td className="px-4 py-2.5 text-red-500">
                      −{fmt(e.deductions)}
                    </td>
                    <td className="px-4 py-2.5 font-bold">
                      {fmt(e.netAmount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          e.isPaid
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {e.isPaid ? "Pagado" : "Pendiente"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

// ── Gastos ────────────────────────────────────────────────────────────────────
function GastosTab({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Kpi
          label="Total Gastos"
          value={fmt(data.total)}
          color="text-red-500"
        />
        <Kpi label="Registros" value={data.count} />
        <Kpi
          label="Promedio por registro"
          value={data.count > 0 ? fmt(data.total / data.count) : "—"}
          color="text-amber-600"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Section title="Por Categoría">
          <Table
            cols={["Categoría", "Registros", "Total"]}
            rows={data.expByCategory.map((r: any) => [
              CAT_LABELS[r._id] ?? r._id,
              r.count,
              fmt(r.total),
            ])}
          />
        </Section>

        <Section title="Tendencia Mensual">
          <Table
            cols={["Año", "Mes", "Categoría", "Total"]}
            rows={data.expMonthlyTrend.map((r: any) => [
              r._id.year,
              r._id.month,
              CAT_LABELS[r._id.category] ?? r._id.category,
              fmt(r.total),
            ])}
          />
        </Section>
      </div>

      <Section title="Detalle de Gastos">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
              <tr>
                {["Fecha", "Categoría", "Descripción", "Sucursal", "Monto"].map(
                  (h) => (
                    <th key={h} className="px-4 py-2 text-left">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {data.expenseList.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Sin gastos
                  </td>
                </tr>
              ) : (
                data.expenseList.map((e: any) => (
                  <tr
                    key={e._id}
                    className="border-t border-muted hover:bg-muted/20"
                  >
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(e.date).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {CAT_LABELS[e.category] ?? e.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 max-w-[220px] truncate">
                      {e.description}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {e.storeName}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-red-500">
                      {fmt(e.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

// ── Impuestos ─────────────────────────────────────────────────────────────────
function ImpuestosTab({ data }: { data: any }) {
  if (!data) return null;
  const effectiveRate =
    data.totalRevenue > 0
      ? ((data.totalIVA / data.totalRevenue) * 100).toFixed(2)
      : "0.00";
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="IVA Total Recaudado"
          value={fmt(data.totalIVA)}
          color="text-blue-600"
        />
        <Kpi
          label="Ingresos Base"
          value={fmt(data.totalRevenue)}
          color="text-green-600"
        />
        <Kpi label="Pedidos con IVA" value={data.count} />
        <Kpi
          label="Tasa Efectiva"
          value={`${effectiveRate}%`}
          color="text-indigo-600"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Section title="IVA por Mes">
          <Table
            cols={["Año", "Mes", "Pedidos", "Ingresos", "IVA (16%)"]}
            rows={data.ivaByMonth.map((r: any) => [
              r._id.year,
              r._id.month,
              r.count,
              fmt(r.totalRevenue),
              fmt(r.totalIVA),
            ])}
          />
        </Section>

        <Section title="IVA por Sucursal / Canal">
          <Table
            cols={["Sucursal", "Pedidos", "Ingresos", "IVA (16%)"]}
            rows={data.ivaByBranch.map((r: any) => [
              r._id || "WWW",
              r.count,
              fmt(r.totalRevenue),
              fmt(r.totalIVA),
            ])}
          />
        </Section>
      </div>

      <Section title="Detalle de Pedidos">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
              <tr>
                {[
                  "# Pedido",
                  "Cliente",
                  "Sucursal",
                  "Fecha",
                  "Estado",
                  "Total",
                  "IVA (16%)",
                ].map((h) => (
                  <th key={h} className="px-4 py-2 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.ivaOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Sin pedidos con IVA registrado
                  </td>
                </tr>
              ) : (
                data.ivaOrders.map((o: any) => (
                  <tr
                    key={o._id}
                    className="border-t border-muted hover:bg-muted/20"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {o.orderId}
                    </td>
                    <td className="px-4 py-2.5 truncate max-w-[140px]">
                      {o.customerName ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {o.branch ?? "WWW"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          STATUS_COLOR[o.orderStatus] ? "bg-muted" : "bg-muted"
                        } ${STATUS_COLOR[o.orderStatus] ?? "text-muted-foreground"}`}
                      >
                        {o.orderStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium">
                      {fmt(o.paymentInfo?.amountPaid ?? 0)}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-blue-600">
                      {fmt(o.paymentInfo?.taxPaid ?? 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

// ── Enviar Reporte ────────────────────────────────────────────────────────────
function EnviarTab({ stores }: { stores: any[] }) {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  const allSelected = selectedBranches.length === 0;

  const toggleBranch = (id: string) => {
    setSelectedBranches((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  };

  const handleSend = async () => {
    setResult(null);
    const recipients = recipientInput
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    if (recipients.length === 0) {
      setResult({
        ok: false,
        msg: "Ingresa al menos un correo electrónico válido.",
      });
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/reports/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          branches: selectedBranches,
          recipients,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResult({ ok: false, msg: json.error ?? "Error al enviar." });
      } else {
        setResult({
          ok: true,
          msg: `Reporte enviado a ${json.recipients.join(", ")} · Período: ${json.dateLabel}`,
        });
      }
    } catch {
      setResult({ ok: false, msg: "Error de red. Intenta de nuevo." });
    } finally {
      setSending(false);
    }
  };

  const PERIOD_OPTIONS = [
    { value: "daily", label: "📅 Diario (hoy)" },
    { value: "weekly", label: "📆 Semanal (esta semana)" },
    { value: "monthly", label: "🗓️ Mensual (este mes)" },
  ] as const;

  return (
    <div className="max-w-xl space-y-6">
      <div className="bg-card border border-muted rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <MdEmail size={22} className="text-primary" />
          <h2 className="font-bold text-lg">Enviar Reporte por Email</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Genera y envía un resumen con ventas, gastos, IVA, nómina e
          inventario.
        </p>

        {/* Period */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Período del reporte
          </label>
          <div className="flex gap-2 flex-wrap">
            {PERIOD_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setPeriod(o.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                  period === o.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-foreground hover:bg-muted"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Branch filter */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Sucursales a incluir
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              (ninguna seleccionada = todas)
            </span>
          </label>
          {stores.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No hay sucursales registradas.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stores.map((s: any) => {
                const selected = selectedBranches.includes(s._id);
                return (
                  <button
                    key={s._id}
                    onClick={() => toggleBranch(s._id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
              {selectedBranches.length > 0 && (
                <button
                  onClick={() => setSelectedBranches([])}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-muted-foreground text-muted-foreground hover:bg-muted transition"
                >
                  Seleccionar todas
                </button>
              )}
            </div>
          )}
          {allSelected && (
            <p className="text-xs text-muted-foreground mt-1.5">
              ✓ Se incluirán todas las sucursales
            </p>
          )}
        </div>

        {/* Recipients */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Destinatarios
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              (separados por coma, punto y coma o nueva línea)
            </span>
          </label>
          <textarea
            rows={3}
            value={recipientInput}
            onChange={(e) => setRecipientInput(e.target.value)}
            placeholder="correo1@empresa.com, correo2@empresa.com"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Result feedback */}
        {result && (
          <div
            className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
              result.ok
                ? "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300"
                : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
            }`}
          >
            {result.ok ? (
              <MdCheckCircle size={18} className="shrink-0 mt-0.5" />
            ) : null}
            <span>{result.msg}</span>
          </div>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Enviando…
            </>
          ) : (
            <>
              <MdSend size={16} /> Enviar Reporte
            </>
          )}
        </button>
      </div>

      {/* Info box */}
      <div className="bg-muted/40 border border-muted rounded-xl p-4 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">
          El reporte siempre incluye:
        </p>
        <ul className="list-disc list-inside space-y-0.5 mt-1">
          <li>Ventas totales y número de pedidos</li>
          <li>IVA recaudado (16%)</li>
          <li>Desglose de ventas por sucursal / canal con total general</li>
        </ul>
        <p className="font-medium text-foreground mt-3">
          Solo en reporte mensual:
        </p>
        <ul className="list-disc list-inside space-y-0.5 mt-1">
          <li>Gastos operativos por categoría</li>
          <li>Nómina del período (neto, pagado, pendiente)</li>
          <li>Costo total del inventario actual</li>
          <li>Resultado neto del período</li>
        </ul>
      </div>
    </div>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────
function Kpi({
  label,
  value,
  color = "text-foreground",
}: {
  label: string;
  value: any;
  color?: string;
}) {
  return (
    <div className="bg-card border border-muted rounded-xl p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {title}
      </h2>
      <div className="border border-muted rounded-xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Table({ cols, rows }: { cols: string[]; rows: any[][] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
        <tr>
          {cols.map((c) => (
            <th key={c} className="px-4 py-2 text-left">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={cols.length}
              className="px-4 py-8 text-center text-muted-foreground"
            >
              Sin datos
            </td>
          </tr>
        ) : (
          rows.map((row, i) => (
            <tr key={i} className="border-t border-muted hover:bg-muted/20">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
