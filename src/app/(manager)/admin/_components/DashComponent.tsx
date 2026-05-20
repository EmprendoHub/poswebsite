"use client";
import Image from "next/image";
import Link from "next/link";
import {
  MdAttachMoney,
  MdOutlineSavings,
  MdInventory,
  MdTrendingUp,
  MdTrendingDown,
  MdTrendingFlat,
  MdWarning,
  MdWorkOutline,
  MdPeople,
  MdReceiptLong,
  MdStorefront,
  MdArticle,
} from "react-icons/md";
import { IoArrowRedoSharp } from "react-icons/io5";
import { HiOutlineUserGroup, HiDocumentText } from "react-icons/hi";
import { GiClothes } from "react-icons/gi";
import { FaTags } from "react-icons/fa6";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import { ChartOptions } from "chart.js/auto";

interface WeeklyDataItem {
  date: string;
  Total?: number;
}

const fmt = (n: number) =>
  "$" + Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 0 });

function delta(current: number, previous: number) {
  if (!previous) return null;
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return { pct: Math.abs(pct).toFixed(1), up };
}

const DashComponent = ({ data }: { data: any }) => {
  /* ── parse incoming data ──────────────────────────────────────────────── */
  const weeklyData: WeeklyDataItem[] = JSON.parse(data?.weeklyData ?? "[]");
  // Data arrives pre-sorted from MongoDB (YYYY-MM-DD ascending)
  // Format labels for display: "2026-05-11" → "11/05"
  const clients = JSON.parse(data?.clients ?? "[]");
  const products = JSON.parse(data?.products ?? "[]");
  const orders = JSON.parse(data?.orders ?? "[]");
  const posts = JSON.parse(data?.posts ?? "[]");

  const dailyTotal = data?.dailyPaymentsTotals ?? 0;
  const yesterdayTotal = data?.yesterdaysOrdersTotals ?? 0;
  const weeklyTotal = data?.totalPaymentsThisWeek ?? 0;
  const lastWeekTotal = data?.lastWeeksPaymentsTotals ?? 0;
  const monthlyTotal = data?.monthlyOrdersTotals ?? 0;
  const lastMonthTotal = data?.lastMonthsPaymentsTotals ?? 0;
  const yearlyTotal = data?.yearlyOrdersTotals ?? 0;
  const lastYearTotal = data?.lastYearsPaymentsTotals ?? 0;

  const totalCustomerCount = data?.totalCustomerCount ?? 0;
  const totalOrderCount = data?.totalOrderCount ?? 0;
  const totalProductCount = data?.totalProductCount ?? 0;
  const totalPostCount = data?.totalPostCount ?? 0;
  const orderCountPrev = data?.orderCountPreviousMonth ?? 0;

  // New model stats
  const pendingWorkOrders = data?.pendingWorkOrders ?? 0;
  const lowStockCount = data?.lowStockCount ?? 0;
  const totalExpensesThisMonth = data?.totalExpensesThisMonth ?? 0;
  const totalPayrollThisMonth = data?.totalPayrollThisMonth ?? 0;

  /* ── chart ────────────────────────────────────────────────────────────── */
  // Format YYYY-MM-DD labels as "DD/MM" for display
  const chartLabels = weeklyData.map((d) => {
    const [y, m, day] = d.date.split("-");
    return `${day}/${m}`;
  });
  const chartValues = weeklyData.map((d) => d.Total ?? 0);

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: "Ventas",
        data: chartValues,
        backgroundColor: "rgba(99,102,241,0.55)",
        borderColor: "rgba(99,102,241,1)",
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const chartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(128,128,128,0.12)" },
        ticks: { callback: (v) => "$" + Number(v).toLocaleString("es-MX") },
      },
      x: { grid: { display: false } },
    },
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
  };

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-[1400px]">
      {/* ── Greeting ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold font-EB_Garamond">Tablero</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("es-MX", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Link
          href="/admin/reportes"
          className="flex items-center gap-1.5 text-sm border px-3 py-1.5 rounded-lg
                     hover:bg-muted transition text-muted-foreground"
        >
          <MdReceiptLong size={15} /> Ver reportes completos
        </Link>
      </div>

      {/* ── Revenue KPI row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <RevenueCard
          label="Ventas Hoy"
          value={dailyTotal}
          prev={yesterdayTotal}
          prevLabel="ayer"
          color="bg-blue-600"
          icon={<MdAttachMoney size={22} />}
        />
        <RevenueCard
          label="Ventas Semana"
          value={weeklyTotal}
          prev={lastWeekTotal}
          prevLabel="sem. ant."
          color="bg-teal-600"
          icon={<MdAttachMoney size={22} />}
        />
        <RevenueCard
          label="Ventas Mes"
          value={monthlyTotal}
          prev={lastMonthTotal}
          prevLabel="mes ant."
          color="bg-indigo-600"
          icon={<MdAttachMoney size={22} />}
        />
        <RevenueCard
          label="Ventas Año"
          value={yearlyTotal}
          prev={lastYearTotal}
          prevLabel="año ant."
          color="bg-orange-500"
          icon={<MdAttachMoney size={22} />}
        />
      </div>

      {/* ── Count + ops cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        <CountCard
          label="Clientes"
          value={totalCustomerCount}
          icon={<HiOutlineUserGroup />}
          color="bg-blue-600"
          href="/admin/clientes"
        />
        <CountCard
          label="Pedidos"
          value={totalOrderCount}
          sub={`+${orderCountPrev} mes ant.`}
          icon={<FaTags />}
          color="bg-teal-600"
          href="/admin/pedidos"
        />
        <CountCard
          label="Productos"
          value={totalProductCount}
          icon={<GiClothes />}
          color="bg-indigo-600"
          href="/admin/productos"
        />
        <CountCard
          label="Publicaciones"
          value={totalPostCount}
          icon={<HiDocumentText />}
          color="bg-orange-500"
          href="/admin/blog"
        />

        {/* New model cards */}
        <CountCard
          label="Órd. Trabajo"
          value={pendingWorkOrders}
          sub="pendientes / en tránsito"
          icon={<MdWorkOutline />}
          color="bg-violet-600"
          href="/admin/work-orders"
          alert={pendingWorkOrders > 0}
        />
        <CountCard
          label="Stock Bajo"
          value={lowStockCount}
          sub="variantes bajo mínimo"
          icon={<MdInventory />}
          color="bg-red-500"
          href="/admin/inventario"
          alert={lowStockCount > 0}
        />
        <CountCard
          label="Gastos (mes)"
          value={totalExpensesThisMonth}
          isCurrency
          icon={<MdStorefront />}
          color="bg-amber-600"
          href="/admin/finanzas/gastos"
        />
        <CountCard
          label="Nómina (mes)"
          value={totalPayrollThisMonth}
          isCurrency
          icon={<MdPeople />}
          color="bg-rose-600"
          href="/admin/finanzas/nomina"
        />
      </div>

      {/* ── Chart ──────────────────────────────────────────────────────── */}
      <div className="bg-card border border-muted rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-semibold text-base">
            Ventas de los últimos 7 días
          </h2>
          <span className="text-xs text-muted-foreground">
            (pagos registrados)
          </span>
        </div>
        <div className="h-64">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* ── Recent tables ──────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Pedidos */}
        <RecentTable
          title="Pedidos recientes"
          href="/admin/pedidos"
          cols={["No.", "Estado", "Cliente"]}
        >
          {orders.map((o: any) => (
            <tr
              key={o._id}
              className="border-t border-muted hover:bg-muted/20 text-sm"
            >
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {o.orderId}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    o.orderStatus === "Pagado"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : o.orderStatus === "Cancelado"
                        ? "bg-red-100 text-red-600"
                        : o.orderStatus === "Apartado"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}
                >
                  {o.orderStatus === "Apartado" ? (
                    <MdOutlineSavings className="inline" />
                  ) : null}{" "}
                  {o.orderStatus}
                </span>
              </td>
              <td className="px-3 py-2 flex items-center justify-between gap-1">
                <span className="truncate max-w-[80px]">
                  {o.customerName?.substring(0, 12)}
                </span>
                <Link href={`/admin/pedido/${o._id}`}>
                  <IoArrowRedoSharp className="text-teal-500 shrink-0" />
                </Link>
              </td>
            </tr>
          ))}
        </RecentTable>

        {/* Clientes */}
        <RecentTable
          title="Clientes recientes"
          href="/admin/clientes"
          cols={["", "Nombre"]}
        >
          {clients.map((c: any) => (
            <tr
              key={c._id}
              className="border-t border-muted hover:bg-muted/20 text-sm"
            >
              <td className="px-3 py-2 w-8">
                <Image
                  src={c.avatar || "/images/avatar_placeholder.jpg"}
                  alt="avatar"
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full object-cover"
                />
              </td>
              <td className="px-3 py-2 flex items-center justify-between gap-1">
                <span className="capitalize truncate max-w-[100px]">
                  {c.name}
                </span>
                <Link href={`/admin/cliente/${c._id}`}>
                  <IoArrowRedoSharp className="text-blue-500 shrink-0" />
                </Link>
              </td>
            </tr>
          ))}
        </RecentTable>

        {/* Productos */}
        <RecentTable
          title="Productos recientes"
          href="/admin/productos"
          cols={["", "Nombre"]}
        >
          {products.map((p: any) => (
            <tr
              key={p._id}
              className="border-t border-muted hover:bg-muted/20 text-sm"
            >
              <td className="px-3 py-2 w-8">
                <Image
                  src={p?.images?.[0]?.url || "/images/avatar_placeholder.jpg"}
                  alt="product"
                  width={24}
                  height={24}
                  className="w-6 h-6 object-cover"
                />
              </td>
              <td className="px-3 py-2 flex items-center justify-between gap-1">
                <span className="truncate max-w-[100px] capitalize text-xs">
                  {p.title?.substring(0, 18)}
                </span>
                <Link href={`/admin/productos/ver/${p.slug}`}>
                  <IoArrowRedoSharp className="text-indigo-500 shrink-0" />
                </Link>
              </td>
            </tr>
          ))}
        </RecentTable>

        {/* Posts */}
        <RecentTable
          title="Publicaciones recientes"
          href="/admin/blog"
          cols={["", "Título"]}
        >
          {posts.map((post: any) => (
            <tr
              key={post._id}
              className="border-t border-muted hover:bg-muted/20 text-sm"
            >
              <td className="px-3 py-2 w-8">
                <Image
                  src={post.mainImage || "/next.svg"}
                  alt="post"
                  width={24}
                  height={24}
                  className="w-6 h-6 object-cover"
                />
              </td>
              <td className="px-3 py-2 flex items-center justify-between gap-1">
                <span className="truncate max-w-[100px] text-xs">
                  {post.mainTitle?.substring(0, 18)}
                </span>
                <Link href={`/admin/blog/editar/${post.slug}`}>
                  <IoArrowRedoSharp className="text-orange-500 shrink-0" />
                </Link>
              </td>
            </tr>
          ))}
        </RecentTable>
      </div>

      {/* ── Quick-links row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          {
            href: "/admin/finanzas",
            label: "Finanzas",
            icon: <MdAttachMoney size={18} />,
            color: "text-amber-500",
          },
          {
            href: "/admin/work-orders",
            label: "Órd. Trabajo",
            icon: <MdWorkOutline size={18} />,
            color: "text-violet-500",
          },
          {
            href: "/admin/inventario",
            label: "Inventario",
            icon: <MdInventory size={18} />,
            color: "text-red-500",
          },
          {
            href: "/admin/reportes",
            label: "Reportes",
            icon: <MdReceiptLong size={18} />,
            color: "text-blue-500",
          },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-2 p-3 bg-card border border-muted rounded-xl
                       text-sm font-medium hover:bg-muted transition"
          >
            <span className={l.color}>{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DashComponent;

/* ── Shared sub-components ──────────────────────────────────────────────────── */

function RevenueCard({
  label,
  value,
  prev,
  prevLabel,
  color,
  icon,
}: {
  label: string;
  value: number;
  prev: number;
  prevLabel: string;
  color: string;
  icon: React.ReactNode;
}) {
  const d = delta(value, prev);
  return (
    <div className="bg-card border border-muted rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1 text-foreground">
            <FormattedPrice amount={value} />
          </p>
        </div>
        <span className={`${color} text-white rounded-full p-2.5`}>{icon}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {d ? (
          <>
            <span
              className={`flex items-center gap-0.5 font-medium ${d.up ? "text-green-500" : "text-red-500"}`}
            >
              {d.up ? <MdTrendingUp size={14} /> : <MdTrendingDown size={14} />}
              {d.pct}%
            </span>
            vs {prevLabel} (<FormattedPrice amount={prev} />)
          </>
        ) : (
          <span className="flex items-center gap-0.5">
            <MdTrendingFlat size={14} /> Sin dato ant.
          </span>
        )}
      </div>
    </div>
  );
}

function CountCard({
  label,
  value,
  sub,
  icon,
  color,
  href,
  alert = false,
  isCurrency = false,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  alert?: boolean;
  isCurrency?: boolean;
}) {
  return (
    <Link
      href={href}
      className="bg-card border border-muted rounded-2xl p-4 flex items-start
                 justify-between gap-3 hover:bg-muted/30 transition group"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className="text-xl font-bold text-foreground">
          {isCurrency ? <FormattedPrice amount={value} /> : value}
        </p>
        {sub && (
          <p
            className={`text-xs mt-1 ${alert ? "text-red-400 font-medium" : "text-muted-foreground"}`}
          >
            {alert && <MdWarning className="inline mr-0.5" size={11} />}
            {sub}
          </p>
        )}
      </div>
      <span
        className={`${color} text-white rounded-full p-2.5 shrink-0 group-hover:scale-105 transition`}
      >
        {icon}
      </span>
    </Link>
  );
}

function RecentTable({
  title,
  href,
  cols,
  children,
}: {
  title: string;
  href: string;
  cols: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-muted rounded-2xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-muted">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Link
          href={href}
          className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1"
        >
          Ver todos <IoArrowRedoSharp size={11} />
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground uppercase">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 text-left">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
