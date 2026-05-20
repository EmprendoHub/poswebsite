"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MdAttachMoney,
  MdTrendingDown,
  MdPeople,
  MdArrowForward,
  MdShoppingCart,
  MdHome,
} from "react-icons/md";

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const CATEGORY_LABELS: Record<string, string> = {
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

export default function FinanzasDashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/finanzas/summary?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year, month]);

  const totalCosts =
    (data?.totalRenta ?? 0) +
    (data?.totalOtrosGastos ?? 0) +
    (data?.totalPayroll ?? 0) +
    (data?.totalCOGS ?? 0);
  const netMargin = (data?.totalRevenue ?? 0) - totalCosts;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold font-EB_Garamond">Finanzas</h1>
        <div className="flex gap-2 items-center">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border rounded-lg px-3 py-1.5 text-sm bg-card"
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded-lg px-3 py-1.5 text-sm bg-card"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground animate-pulse">Cargando...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <SummaryCard
              icon={<MdAttachMoney size={22} className="text-green-500" />}
              label="Ingresos"
              value={data?.totalRevenue ?? 0}
              color="text-green-600"
            />
            <SummaryCard
              icon={<MdShoppingCart size={22} className="text-purple-500" />}
              label="Costo de Venta"
              value={data?.totalCOGS ?? 0}
              color="text-purple-600"
              subtitle="Órdenes de compra completadas"
            />
            <SummaryCard
              icon={
                <MdAttachMoney
                  size={22}
                  className={netMargin >= 0 ? "text-blue-500" : "text-red-500"}
                />
              }
              label="Margen Neto"
              value={netMargin}
              color={netMargin >= 0 ? "text-blue-600" : "text-red-600"}
              subtitle="Ingresos − COGS − Renta − Nómina − Otros Gastos"
            />
          </div>

          {/* Cost breakdown row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <SummaryCard
              icon={<MdHome size={22} className="text-orange-500" />}
              label="Renta"
              value={data?.totalRenta ?? 0}
              color="text-orange-600"
            />
            <SummaryCard
              icon={<MdPeople size={22} className="text-amber-500" />}
              label="Nómina"
              value={data?.totalPayroll ?? 0}
              color="text-amber-600"
            />
            <SummaryCard
              icon={<MdTrendingDown size={22} className="text-red-400" />}
              label="Otros Gastos"
              value={data?.totalOtrosGastos ?? 0}
              color="text-red-500"
              subtitle="Sin renta ni nómina"
            />
          </div>

          {/* Expenses by category (excluding renta & nomina shown separately above) */}
          {data?.expensesByCategory?.filter(
            (r: any) => r._id !== "renta" && r._id !== "nomina",
          ).length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Otros Gastos por Categoría
              </h2>
              <div className="border border-muted rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">Categoría</th>
                      <th className="px-4 py-2 text-center">Registros</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expensesByCategory
                      .filter(
                        (r: any) => r._id !== "renta" && r._id !== "nomina",
                      )
                      .map((row: any) => (
                        <tr key={row._id} className="border-t border-muted">
                          <td className="px-4 py-2.5 font-medium">
                            {CATEGORY_LABELS[row._id] ?? row._id}
                          </td>
                          <td className="px-4 py-2.5 text-center text-muted-foreground">
                            {row.count}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold">
                            $
                            {row.total.toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QuickLink
              href="/admin/finanzas/gastos"
              title="Gastos"
              description="Registrar y revisar gastos del negocio"
            />
            <QuickLink
              href="/admin/finanzas/nomina"
              title="Nómina"
              description="Registrar pagos de empleados"
            />
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-card border border-muted rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className={`text-xl font-bold ${color}`}>
        ${value.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
      </p>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between bg-card border border-muted rounded-xl p-4 hover:border-primary transition-colors group"
    >
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <MdArrowForward
        size={18}
        className="text-muted-foreground group-hover:text-primary transition-colors"
      />
    </Link>
  );
}
