"use client";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FiLogOut } from "react-icons/fi";
import { MdStorefront } from "react-icons/md";

interface Store {
  _id: string;
  name: string;
  slug: string;
  type: string;
  city?: string;
  isActive: boolean;
}

export default function POSHomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/iniciar");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const user = session?.user as any;
    const assignedStore = user?.assignedStore;
    const role = user?.role;

    // Non-managers with an assigned store go straight to their POS
    if (assignedStore && role !== "manager") {
      fetch(`/api/stores/${assignedStore}`)
        .then((r) => r.json())
        .then((store) => {
          if (store?.slug) {
            router.replace(`/puntodeventa/${store.slug}`);
          } else {
            setLoading(false);
          }
        })
        .catch(() => setLoading(false));
      return;
    }

    // Managers (or employees without an assigned store) see the selector
    // Bodega branches are storage-only and can't process sales, so they're
    // excluded from the POS branch selector.
    fetch("/api/stores")
      .then((r) => r.json())
      .then((data) => {
        setStores(
          Array.isArray(data)
            ? data.filter(
                (s: Store) => s.isActive && s.type === "fisica",
              )
            : [],
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status, session, router]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Cargando...</p>
      </div>
    );
  }

  const typeLabel: Record<string, string> = {
    fisica: "Tienda Física",
    bodega: "Bodega",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-muted px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/logos/Super-Collectibles-Menu-logo.png"
            alt="Super Collectibles"
            width={140}
            height={40}
            className="h-auto"
          />
          <span className="text-sm text-muted-foreground font-medium">POS</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {(session?.user as any)?.name}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/iniciar" })}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <FiLogOut size={16} />
            Salir
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-2">Seleccionar Sucursal</h1>
        <p className="text-muted-foreground mb-8 text-sm">
          Elige la sucursal donde deseas operar el punto de venta.
        </p>

        {stores.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MdStorefront size={48} className="mx-auto mb-4 opacity-30" />
            <p>No hay sucursales disponibles.</p>
            {(session?.user as any)?.role === "manager" && (
              <Link
                href="/admin/sucursales"
                className="text-primary text-sm underline mt-2 inline-block"
              >
                Crear sucursal en el panel de administración
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
            {stores.map((store) => (
              <Link
                key={store._id}
                href={`/puntodeventa/${store.slug}`}
                className="group border border-muted rounded-xl p-6 hover:border-primary hover:shadow-md transition-all bg-card"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <MdStorefront size={20} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold leading-tight">
                      {store.name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {typeLabel[store.type] ?? store.type}
                    </p>
                  </div>
                </div>
                {store.city && (
                  <p className="text-xs text-muted-foreground">{store.city}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
