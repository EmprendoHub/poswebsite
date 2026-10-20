"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
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
  MdClose,
  MdQrCodeScanner,
} from "react-icons/md";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import BarcodeScannerModal from "@/components/modals/BarcodeScannerModal";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = "ventas" | "finanzas" | "inventario" | "productos" | "enviar";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "ventas", label: "Ventas", icon: <MdShoppingCart size={16} /> },
  { id: "finanzas", label: "Finanzas", icon: <MdAttachMoney size={16} /> },
  { id: "inventario", label: "Inventario", icon: <MdInventory size={16} /> },
  { id: "productos", label: "Productos", icon: <MdInventory size={16} /> },
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
const firstMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ReportesClient() {
  const [tab, setTab] = useState<Tab>("ventas");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<any[]>([]);

  const [from, setFrom] = useState(firstMonth());
  const [to, setTo] = useState(today());
  const [storeId, setStoreId] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [gender, setGender] = useState("");
  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [attribute, setAttribute] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [genders, setGenders] = useState<any[]>([]);
  const [mainCategories, setMainCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [topProductsSort, setTopProductsSort] = useState<"qty" | "revenue">("qty");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ from, to, section: "all" });
    if (storeId) params.set("storeId", storeId);
    if (category) params.set("category", category);
    if (brand) params.set("brand", brand);
    if (gender) params.set("gender", gender);
    if (mainCategory) params.set("mainCategory", mainCategory);
    if (subCategory) params.set("subCategory", subCategory);
    if (attribute) params.set("attribute", attribute);

    console.log("🔍 Loading report with params:", {
      from,
      to,
      storeId,
      category,
      brand,
      gender,
      mainCategory,
      subCategory,
      attribute,
      fullUrl: `/api/reports/full?${params}`,
    });

    try {
      const res = await fetch(`/api/reports/full?${params}`);
      const json = await res.json();
      console.log("✅ Report data received:", json);
      setData(json);
    } catch (e) {
      console.error("❌ Error loading report:", e);
    } finally {
      setLoading(false);
    }
  }, [from, to, storeId, category, brand, gender, mainCategory, subCategory, attribute]);

  useEffect(() => {
    load();
  }, [load]);

  // Clear product filters when switching away from ventas tab
  useEffect(() => {
    if (tab !== "ventas") {
      setBrand("");
      setMainCategory("");
      setSubCategory("");
      setAttribute("");
    }
  }, [tab]);

  useEffect(() => {
    Promise.all([
      fetch("/api/stores")
        .then((r) => r.json())
        .then((d) => setStores(Array.isArray(d) ? d : (d?.stores ?? [])))
        .catch(() => {}),
      fetch("/api/product-details?catType=brand")
        .then((r) => r.json())
        .then((d) => setBrands(d.details ?? []))
        .catch(() => {}),
      fetch("/api/categories?kind=main")
        .then((r) => r.json())
        .then((d) => setMainCategories(d?.categories ?? (Array.isArray(d) ? d : [])))
        .catch(() => {}),
      fetch("/api/categories?kind=sub")
        .then((r) => r.json())
        .then((d) => setSubCategories(d?.categories ?? (Array.isArray(d) ? d : [])))
        .catch(() => {}),
      fetch("/api/categories?kind=attribute")
        .then((r) => r.json())
        .then((d) => setAttributes(d?.categories ?? (Array.isArray(d) ? d : [])))
        .catch(() => {}),
    ]);
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
      rows.push(["Ventas por Día"]);
      rows.push(["Año", "Mes", "Día", "Ingresos", "Pedidos"]);
      data.ventas.dailyTrend.forEach((d: any) =>
        rows.push([d._id.year, d._id.month, d._id.day, d.revenue, d.orders]),
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
    <div className="p-2 max-w-6xl">
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
        {/* Product filters - only show on ventas tab */}
        {tab === "ventas" && (
          <>
            <Field label="Certificador">
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm bg-background"
              >
                <option value="">Todas</option>
                {brands.map((b: any) => (
                  <option key={b._id} value={b.catTitle}>
                    {b.catTitle}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Categoría Ppal">
              <select
                value={mainCategory}
                onChange={(e) => {
                  setMainCategory(e.target.value);
                  setSubCategory("");
                }}
                className="border rounded-lg px-3 py-1.5 text-sm bg-background"
              >
                <option value="">Todas</option>
                {mainCategories.map((m: any) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subcategoría">
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm bg-background"
              >
                <option value="">Todas</option>
                {subCategories
                  .filter((s: any) => !mainCategory || s.parent === mainCategory)
                  .map((s: any) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Atributo">
              <select
                value={attribute}
                onChange={(e) => setAttribute(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm bg-background"
              >
                <option value="">Todos</option>
                {attributes.map((a: any) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
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
          {tab === "ventas" && (
            <VentasTab
              data={data.ventas}
              topProductsSort={topProductsSort}
              setTopProductsSort={setTopProductsSort}
            />
          )}
          {tab === "finanzas" && <FinanzasTab data={data} />}
          {tab === "inventario" && <InventarioTab data={data.inventario} />}
          {tab === "productos" && (
            <ProductosTab
              from={from}
              to={to}
              storeId={storeId}
            />
          )}
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

function VentasTab({
  data,
  topProductsSort,
  setTopProductsSort,
}: {
  data: any;
  topProductsSort: "qty" | "revenue";
  setTopProductsSort: (sort: "qty" | "revenue") => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  if (!data) return null;

  // Sort top products based on selected filter
  const sortedTopProducts = [...(data.topProducts || [])].sort((a, b) => {
    if (topProductsSort === "qty") {
      return b.totalQty - a.totalQty;
    } else {
      return b.totalRevenue - a.totalRevenue;
    }
  });
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* <Section title="Por Método de Pago">
          <Table
            cols={["Método", "Pedidos", "Total"]}
            rows={(data.byPayMethod ?? []).map((r: any) => [
              r._id,
              r.count,
              fmt(r.total),
            ])}
          />
        </Section> */}
        <Section title="Top 10 Productos">
          <div className="space-y-3">
            <div className="px-4 pt-4">
              <select
                value={topProductsSort}
                onChange={(e) =>
                  setTopProductsSort(e.target.value as "qty" | "revenue")
                }
                className="px-3 py-2 text-sm border border-muted rounded-lg bg-card text-foreground"
              >
                <option value="qty">Ordenar por: Unidades Vendidas</option>
                <option value="revenue">Ordenar por: Mayor Costo (Ingresos)</option>
              </select>
            </div>
            <Table
              cols={["Producto", "Unidades", "Ingresos"]}
              rows={sortedTopProducts.map((p: any) => [
                p.name,
                p.totalQty,
                fmt(p.totalRevenue),
              ])}
            />
          </div>
        </Section>
        <div className="grid md:grid-cols-1 gap-4">
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
      </div>

      <Section title="Tendencia Mensual">
        {data.monthlyTrend && data.monthlyTrend.length > 0 ? (
          <div className="w-full">
            <Line
              data={{
                labels: data.monthlyTrend.map(
                  (m: any) => `${m._id.month}/${m._id.year}`,
                ),
                datasets: [
                  {
                    label: "Ingresos",
                    data: data.monthlyTrend.map((m: any) => m.revenue),
                    borderColor: "#10b981",
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                  },
                  {
                    label: "Pedidos",
                    data: data.monthlyTrend.map((m: any) => m.orders),
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    yAxisID: "y1",
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: { position: "top" },
                },
                scales: {
                  y: {
                    type: "linear",
                    display: true,
                    position: "left",
                    title: { display: true, text: "Ingresos ($)" },
                  },
                  y1: {
                    type: "linear",
                    display: true,
                    position: "right",
                    title: { display: true, text: "Pedidos" },
                    grid: { drawOnChartArea: false },
                  },
                },
              }}
            />
          </div>
        ) : (
          <p className="text-muted-foreground">No hay datos disponibles</p>
        )}
      </Section>

      <Section title="Ventas por Día">
        {data.dailyTrend && data.dailyTrend.length > 0 ? (
          <div className="w-full">
            <Bar
              data={{
                labels: data.dailyTrend.map(
                  (d: any) =>
                    `${d._id.day}/${d._id.month}/${d._id.year.toString().slice(-2)}`,
                ),
                datasets: [
                  {
                    label: "Ingresos",
                    data: data.dailyTrend.map((d: any) => d.revenue),
                    backgroundColor: "rgba(16, 185, 129, 0.6)",
                    borderColor: "#10b981",
                    borderWidth: 1,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: { position: "top" },
                },
                scales: {
                  y: {
                    title: { display: true, text: "Ingresos ($)" },
                  },
                },
              }}
            />
          </div>
        ) : (
          <p className="text-muted-foreground">No hay datos disponibles</p>
        )}
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
  if (!data.finanzas || !data.gastos || !data.nomina || !data.impuestos)
    return null;

  const fin = data.finanzas;
  const gas = data.gastos;
  const nom = data.nomina;
  const imp = data.impuestos;

  console.log("🏦 FinanzasTab received data:");
  console.log("  - fin:", fin);
  console.log("  - fin.totalRevForMargin:", fin.totalRevForMargin);
  console.log("  - fin.totalExpenses:", fin.totalExpenses);
  console.log("  - fin.totalPayroll:", fin.totalPayroll);
  console.log("  - fin.totalCOGS:", fin.totalCOGS);
  console.log("  - imp.totalIVA:", imp.totalIVA);

  const totalOperatingCosts =
    fin.totalExpenses + fin.totalPayroll + fin.totalCOGS;
  const grossProfit = fin.totalRevForMargin - fin.totalCOGS;
  const operatingIncome = fin.totalRevForMargin - totalOperatingCosts;
  // Net profit after deducting IVA
  const netProfitAfterTax =
    fin.totalRevForMargin -
    fin.totalCOGS -
    fin.totalExpenses -
    fin.totalPayroll -
    imp.totalIVA;
  const netMarginPercent =
    fin.totalRevForMargin > 0
      ? ((netProfitAfterTax / fin.totalRevForMargin) * 100).toFixed(2)
      : "0.00";

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Income Statement Summary */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Estado de Resultados Resumido
          </h2>
          <div className="bg-card border border-muted rounded-xl p-6 space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-muted">
              <span className="text-sm font-medium">Ingresos Totales</span>
              <span className="text-lg font-bold text-green-600">
                {fmt(fin.totalRevForMargin)}
              </span>
            </div>

            <div className="pl-4 space-y-2 pb-3 border-b border-muted">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Costo de Ventas</span>
                <span className="text-red-400">−{fmt(fin.totalCOGS)}</span>
              </div>
              <div className="flex justify-between items-center font-semibold text-sm">
                <span>Utilidad Bruta</span>
                <span className="text-blue-500">{fmt(grossProfit)}</span>
              </div>
            </div>

            <div className="pl-4 space-y-2 pb-3 border-b border-muted">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Gastos Operativos</span>
                <span className="text-red-400">−{fmt(fin.totalExpenses)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Nómina/Salarios</span>
                <span className="text-red-400">−{fmt(fin.totalPayroll)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Iva Recaudado</span>
                <span className="text-red-400">−{fmt(imp.totalIVA)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-semibold">Utilidad Neta</span>
              <span
                className={`text-xl font-bold ${netProfitAfterTax >= 0 ? "text-green-600" : "text-red-400"}`}
              >
                {fmt(netProfitAfterTax)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Margen Neto (%)</span>
              <span
                className={
                  netProfitAfterTax >= 0 ? "text-green-600" : "text-red-400"
                }
              >
                {netMarginPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Expenses & Payroll Details */}
        <div className="grid md:grid-cols-1 gap-6">
          {/* <Section title="Gastos por Categoría">
          <Table
            cols={["Categoría", "Registros", "Total"]}
            rows={gas.expByCategory.map((r: any) => [
              CAT_LABELS[r._id] ?? r._id,
              r.count,
              fmt(r.total),
            ])}
          />
        </Section> */}

          <Section title="Nómina por Empleado">
            <Table
              cols={["Empleado", "Períodos", "Pagados", "Neto"]}
              rows={nom.entries
                .slice(0, 10)
                .map((e: any) => [
                  e.employeeName,
                  1,
                  e.isPaid ? "✓" : "−",
                  fmt(e.netAmount),
                ])}
            />
          </Section>
          {/* 
        <Section title="IVA por Mes">
          <Table
            cols={["Año", "Mes", "Pedidos", "IVA"]}
            rows={imp.ivaByMonth.map((r: any) => [
              r._id.year,
              r._id.month,
              r.count,
              fmt(r.totalIVA),
            ])}
          />
        </Section> */}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Payroll Summary */}
        <Section title="Resumen Nómina">
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 p-3 rounded">
                <p className="text-xs text-muted-foreground mb-1">Entradas</p>
                <p className="text-lg font-bold">{nom.count}</p>
              </div>
              <div className="bg-muted/50 p-3 rounded">
                <p className="text-xs text-muted-foreground mb-1">Neto Total</p>
                <p className="text-lg font-bold text-amber-600">
                  {fmt(nom.totalNet)}
                </p>
              </div>
              <div className="bg-muted/50 p-3 rounded">
                <p className="text-xs text-muted-foreground mb-1">Pagado</p>
                <p className="text-lg font-bold text-green-600">
                  {fmt(nom.totalPaid)}
                </p>
              </div>
              <div className="bg-muted/50 p-3 rounded">
                <p className="text-xs text-muted-foreground mb-1">Pendiente</p>
                <p className="text-lg font-bold text-red-500">
                  {fmt(nom.totalPending)}
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Tax Summary */}
        <Section title="Resumen de Impuestos (IVA)">
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 p-3 rounded">
                <p className="text-xs text-muted-foreground mb-1">
                  IVA Recaudado
                </p>
                <p className="text-lg font-bold text-blue-600">
                  {fmt(imp.totalIVA)}
                </p>
              </div>
              <div className="bg-muted/50 p-3 rounded">
                <p className="text-xs text-muted-foreground mb-1">
                  Ingresos Base
                </p>
                <p className="text-lg font-bold text-green-600">
                  {fmt(imp.totalRevenue)}
                </p>
              </div>
              <div className="bg-muted/50 p-3 rounded">
                <p className="text-xs text-muted-foreground mb-1">
                  Pedidos c/ IVA
                </p>
                <p className="text-lg font-bold">{imp.count}</p>
              </div>
              <div className="bg-muted/50 p-3 rounded">
                <p className="text-xs text-muted-foreground mb-1">
                  Tasa Efectiva
                </p>
                <p className="text-lg font-bold text-indigo-600">
                  {imp.totalRevenue > 0
                    ? ((imp.totalIVA / imp.totalRevenue) * 100).toFixed(2)
                    : "0.00"}
                  %
                </p>
              </div>
            </div>
          </div>
        </Section>
      </div>
      {/* Detailed Expense List */}
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
              {gas.expenseList.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Sin gastos
                  </td>
                </tr>
              ) : (
                gas.expenseList.slice(0, 20).map((e: any) => (
                  <tr
                    key={e._id}
                    className="border-t border-muted hover:bg-muted/20"
                  >
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(e.date).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-black">
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

// ── Productos ────────────────────────────────────────────────────────────────────
function ProductosTab({
  from,
  to,
  storeId,
}: {
  from: string;
  to: string;
  storeId: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Search products
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/reports/search-product?q=${encodeURIComponent(searchQuery)}`,
        );
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (e) {
        console.error("❌ Error searching products:", e);
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  }, [searchQuery]);

  // Load product report when product is selected
  useEffect(() => {
    if (!selectedProduct) {
      setReportData(null);
      return;
    }

    const loadReport = async () => {
      setLoading(true);
      setReportError(null);
      try {
        const params = new URLSearchParams({
          productId: selectedProduct._id,
          from,
          to,
        });
        if (storeId) params.set("storeId", storeId);
        
        console.log("🔍 Loading product report with params:", Object.fromEntries(params));
        
        const res = await fetch(`/api/reports/product-detail?${params}`);
        const data = await res.json();
        
        if (!res.ok) {
          setReportError(data.error || "Error loading report");
          console.error("❌ API Error:", data.error);
          return;
        }
        
        console.log("✅ Report data loaded:", data);
        setReportData(data);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        setReportError(`Error loading report: ${errorMsg}`);
        console.error("❌ Error loading product report:", e);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [selectedProduct, from, to, storeId]);

  const handleScan = (value: string) => {
    setSearchQuery(value);
    setIsScannerOpen(false);
  };

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    setSearchResults([]);
    setSearchQuery("");
  };

  // If no product selected, show search interface
  if (!selectedProduct) {
    return (
      <div className="space-y-6">
        {/* Search Section */}
        <div className="bg-card border border-muted rounded-xl p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Buscar Producto
          </h3>

          <div className="space-y-4">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-5 w-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre o ASIN (ej: Samsung, 196214)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full border-0 py-2.5 pl-10 pr-12 text-foreground ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6 rounded-lg"
              />
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
                title="Escanear código QR/ASIN"
              >
                <MdQrCodeScanner className="h-5 w-5" />
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border border-muted rounded-lg overflow-hidden">
                {searchResults.map((product) => (
                  <button
                    key={product._id}
                    onClick={() => handleSelectProduct(product)}
                    className="w-full text-left px-4 py-3 border-b border-muted hover:bg-muted/50 transition-colors last:border-b-0 flex items-center gap-3"
                  >
                    {product.image && (
                      <Image
                        src={product.image}
                        alt={product.title}
                        width={40}
                        height={40}
                        className="object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {product.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.ASIN || product.sku}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && !searchLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No se encontraron productos
              </p>
            )}

            {searchLoading && (
              <p className="text-sm text-muted-foreground text-center py-4 animate-pulse">
                Buscando...
              </p>
            )}
          </div>
        </div>

        {isScannerOpen && (
          <BarcodeScannerModal
            onScan={handleScan}
            onClose={() => setIsScannerOpen(false)}
          />
        )}
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="py-16 text-center text-muted-foreground animate-pulse">
        Cargando reporte del producto…
      </div>
    );
  }

  // Error state
  if (reportError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-800 font-medium">Error al cargar el reporte:</p>
        <p className="text-red-700 text-sm mt-2">{reportError}</p>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  const { product, sales, orders, dailyTrend } = reportData;

  return (
    <div className="space-y-8">
      {/* Product Header */}
      <div className="bg-card border border-muted rounded-xl p-6">
        <div className="flex items-start gap-6">
          {product.image && (
            <Image
              src={product.image}
              alt={product.name}
              width={128}
              height={128}
              className="object-cover rounded-lg"
            />
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {product.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {product.brand && `Marca: ${product.brand}`}
                </p>
                <div className="mt-3 space-y-1 text-sm">
                  {product.sku && (
                    <p>
                      <span className="text-muted-foreground">SKU:</span>{" "}
                      <span className="font-mono">{product.sku}</span>
                    </p>
                  )}
                  {product.asin && (
                    <p>
                      <span className="text-muted-foreground">ASIN:</span>{" "}
                      <span className="font-mono">{product.asin}</span>
                    </p>
                  )}
                  {product.category && (
                    <p>
                      <span className="text-muted-foreground">Categoría:</span>{" "}
                      {product.category}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setSearchQuery("");
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <MdClose className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Kpi
          label="Unidades Vendidas"
          value={sales?.totalUnits || 0}
          color="text-purple-600"
        />
        <Kpi
          label="Número de Pedidos"
          value={sales?.totalOrders || 0}
          color="text-blue-600"
        />
        <Kpi
          label="Ingresos Totales"
          value={fmt(sales?.totalRevenue || 0)}
          color="text-green-600"
        />
        <Kpi
          label="Costo Total"
          value={fmt(sales?.totalCost || 0)}
          color="text-orange-600"
        />
        <Kpi
          label="Ganancia Neta"
          value={fmt(sales?.profit || 0)}
          color={
            (sales?.profit || 0) >= 0 ? "text-green-600" : "text-red-600"
          }
        />
      </div>

      {/* Pricing & Margin Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Precio Promedio" value={fmt(sales?.avgPrice || 0)} />
        <Kpi label="Precio Mínimo" value={fmt(sales?.minPrice || 0)} />
        <Kpi label="Precio Máximo" value={fmt(sales?.maxPrice || 0)} />
        <Kpi
          label="Margen de Ganancia"
          value={`${(sales?.profitMargin || 0).toFixed(2)}%`}
          color={
            (sales?.profitMargin || 0) >= 0
              ? "text-green-600"
              : "text-red-600"
          }
        />
      </div>

      {/* Orders Table */}
      {orders && orders.length > 0 && (
        <Section title={`Pedidos que incluyen este producto (${orders.length})`}>
          <Table
            cols={[
              "Número de Pedido",
              "Fecha",
              "Cantidad",
              "Precio Unitario",
              "Total",
              "Estado",
              "Método Pago",
            ]}
            rows={(orders || []).map((order: any) => {
              const item = order.orderItems?.[0];
              return [
                order.orderNumber || "—",
                new Date(order.createdAt).toLocaleDateString("es-MX"),
                item?.quantity || 0,
                fmt(item?.price || 0),
                fmt((item?.quantity || 0) * (item?.price || 0)),
                order.orderStatus || "—",
                order.paymentMethod || "—",
              ];
            })}
          />
        </Section>
      )}

      {orders?.length === 0 && (
        <div className="bg-muted/20 border border-muted rounded-xl p-8 text-center">
          <p className="text-muted-foreground">
            No hay pedidos para este producto en el rango de fechas seleccionado
          </p>
        </div>
      )}
    </div>
  );
}
