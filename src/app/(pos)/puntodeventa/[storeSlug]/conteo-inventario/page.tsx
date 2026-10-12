"use client";
import React, { useState } from "react";
import { useParams } from "next/navigation";
import { MdLock } from "react-icons/md";
import POSSidebar from "../_components/POSSidebar";
import InventarioContent from "@/app/(manager)/admin/inventario/_components/InventarioContent";

/* ─── Manager code modal ─────────────────────────────────────────── */
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
            para acceder al conteo de inventario.
          </p>
          <input
            type="text"
            value={"•".repeat(code.length).padEnd(6, "*")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleVerify();
                return;
              }
              if (e.key === "Backspace") {
                setCode(code.slice(0, -1));
                setError("");
                e.preventDefault();
                return;
              }
              if (!/\d/.test(e.key)) {
                e.preventDefault();
                return;
              }
              if (code.length >= 6) {
                e.preventDefault();
                return;
              }
              setCode(code + e.key);
              setError("");
            }}
            autoFocus
            className="w-full bg-muted rounded-lg px-4 py-3 text-center text-sm font-mono outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary mb-3"
            placeholder="••••••"
          />
          {error && (
            <p className="text-xs text-red-500 mb-4 text-center">{error}</p>
          )}
          <button
            onClick={handleVerify}
            disabled={code.length !== 6 || loading}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? "Verificando…" : "Verificar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── POS Inventario Page ────────────────────────────────────────── */
export default function POSInventarioPage() {
  const params = useParams();
  const storeSlug = params.storeSlug as string;
  const [pageUnlocked, setPageUnlocked] = useState(false);

  if (!pageUnlocked) {
    return (
      <ManagerCodeModal
        onAuthorized={() => setPageUnlocked(true)}
        onCancel={() => {
          // Could navigate back
        }}
      />
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <POSSidebar storeSlug={storeSlug} storeName={storeSlug} />
      <main className="flex-1 overflow-auto">
        <InventarioContent storeSlug={storeSlug} />
      </main>
    </div>
  );
}
