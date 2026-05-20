import { options } from "@/app/api/auth/[...nextauth]/options";
import Order from "@/backend/models/Order";
import Expense from "@/backend/models/Expense";
import PayrollEntry from "@/backend/models/PayrollEntry";
import StoreInventory from "@/backend/models/StoreInventory";
import Store from "@/backend/models/Store";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const ALLOWED_ROLES = ["manager", "director", "super_admin"];

const fmtMXN = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(n ?? 0);

function getDateRange(period: "daily" | "weekly" | "monthly") {
  const now = new Date();
  let start: Date;

  if (period === "daily") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  } else if (period === "weekly") {
    const day = now.getDay(); // 0=Sun
    start = new Date(now);
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
  } else {
    // monthly
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  }

  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  return { start, end };
}

const PERIOD_LABELS: Record<string, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
};

/**
 * POST /api/reports/send-email
 * Body: { period: "daily"|"weekly"|"monthly", branches: string[], recipients: string[] }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const period: "daily" | "weekly" | "monthly" = body.period ?? "daily";
    const branches: string[] = Array.isArray(body.branches)
      ? body.branches
      : [];
    const recipients: string[] = Array.isArray(body.recipients)
      ? body.recipients.filter((e: string) => e.includes("@"))
      : [];

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un destinatario válido." },
        { status: 400 },
      );
    }

    await dbConnect();

    // Load all stores — build two maps:
    //   branchNameMap : Order.branch string  → display name  (for labeling)
    //   storeIdToBranchStrings : store _id   → [branchLegacyName, slug]  (for filtering)
    const allStores = (await Store.find({})
      .select("name slug branchLegacyName")
      .lean()) as any[];

    const branchNameMap: Record<string, string> = {};
    const storeIdToBranchStrings: Record<string, string[]> = {};

    for (const s of allStores) {
      const keys: string[] = [];
      if (s.branchLegacyName) {
        branchNameMap[s.branchLegacyName] = s.name;
        keys.push(s.branchLegacyName);
      }
      if (s.slug) {
        branchNameMap[s.slug] = s.name;
        keys.push(s.slug);
      }
      storeIdToBranchStrings[s._id.toString()] = keys;
    }

    // Exact-match only — no loose prefix stripping to avoid misidentification
    const resolveBranch = (id: string | null | undefined): string => {
      if (!id) return "WWW / Tienda en línea";
      return branchNameMap[id] ?? id;
    };

    // Resolve selected store _ids → actual Order.branch string values
    // (Order.branch stores branchLegacyName / slug, NOT the store _id)
    let branchStringsFilter: string[] = [];
    if (branches.length > 0) {
      for (const storeId of branches) {
        const keys = storeIdToBranchStrings[storeId] ?? [];
        branchStringsFilter.push(...keys);
      }
    }

    const { start, end } = getDateRange(period);
    const isMonthly = period === "monthly";

    // ── Sales (all periods) ──────────────────────────────────────────────────
    const orderMatch: any = {
      createdAt: { $gte: start, $lte: end },
      orderStatus: { $ne: "Cancelado" },
    };
    if (branchStringsFilter.length > 0)
      orderMatch.branch = { $in: branchStringsFilter };

    const [venSummary] = await Order.aggregate([
      { $match: orderMatch },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$paymentInfo.amountPaid" },
          totalOrders: { $sum: 1 },
          totalIVA: { $sum: "$paymentInfo.taxPaid" },
        },
      },
    ]);

    const byBranch = await Order.aggregate([
      { $match: orderMatch },
      {
        $group: {
          _id: "$branch",
          revenue: { $sum: "$paymentInfo.amountPaid" },
          orders: { $sum: 1 },
          iva: { $sum: "$paymentInfo.taxPaid" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // ── Expenses (monthly only) ───────────────────────────────────────────────
    let expTotals: any = null;
    let expByCategory: any[] = [];
    if (isMonthly) {
      const expMatch: any = { date: { $gte: start, $lte: end } };
      if (branches.length > 0) expMatch.store = { $in: branches };

      [expTotals] = await Expense.aggregate([
        { $match: expMatch },
        {
          $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ]);

      expByCategory = await Expense.aggregate([
        { $match: expMatch },
        {
          $group: {
            _id: "$category",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]);
    }

    // ── Payroll (monthly only) ────────────────────────────────────────────────
    let payTotals: any = null;
    if (isMonthly) {
      const payMatch: any = { periodStart: { $gte: start, $lte: end } };
      if (branches.length > 0) payMatch.store = { $in: branches };

      [payTotals] = await PayrollEntry.aggregate([
        { $match: payMatch },
        {
          $group: {
            _id: null,
            totalNet: { $sum: "$netAmount" },
            totalPaid: { $sum: { $cond: ["$isPaid", "$netAmount", 0] } },
            totalPending: { $sum: { $cond: ["$isPaid", 0, "$netAmount"] } },
            count: { $sum: 1 },
          },
        },
      ]);
    }

    // ── Current Inventory Cost (monthly only) ─────────────────────────────────
    let invCost: any = null;
    if (isMonthly) {
      const invMatch: any = {};
      if (branches.length > 0) invMatch.store = { $in: branches };

      [invCost] = await StoreInventory.aggregate([
        { $match: invMatch },
        {
          $lookup: {
            from: "products",
            localField: "product",
            foreignField: "_id",
            as: "prod",
          },
        },
        { $unwind: { path: "$prod", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            matchedVariation: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: { $ifNull: ["$prod.variations", []] },
                    cond: {
                      $eq: [{ $toString: "$$this._id" }, "$variationId"],
                    },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalCost: {
              $sum: {
                $multiply: [
                  "$quantity",
                  { $ifNull: ["$matchedVariation.cost", 0] },
                ],
              },
            },
            totalUnits: { $sum: "$quantity" },
          },
        },
      ]);
    }

    // ── Build numbers ─────────────────────────────────────────────────────────
    const totalRevenue = venSummary?.totalRevenue ?? 0;
    const totalOrders = venSummary?.totalOrders ?? 0;
    const totalIVA = venSummary?.totalIVA ?? 0;
    const totalExpenses = expTotals?.total ?? 0;
    const totalPayroll = payTotals?.totalNet ?? 0;
    const totalPayrollPaid = payTotals?.totalPaid ?? 0;
    const totalPayrollPending = payTotals?.totalPending ?? 0;
    const inventoryCost = invCost?.totalCost ?? 0;
    const inventoryUnits = invCost?.totalUnits ?? 0;
    const netResult =
      totalRevenue - (isMonthly ? totalExpenses + totalPayroll : 0);

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

    const now = new Date();
    const dateLabel = `${start.toLocaleDateString("es-MX")}${period !== "daily" ? " al " + end.toLocaleDateString("es-MX") : ""}`;
    const branchLabel =
      branches.length === 0
        ? "Todas las sucursales"
        : `${branches.length} sucursal(es) seleccionada(s)`;

    // ── HTML email ────────────────────────────────────────────────────────────
    const kpiRow = (label: string, value: string, color = "#111") =>
      `<tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;color:#555;font-size:14px;">${label}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-weight:700;font-size:14px;color:${color};text-align:right;">${value}</td>
      </tr>`;

    const tableRow = (cells: string[], bold = false) =>
      `<tr>${cells.map((c, i) => `<td style="padding:8px 12px;border-bottom:1px solid #f5f5f5;font-size:13px;${bold ? "font-weight:700;" : ""}${i > 0 ? "text-align:right;" : ""}">${c}</td>`).join("")}</tr>`;

    const sectionTitle = (t: string) =>
      `<h3 style="margin:28px 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;">${t}</h3>`;

    const branchRows = byBranch
      .map((b: any) =>
        tableRow([
          resolveBranch(b._id),
          b.orders.toString(),
          fmtMXN(b.revenue),
          fmtMXN(b.iva),
        ]),
      )
      .join("");

    const totalBranchOrders = byBranch.reduce(
      (s: number, b: any) => s + b.orders,
      0,
    );
    const totalBranchRevenue = byBranch.reduce(
      (s: number, b: any) => s + b.revenue,
      0,
    );
    const totalBranchIVA = byBranch.reduce((s: number, b: any) => s + b.iva, 0);
    const branchTotalRow = tableRow(
      [
        "TOTAL",
        totalBranchOrders.toString(),
        fmtMXN(totalBranchRevenue),
        fmtMXN(totalBranchIVA),
      ],
      true,
    );

    const expRows = expByCategory
      .map((e: any) =>
        tableRow([
          CAT_LABELS[e._id] ?? e._id,
          e.count.toString(),
          fmtMXN(e.total),
        ]),
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:Arial,sans-serif;">
<div style="max-width:640px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

  <!-- Header -->
  <div style="background:#111;padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">📊 Reporte ${PERIOD_LABELS[period]}</h1>
    <p style="margin:6px 0 0;color:#aaa;font-size:13px;">Super Collectibles MX &nbsp;·&nbsp; ${dateLabel} &nbsp;·&nbsp; ${branchLabel}</p>
  </div>

  <div style="padding:24px 32px;">

    <!-- Summary KPIs -->
    ${sectionTitle("Resumen General")}
    <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #eee;">
      ${kpiRow("💰 Ventas Totales", fmtMXN(totalRevenue), "#16a34a")}
      ${kpiRow("🧾 Pedidos", totalOrders.toString())}
      ${kpiRow("📊 IVA Recaudado (16%)", fmtMXN(totalIVA), "#2563eb")}
      ${isMonthly ? kpiRow("💸 Gastos Operativos", fmtMXN(totalExpenses), "#dc2626") : ""}
      ${isMonthly ? kpiRow("👥 Nómina (período)", fmtMXN(totalPayroll), "#d97706") : ""}
      ${isMonthly ? kpiRow("📦 Costo Inventario Actual", fmtMXN(inventoryCost) + ` (${inventoryUnits} uds.)`, "#7c3aed") : ""}
      ${
        isMonthly
          ? kpiRow(
              netResult >= 0 ? "✅ Resultado Neto" : "⚠️ Resultado Neto",
              fmtMXN(netResult),
              netResult >= 0 ? "#16a34a" : "#dc2626",
            )
          : ""
      }
    </table>

    <!-- Sales by Branch -->
    ${sectionTitle("Ventas por Sucursal / Canal")}
    <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#f9f9f9;">
          <th style="padding:9px 12px;text-align:left;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;">Sucursal</th>
          <th style="padding:9px 12px;text-align:right;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;">Pedidos</th>
          <th style="padding:9px 12px;text-align:right;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;">Ventas</th>
          <th style="padding:9px 12px;text-align:right;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;">IVA</th>
        </tr>
      </thead>
      <tbody>
        ${branchRows || `<tr><td colspan="4" style="padding:16px;text-align:center;color:#aaa;font-size:13px;">Sin ventas en este período</td></tr>`}
        ${byBranch.length > 1 ? `<tr style="background:#f9f9f9;">${["TOTAL", totalBranchOrders.toString(), fmtMXN(totalBranchRevenue), fmtMXN(totalBranchIVA)].map((c, i) => `<td style="padding:9px 12px;font-size:13px;font-weight:700;border-top:2px solid #e5e5e5;${i > 0 ? "text-align:right;" : ""}">${c}</td>`).join("")}</tr>` : ""}
      </tbody>
    </table>

    ${
      isMonthly
        ? `
    <!-- Expenses by Category -->
    ${sectionTitle("Gastos por Categoría")}
    <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#f9f9f9;">
          <th style="padding:9px 12px;text-align:left;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;">Categoría</th>
          <th style="padding:9px 12px;text-align:right;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;">Registros</th>
          <th style="padding:9px 12px;text-align:right;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;">Total</th>
        </tr>
      </thead>
      <tbody>${expRows || `<tr><td colspan="3" style="padding:16px;text-align:center;color:#aaa;font-size:13px;">Sin gastos registrados</td></tr>`}</tbody>
    </table>

    <!-- Payroll -->
    ${sectionTitle("Nómina del Período")}
    <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #eee;">
      ${kpiRow("Total Neto", fmtMXN(totalPayroll), "#d97706")}
      ${kpiRow("Pagado", fmtMXN(totalPayrollPaid), "#16a34a")}
      ${kpiRow("Pendiente", fmtMXN(totalPayrollPending), "#dc2626")}
    </table>
    `
        : ""
    }

  </div>

  <!-- Footer -->
  <div style="background:#f9f9f9;padding:18px 32px;border-top:1px solid #eee;text-align:center;">
    <p style="margin:0;font-size:12px;color:#aaa;">Generado automáticamente el ${now.toLocaleString("es-MX")} &nbsp;·&nbsp; Super Collectibles MX</p>
    <p style="margin:4px 0 0;font-size:12px;color:#aaa;">Este reporte fue solicitado desde el panel de administración.</p>
  </div>
</div>
</body>
</html>`;

    // ── Send ──────────────────────────────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GOOGLE_MAIL,
        pass: process.env.GOOGLE_MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Super Collectibles MX" ${process.env.GOOGLE_MAIL}`,
      to: recipients.join(", "),
      subject: `📊 Reporte ${PERIOD_LABELS[period]} — ${dateLabel}`,
      html,
    });

    return NextResponse.json({ ok: true, recipients, period, dateLabel });
  } catch (error: any) {
    console.error("[POST /api/reports/send-email]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
