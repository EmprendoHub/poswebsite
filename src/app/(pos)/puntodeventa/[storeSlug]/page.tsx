"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import POSSidebar from "./_components/POSSidebar";
import ProductSearch, { CartItem } from "./_components/ProductSearch";
import POSCart from "./_components/POSCart";
import CheckoutModal from "./_components/CheckoutModal";
import { MdCheckCircle, MdWifiOff, MdSync, MdCloudDone } from "react-icons/md";
import { useParams } from "next/navigation";
import { usePOSSync } from "@/hooks/usePOSSync";

export default function POSSalesPage() {
  const params = useParams();
  const storeSlug = params?.storeSlug as string;
  const { data: session } = useSession();
  const cashierName =
    (session?.user as any)?.name ?? (session?.user as any)?.email ?? "Cajero";

  // In a real render the storeId and storeName come from a server component or context;
  // here we fetch them once and cache in state.
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [storeReady, setStoreReady] = useState(false);

  useEffect(() => {
    if (!storeSlug) return;
    fetch("/api/stores")
      .then((r) => r.json())
      .then((stores: any[]) => {
        const found = stores.find((s) => s.slug === storeSlug);
        if (found) {
          setStoreId(found._id);
          setStoreName(found.name);
        }
        setStoreReady(true);
      })
      .catch(() => setStoreReady(true));
  }, [storeSlug]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("Publico General");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  // ── Offline / sync ──────────────────────────────────────────────────
  const { isOnline, isSyncing, pendingCount, lastSyncResult, syncNow } =
    usePOSSync(storeId, storeSlug);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Show a toast when pending orders are flushed
  useEffect(() => {
    if (!lastSyncResult || lastSyncResult.synced === 0) return;
    setSyncToast(
      `✅ ${lastSyncResult.synced} venta${
        lastSyncResult.synced === 1 ? "" : "s"
      } sincronizada${lastSyncResult.synced === 1 ? "" : "s"} con el servidor`,
    );
    const t = setTimeout(() => setSyncToast(null), 6000);
    return () => clearTimeout(t);
  }, [lastSyncResult]);

  function handleAddToCart(item: CartItem) {
    setCart((prev) => {
      const existing = prev.find((i) => i.variationId === item.variationId);
      if (existing) {
        // Don't exceed available stock
        if (existing.quantity >= item.stock) return prev;
        return prev.map((i) =>
          i.variationId === item.variationId
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [...prev, item];
    });
  }

  function handleUpdateQty(variationId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.variationId !== variationId) return i;
          const next = i.quantity + delta;
          // Don't go above stock; don't go below 0 (filter removes it)
          const clamped = Math.min(next, i.stock);
          return { ...i, quantity: clamped };
        })
        .filter((i) => i.quantity > 0),
    );
  }

  function handleRemove(variationId: string) {
    setCart((prev) => prev.filter((i) => i.variationId !== variationId));
  }

  function handleSuccess(orderId: string) {
    setLastOrderId(orderId);
    setShowCheckout(false);
    setCart([]);
    setCustomerName("Publico General");
    setCustomerPhone("");
  }

  return (
    <div className="flex h-screen bg-background">
      <POSSidebar storeSlug={storeSlug} storeName={storeName} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── Offline banner ───────────────────────────────────────────── */}
        {!isOnline && (
          <div className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-300 dark:border-yellow-700 px-4 py-2 text-sm">
            <MdWifiOff size={18} className="text-yellow-600 flex-shrink-0" />
            <span className="text-yellow-800 dark:text-yellow-300 font-medium">
              Sin conexión — usando catálogo local
            </span>
            {pendingCount > 0 && (
              <span className="ml-1 text-yellow-700 dark:text-yellow-400">
                · {pendingCount} venta{pendingCount === 1 ? "" : "s"} pendiente
                {pendingCount === 1 ? "" : "s"} de sincronizar
              </span>
            )}
          </div>
        )}

        {/* ── Back-online sync banner ────────────────────────────────── */}
        {isOnline && pendingCount > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700 px-4 py-2 text-sm">
            <MdSync
              size={18}
              className={`text-blue-500 flex-shrink-0 ${
                isSyncing ? "animate-spin" : ""
              }`}
            />
            <span className="text-blue-800 dark:text-blue-300">
              {isSyncing
                ? `Sincronizando ${pendingCount} venta${
                    pendingCount === 1 ? "" : "s"
                  }…`
                : `${pendingCount} venta${
                    pendingCount === 1 ? "" : "s"
                  } pendiente${pendingCount === 1 ? "" : "s"}`}
            </span>
            {!isSyncing && (
              <button
                onClick={syncNow}
                className="ml-auto text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-lg transition-colors"
              >
                Sincronizar ahora
              </button>
            )}
          </div>
        )}

        {/* ── Sync success toast ────────────────────────────────────────── */}
        {syncToast && (
          <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-700 px-4 py-2 text-sm">
            <MdCloudDone size={18} className="text-green-500 flex-shrink-0" />
            <span className="text-green-800 dark:text-green-300">
              {syncToast}
            </span>
            <button
              onClick={() => setSyncToast(null)}
              className="ml-auto text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Main content row ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left: product search area */}
          <div className="flex-1 flex flex-col p-4 overflow-y-auto">
            <div className="mb-4">
              <h1 className="text-lg font-bold">{storeName || storeSlug}</h1>
              <p className="text-xs text-muted-foreground">Nueva venta</p>
            </div>
            <ProductSearch
              storeId={storeId ?? ""}
              onAddToCart={handleAddToCart}
              isOnline={isOnline}
              pauseFocus={showCheckout}
            />

            {/* Success toast */}
            {lastOrderId && (
              <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl px-4 py-3 flex items-center gap-3">
                <MdCheckCircle
                  size={22}
                  className="text-green-500 flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                    ¡Venta registrada!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Orden #{lastOrderId}
                  </p>
                </div>
                <button
                  onClick={() => setLastOrderId(null)}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Right: cart */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-muted p-4 flex flex-col">
            <POSCart
              items={cart}
              onUpdateQty={handleUpdateQty}
              onRemove={handleRemove}
              onCheckout={() => setShowCheckout(true)}
              customerName={customerName}
              customerPhone={customerPhone}
              onCustomerNameChange={setCustomerName}
              onCustomerPhoneChange={setCustomerPhone}
            />
          </div>
        </div>
      </div>

      {/* Checkout modal */}
      {showCheckout && storeId && (
        <CheckoutModal
          items={cart}
          customerName={customerName}
          customerPhone={customerPhone}
          storeId={storeId}
          storeSlug={storeSlug}
          storeName={storeName}
          cashierName={cashierName}
          isOnline={isOnline}
          onClose={() => setShowCheckout(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
