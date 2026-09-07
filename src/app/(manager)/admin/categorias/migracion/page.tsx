"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const NO_VALUE = "(sin valor)";

interface GroupRow {
  gender: string;
  category: string;
  count: number;
  migratedMain: number;
  migratedAttributes: number;
}
interface Category {
  _id: string;
  name: string;
  kind: "main" | "sub" | "attribute";
  parent?: string | null;
}

export default function MigracionCategoriasPage() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [mains, setMains] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [hideMigrated, setHideMigrated] = useState(false);

  // Per-row pending selections, keyed by `${gender}|||${category}`
  const [rowMain, setRowMain] = useState<Record<string, string>>({});
  const [rowSub, setRowSub] = useState<Record<string, string>>({});
  const [rowAttrs, setRowAttrs] = useState<Record<string, string[]>>({});

  function rowKey(g: string, c: string) {
    return `${g}|||${c}`;
  }

  async function loadAll() {
    setLoading(true);
    const [valuesRes, mainRes, subRes, attrRes] = await Promise.all([
      fetch("/api/categories/migration/values"),
      fetch("/api/categories?kind=main"),
      fetch("/api/categories?kind=sub"),
      fetch("/api/categories?kind=attribute"),
    ]);
    const [valuesData, mainData, subData, attrData] = await Promise.all([
      valuesRes.json(),
      mainRes.json(),
      subRes.json(),
      attrRes.json(),
    ]);
    setGroups(valuesData.groups ?? []);
    setMains(mainData.categories ?? []);
    setSubs(subData.categories ?? []);
    setAttributes(attrData.categories ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function applyMapping(row: GroupRow) {
    const key = rowKey(row.gender, row.category);
    const mainId = rowMain[key];
    const subId = rowSub[key];
    const attrIds = rowAttrs[key] ?? [];

    if ((!mainId || !subId) && attrIds.length === 0) {
      setMessage(
        "Selecciona categoría principal + subcategoría, y/o al menos un atributo.",
      );
      return;
    }

    setApplyingKey(key);
    setMessage("");
    try {
      const res = await fetch("/api/categories/migration/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender: row.gender,
          category: row.category,
          mainCategoryId: mainId || undefined,
          subCategoryId: subId || undefined,
          attributeIds: attrIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(
        `"${row.gender}" + "${row.category}" aplicado a ${data.modified} producto(s).`,
      );
      loadAll();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setApplyingKey(null);
    }
  }

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Cargando...</p>;
  }

  const visibleGroups = hideMigrated
    ? groups.filter(
        (g) => g.migratedMain < g.count || g.migratedAttributes < g.count,
      )
    : groups;

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <Link
          href="/admin/categorias"
          className="text-sm text-primary underline"
        >
          ← Volver a Categorías
        </Link>
        <h1 className="text-2xl font-bold mt-2">Migrar Categorías Antiguas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cada fila es una combinación real que existe hoy en tus productos:
          el valor del campo <code>gender</code> (franquicia/deporte) y el
          valor del campo <code>category</code> (tipo de producto), juntos.
          Selecciona a qué se convierte cada uno y aplica — solo afecta a los
          productos con esa combinación exacta.
        </p>
        <ul className="text-xs text-muted-foreground mt-2 list-disc list-inside">
          <li>
            <b>gender → </b>se guarda como <b>Categoría Principal</b> +{" "}
            <b>Subcategoría</b> (ej. Anime → Pokemon)
          </li>
          <li>
            <b>category (tipo de producto) → </b>se guarda como uno o más{" "}
            <b>Atributos</b> (ej. Tarjetas, Figuras)
          </li>
          <li>
            <code>{NO_VALUE}</code> significa que ese campo está vacío en esos
            productos
          </li>
        </ul>
      </div>

      {message && (
        <div className="bg-muted rounded-lg px-4 py-2.5 text-sm mb-4">
          {message}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">
          Combinaciones encontradas ({visibleGroups.length}/{groups.length})
        </h2>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={hideMigrated}
            onChange={(e) => setHideMigrated(e.target.checked)}
          />
          Ocultar ya migradas
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-muted">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2 text-left">
                gender <span className="normal-case">(→ Principal/Sub)</span>
              </th>
              <th className="px-3 py-2 text-left">
                category <span className="normal-case">(→ Atributos)</span>
              </th>
              <th className="px-3 py-2 text-right">Productos</th>
              <th className="px-3 py-2 text-left">Categoría Principal</th>
              <th className="px-3 py-2 text-left">Subcategoría</th>
              <th className="px-3 py-2 text-left">Atributos</th>
              <th className="px-3 py-2 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {visibleGroups.map((row) => {
              const key = rowKey(row.gender, row.category);
              const mainSelected = rowMain[key] ?? "";
              const availableSubs = subs.filter(
                (s) => s.parent === mainSelected,
              );
              const mainDone = row.migratedMain >= row.count;
              const attrDone = row.migratedAttributes >= row.count;
              return (
                <tr
                  key={key}
                  className={`border-t border-muted ${
                    mainDone && attrDone
                      ? "bg-green-50 dark:bg-green-900/10"
                      : ""
                  }`}
                >
                  <td className="px-3 py-2 font-semibold">
                    {row.gender}
                    <p
                      className={`text-xs font-normal ${mainDone ? "text-green-600" : "text-muted-foreground"}`}
                    >
                      {row.migratedMain}/{row.count} migrados
                    </p>
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    {row.category}
                    <p
                      className={`text-xs font-normal ${attrDone ? "text-green-600" : "text-muted-foreground"}`}
                    >
                      {row.migratedAttributes}/{row.count} migrados
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right">{row.count}</td>
                  <td className="px-3 py-2">
                    <select
                      value={mainSelected}
                      onChange={(e) =>
                        setRowMain((m) => ({ ...m, [key]: e.target.value }))
                      }
                      className="bg-muted rounded-lg px-2 py-1.5 text-xs outline-none w-full"
                    >
                      <option value="">Sin cambio...</option>
                      {mains.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={rowSub[key] ?? ""}
                      onChange={(e) =>
                        setRowSub((s) => ({ ...s, [key]: e.target.value }))
                      }
                      disabled={!mainSelected}
                      className="bg-muted rounded-lg px-2 py-1.5 text-xs outline-none w-full disabled:opacity-50"
                    >
                      <option value="">Subcategoría...</option>
                      {availableSubs.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      multiple
                      value={rowAttrs[key] ?? []}
                      onChange={(e) =>
                        setRowAttrs((m) => ({
                          ...m,
                          [key]: Array.from(
                            e.target.selectedOptions,
                            (o) => o.value,
                          ),
                        }))
                      }
                      className="bg-muted rounded-lg px-2 py-1.5 text-xs outline-none w-full min-w-32 h-16"
                    >
                      {attributes.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => applyMapping(row)}
                      disabled={applyingKey === key}
                      className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 whitespace-nowrap"
                    >
                      {applyingKey === key ? "..." : "Aplicar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
