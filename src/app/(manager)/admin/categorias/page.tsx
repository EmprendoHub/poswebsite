import CategoriesManager from "./_components/CategoriesManager";
import Link from "next/link";

export default function CategoriasPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Categorías</h1>
          <p className="text-sm text-muted-foreground">
            Administra las categorías principales, subcategorías y atributos
            usados en la tienda.
          </p>
        </div>
        <Link
          href="/admin/categorias/migracion"
          className="text-sm text-primary underline"
        >
          Migrar categorías antiguas →
        </Link>
      </div>
      <CategoriesManager />
    </div>
  );
}
