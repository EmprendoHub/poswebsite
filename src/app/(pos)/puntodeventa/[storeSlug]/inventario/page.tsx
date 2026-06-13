"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import POSSidebar from "../_components/POSSidebar";
import Image from "next/image";
import {
  MdWarning,
  MdRefresh,
  MdShield,
  MdLock,
  MdPrint,
} from "react-icons/md";

interface InventoryItem {
  _id: string;
  variationId: string;
  quantity: number;
  minStock: number;
  product: {
    _id: string;
    title: string;
    images: { url: string }[];
    price: number;
    variations: {
      _id: string;
      color?: string;
      size?: string;
      title?: string;
    }[];
  };
}

/* ─── PDF / Print helper ────────────────────────────────────────── */
function printInventory(
  items: InventoryItem[],
  storeName: string,
  filter: "all" | "low",
) {
  const now = new Date().toLocaleString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const lowCount = items.filter((i) => i.quantity <= i.minStock).length;
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);

  const rows = items
    .map((item) => {
      const variation = item.product?.variations?.find(
        (v: any) => v._id?.toString() === item.variationId,
      );
      const varLabel = variation
        ? [variation.color, variation.size, variation.title]
            .filter(Boolean)
            .join(" / ")
        : item.variationId;
      const isLow = item.quantity <= item.minStock;
      return `
        <tr class="${isLow ? "low" : ""}">
          <td>${item.product?.title ?? "—"}</td>
          <td>${varLabel}</td>
          <td class="center bold">${item.quantity}</td>
          <td class="center">${item.minStock}</td>
          <td class="center ${isLow ? "low-text" : "ok-text"}">${isLow ? "⚠ Bajo" : "OK"}</td>
        </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Inventario – ${storeName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 16mm; }
    h1 { font-size: 17px; font-weight: 700; }
    .sub { color: #555; font-size: 10px; margin-top: 3px; margin-bottom: 12px; }
    .meta { display: flex; justify-content: space-between; font-size: 10px; color: #666;
            border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 6px 0; margin-bottom: 14px; }
    .summary { display: flex; gap: 20px; margin-bottom: 16px; }
    .summary-card { background: #f5f5f5; border-radius: 6px; padding: 8px 16px; min-width: 100px; }
    .summary-card .lbl { font-size: 9px; text-transform: uppercase; color: #777; }
    .summary-card .val { font-size: 18px; font-weight: 700; margin-top: 2px; }
    .val.warn { color: #b45309; }
    table { width: 100%; border-collapse: collapse; }
    thead { background: #efefef; }
    th { text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase;
         color: #444; border-bottom: 2px solid #ccc; }
    th.center, td.center { text-align: center; }
    td { padding: 5px 8px; border-bottom: 1px solid #e8e8e8; }
    tr.low { background: #fffbeb; }
    .bold { font-weight: 700; }
    .low-text { color: #b45309; font-weight: 600; }
    .ok-text  { color: #16a34a; font-weight: 600; }
    .footer { margin-top: 18px; font-size: 9px; color: #aaa; text-align: right; }
    @media print { body { padding: 10mm; } }
  </style>
</head>
<body>
  <h1>Reporte de Inventario</h1>
  <div class="sub">${storeName}${filter === "low" ? " &mdash; Solo productos con stock bajo" : ""}</div>
  <div class="meta">
    <span>Generado: ${now}</span>
    <span>Total registros: ${items.length}</span>
  </div>
  <div class="summary">
    <div class="summary-card"><div class="lbl">Variaciones</div><div class="val">${items.length}</div></div>
    <div class="summary-card"><div class="lbl">Stock bajo</div><div class="val warn">${lowCount}</div></div>
    <div class="summary-card"><div class="lbl">Total unidades</div><div class="val">${totalUnits}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th>Variación</th>
        <th class="center">Existencia</th>
        <th class="center">Mín.</th>
        <th class="center">Estado</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Super Collectibles POS &mdash; ${now}</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=960,height=720");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

/* ─── Manager code gate ──────────────────────────────────────────── */
function ManagerCodeModal({
  onAuthorized,
  onCancel,
}: {
  onAuthorized: () => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleVerify() {
    if (code.length !== 6) {
      setError("El código debe tener 6 dígitos.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pos/verify-manager-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.valid) {
        onAuthorized();
      } else {
        setError("Código incorrecto. Intenta de nuevo.");
        setCode("");
      }
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-xs">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-muted">
          <MdLock size={22} className="text-primary" />
          <div>
            <h2 className="font-bold text-base">Acceso restringido</h2>
            <p className="text-xs text-muted-foreground">
              Se requiere autorización de manager
            </p>
          </div>
        </div>
        <div className="px-6 py-5">
          <p className="text-xs text-muted-foreground mb-4">
            Ingresa el{" "}
            <span className="font-semibold text-foreground">
              código de manager
            </span>{" "}
            para acceder al módulo de inventario.
          </p>
          <input
            type="password"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            inputMode="numeric"
            maxLength={6}
            autoFocus
            placeholder="••••••"
            className="w-full border border-border rounded-lg px-3 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary tracking-widest text-center text-lg mb-1"
          />
          <p className="text-xs text-muted-foreground text-center mb-3">
            {code.length}/6 dígitos
          </p>
          {error && (
            <p className="text-xs text-red-500 mb-3 text-center">{error}</p>
          )}
          <button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <MdShield size={16} />
            {loading ? "Verificando..." : "Autorizar acceso"}
          </button>
          <button
            onClick={onCancel}
            className="w-full mt-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function POSInventoryPage() {
  const params = useParams();
  const storeSlug = params?.storeSlug as string;
  const router = useRouter();

  const [pageUnlocked, setPageUnlocked] = useState(false);

  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "low">("all");

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((stores: any[]) => {
        const found = stores.find((s) => s.slug === storeSlug);
        if (found) {
          setStoreId(found._id);
          setStoreName(found.name);
        }
      });
  }, [storeSlug]);

  const loadInventory = () => {
    if (!storeId) return;
    setLoading(true);
    const url = `/api/store-inventory?storeId=${storeId}${filter === "low" ? "&lowStock=true" : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setInventory(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadInventory();
  }, [storeId, filter]);

  if (!pageUnlocked) {
    return (
      <div className="flex h-screen bg-background">
        <POSSidebar storeSlug={storeSlug} storeName={storeName} />
        <ManagerCodeModal
          onAuthorized={() => setPageUnlocked(true)}
          onCancel={() => router.push(`/puntodeventa/${storeSlug}/`)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <POSSidebar storeSlug={storeSlug} storeName={storeName} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Inventario</h1>
            <p className="text-xs text-muted-foreground">{storeName}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as "all" | "low")}
              className="text-xs bg-muted border border-muted rounded-lg px-3 py-2 outline-none"
            >
              <option value="all">Todo el inventario</option>
              <option value="low">⚠ Stock bajo</option>
            </select>
            <button
              onClick={() => printInventory(inventory, storeName, filter)}
              disabled={inventory.length === 0}
              title="Generar PDF"
              className="p-2 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40"
            >
              <MdPrint size={18} />
            </button>
            <button
              onClick={loadInventory}
              className="p-2 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <MdRefresh size={18} />
            </button>
          </div>
        </div>

        {loading && (
          <p className="text-muted-foreground text-sm animate-pulse">
            Cargando inventario...
          </p>
        )}

        {!loading && inventory.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p>No hay registros de inventario para esta sucursal.</p>
            <p className="text-xs mt-1">
              Los productos aparecerán aquí cuando se procesen órdenes de
              trabajo.
            </p>
          </div>
        )}

        {!loading && inventory.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-muted">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Producto</th>
                  <th className="px-4 py-3 text-left">Variación</th>
                  <th className="px-4 py-3 text-center">Existencia</th>
                  <th className="px-4 py-3 text-center">Mín.</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => {
                  const variation = item.product?.variations?.find(
                    (v: any) => v._id?.toString() === item.variationId,
                  );
                  const varLabel = variation
                    ? [variation.color, variation.size, variation.title]
                        .filter(Boolean)
                        .join(" / ")
                    : item.variationId;
                  const isLow = item.quantity <= item.minStock;

                  return (
                    <tr
                      key={item._id}
                      className="border-t border-muted hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.product?.images?.[0]?.url && (
                            <Image
                              src={item.product.images[0].url}
                              alt={item.product.title}
                              width={36}
                              height={36}
                              className="rounded object-cover w-9 h-9 flex-shrink-0"
                            />
                          )}
                          <span className="font-medium text-xs line-clamp-2 max-w-[200px]">
                            {item.product?.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {varLabel}
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {item.minStock}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isLow ? (
                          <span className="flex items-center justify-center gap-1 text-amber-600 text-xs font-medium">
                            <MdWarning size={14} /> Bajo
                          </span>
                        ) : (
                          <span className="text-green-600 text-xs font-medium">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
