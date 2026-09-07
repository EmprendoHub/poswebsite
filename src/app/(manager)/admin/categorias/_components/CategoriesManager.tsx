"use client";
import { useEffect, useState } from "react";
import { MdAdd, MdDelete, MdEdit, MdImage, MdExpandMore } from "react-icons/md";
import Image from "next/image";

interface Category {
  _id: string;
  name: string;
  slug: string;
  kind: "main" | "sub" | "attribute";
  parent?: string | null;
  image?: string;
  order: number;
  isActive: boolean;
}

export default function CategoriesManager() {
  const [mains, setMains] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [showMainForm, setShowMainForm] = useState(false);
  const [subFormForParent, setSubFormForParent] = useState<string | null>(
    null,
  );
  const [showAttributeForm, setShowAttributeForm] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [mainRes, subRes, attrRes] = await Promise.all([
        fetch("/api/categories?kind=main"),
        fetch("/api/categories?kind=sub"),
        fetch("/api/categories?kind=attribute"),
      ]);
      const [mainData, subData, attrData] = await Promise.all([
        mainRes.json(),
        subRes.json(),
        attrRes.json(),
      ]);
      setMains(mainData.categories ?? []);
      setSubs(subData.categories ?? []);
      setAttributes(attrData.categories ?? []);
    } catch {
      setError("Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function deleteCategory(id: string) {
    if (!confirm("¿Eliminar esta categoría?")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Error al eliminar");
      return;
    }
    loadAll();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Main categories */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Categorías Principales</h2>
          <button
            onClick={() => setShowMainForm(true)}
            className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-semibold"
          >
            <MdAdd size={16} /> Nueva Principal
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {mains.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No hay categorías principales todavía.
            </p>
          )}
          {mains.map((main) => {
            const children = subs.filter((s) => s.parent === main._id);
            const isOpen = !!expanded[main._id];
            return (
              <div
                key={main._id}
                className="border border-muted rounded-xl overflow-hidden"
              >
                <div className="flex items-center gap-3 px-4 py-3 bg-card">
                  {main.image ? (
                    <Image
                      src={main.image}
                      alt={main.name}
                      width={40}
                      height={40}
                      className="rounded-lg object-cover w-10 h-10"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <MdImage className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{main.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {children.length} subcategoría(s) · orden {main.order}
                    </p>
                  </div>
                  <button
                    onClick={() => setSubFormForParent(main._id)}
                    title="Agregar subcategoría"
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <MdAdd size={18} />
                  </button>
                  <button
                    onClick={() => deleteCategory(main._id)}
                    title="Eliminar"
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600"
                  >
                    <MdDelete size={18} />
                  </button>
                  <button
                    onClick={() =>
                      setExpanded((e) => ({ ...e, [main._id]: !e[main._id] }))
                    }
                    className={`p-2 rounded-lg hover:bg-muted text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  >
                    <MdExpandMore size={18} />
                  </button>
                </div>

                {isOpen && (
                  <div className="px-4 py-3 flex flex-wrap gap-2">
                    {children.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Sin subcategorías todavía.
                      </p>
                    )}
                    {children.map((sub) => (
                      <span
                        key={sub._id}
                        className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full text-xs"
                      >
                        {sub.name}
                        <button
                          onClick={() => deleteCategory(sub._id)}
                          className="text-muted-foreground hover:text-red-600"
                        >
                          <MdDelete size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Attributes (global, reusable across main categories) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold">Atributos</h2>
            <p className="text-xs text-muted-foreground">
              Ej. Tarjetas, Figuras, Apparel, Calzado — se pueden asignar a
              cualquier producto sin importar su categoría principal.
            </p>
          </div>
          <button
            onClick={() => setShowAttributeForm(true)}
            className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-semibold"
          >
            <MdAdd size={16} /> Nuevo Atributo
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {attributes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No hay atributos todavía.
            </p>
          )}
          {attributes.map((attr) => (
            <span
              key={attr._id}
              className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full text-sm"
            >
              {attr.name}
              <button
                onClick={() => deleteCategory(attr._id)}
                className="text-muted-foreground hover:text-red-600"
              >
                <MdDelete size={14} />
              </button>
            </span>
          ))}
        </div>
      </section>

      {showMainForm && (
        <CategoryFormModal
          title="Nueva Categoría Principal"
          kind="main"
          withImage
          onClose={() => setShowMainForm(false)}
          onSaved={() => {
            setShowMainForm(false);
            loadAll();
          }}
        />
      )}

      {subFormForParent && (
        <CategoryFormModal
          title="Nueva Subcategoría"
          kind="sub"
          parent={subFormForParent}
          onClose={() => setSubFormForParent(null)}
          onSaved={() => {
            setSubFormForParent(null);
            loadAll();
          }}
        />
      )}

      {showAttributeForm && (
        <CategoryFormModal
          title="Nuevo Atributo"
          kind="attribute"
          onClose={() => setShowAttributeForm(false)}
          onSaved={() => {
            setShowAttributeForm(false);
            loadAll();
          }}
        />
      )}
    </div>
  );
}

function CategoryFormModal({
  title,
  kind,
  parent,
  withImage,
  onClose,
  onSaved,
}: {
  title: string;
  kind: "main" | "sub" | "attribute";
  parent?: string;
  withImage?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [order, setOrder] = useState(0);
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/minio", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir imagen");
      setImage(data.images?.[0]?.url ?? "");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("El nombre es requerido");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kind, parent, image, order }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-muted">
          <h2 className="font-bold text-base">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Nombre *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none"
              placeholder="Ej. Anime, Pokemon, Tarjetas..."
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Orden
            </label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value) || 0)}
              className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm outline-none"
            />
          </div>
          {withImage && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Imagen de portada
              </label>
              {image && (
                <Image
                  src={image}
                  alt="Portada"
                  width={200}
                  height={80}
                  className="rounded-lg object-cover w-full h-20 mb-2"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
                className="text-xs"
              />
              {uploading && (
                <p className="text-xs text-muted-foreground mt-1">
                  Subiendo imagen...
                </p>
              )}
            </div>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
