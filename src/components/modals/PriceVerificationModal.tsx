import { useState } from "react";
import { MdLock, MdShield, MdClose } from "react-icons/md";

interface PriceVerificationModalProps {
  isOpen: boolean;
  newPrice: number;
  oldPrice?: number;
  onAuthorized: (userName: string, userId: string) => void;
  onCancel: () => void;
}

export default function PriceVerificationModal({
  isOpen,
  newPrice,
  oldPrice,
  onAuthorized,
  onCancel,
}: PriceVerificationModalProps) {
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
        // Extract user name and ID from response
        // API returns: { valid: true, employee: { _id, name, role } }
        const userName =
          data.employee?.name || data.name || data.userName || "";
        const userId = data.employee?._id || data.userId || data.id || "";

        if (!userName || !userId) {
          setError("No se pudo obtener los datos del manager/supervisor.");
          return;
        }

        onAuthorized(userName, userId);
        setCode("");
        setError("");
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

  if (!isOpen) return null;

  const priceChange = oldPrice ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;
  const isIncrease = priceChange > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-muted">
          <MdLock size={22} className="text-amber-500" />
          <div>
            <h2 className="font-bold text-base">Autorización requerida</h2>
            <p className="text-xs text-muted-foreground">
              Cambio de precio detectado
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Price Information */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Precio actual:
              </span>
              <span className="font-semibold">
                ${oldPrice?.toFixed(2) || "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Nuevo precio:
              </span>
              <span className="font-bold text-lg text-primary">
                ${newPrice.toFixed(2)}
              </span>
            </div>
            {oldPrice && (
              <div className="flex justify-between items-center pt-2 border-t border-muted">
                <span className="text-xs text-muted-foreground">Cambio:</span>
                <span
                  className={`font-bold ${
                    isIncrease ? "text-red-500" : "text-green-600"
                  }`}
                >
                  {isIncrease ? "+" : ""}
                  {priceChange.toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {/* Manager Code Input */}
          <div>
            <p className="text-xs text-muted-foreground mb-3">
              Ingresa el código de{" "}
              <span className="font-semibold">manager o supervisor</span> para
              autorizar este cambio de precio.
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(cleaned);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleVerify();
                }
              }}
              maxLength={6}
              autoFocus
              autoComplete="off"
              spellCheck="false"
              placeholder="••••••"
              className="w-full border border-border rounded-lg px-3 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-amber-500 tracking-widest text-center text-lg mb-1 [-webkit-text-security:disc]"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground text-center mb-3">
              {code.length}/6 dígitos
            </p>
            {error && (
              <p className="text-xs text-red-500 mb-3 text-center">{error}</p>
            )}
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            <MdShield size={16} />
            {loading ? "Verificando..." : "Autorizar cambio"}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
          >
            <MdClose size={14} />
            Cancelar cambio
          </button>
        </div>
      </div>
    </div>
  );
}
