"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MdCreditCard, MdCheckCircle, MdClose } from "react-icons/md";

interface ApplyCreditProps {
  cartTotal?: number;
  onApplyCredit?: (appliedAmount: number) => void;
}

interface CreditInfo {
  availableCredit: number;
  totalBalance: number;
}

const ApplyCreditCheckout = ({
  cartTotal = 0,
  onApplyCredit,
}: ApplyCreditProps) => {
  const { data: session } = useSession();
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [appliedCredit, setAppliedCredit] = useState(0);
  const [customAmount, setCustomAmount] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!session?.user) return;

    const fetchCredit = async () => {
      try {
        const response = await fetch("/api/customer-credit");
        if (!response.ok) throw new Error("Failed to fetch credit");
        const data = await response.json();
        setCreditInfo({
          availableCredit: data.totalBalance,
          totalBalance: data.totalBalance,
        });
      } catch (err) {
        console.error("Error fetching credit:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCredit();
  }, [session]);

  const handleApplyCredit = async () => {
    if (!creditInfo) return;

    const amountToApply = customAmount
      ? parseFloat(customAmount)
      : appliedCredit;

    if (isNaN(amountToApply) || amountToApply <= 0) {
      setError("Por favor ingresa una cantidad válida");
      return;
    }

    if (amountToApply > creditInfo.availableCredit) {
      setError("No tienes suficiente crédito disponible");
      return;
    }

    try {
      const response = await fetch("/api/checkout/apply-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountToApply,
          cartTotal,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to apply credit");
      }

      setSuccess("¡Crédito aplicado exitosamente!");
      setAppliedCredit(amountToApply);
      onApplyCredit?.(amountToApply);
      setShowModal(false);
      setCustomAmount("");

      // Update available credit
      setCreditInfo((prev) =>
        prev
          ? {
              ...prev,
              availableCredit: prev.availableCredit - amountToApply,
            }
          : null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error applying credit");
    }
  };

  const removeAppliedCredit = () => {
    setAppliedCredit(0);
    setCustomAmount("");
    if (creditInfo) {
      setCreditInfo({
        ...creditInfo,
        availableCredit: creditInfo.totalBalance - appliedCredit,
      });
    }
  };

  if (!session?.user || loading) return null;

  if (!creditInfo || creditInfo.availableCredit <= 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Credit Card Display */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-4"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/20 p-2">
              <MdCreditCard className="text-primary" size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-400">
                Crédito Disponible
              </p>
              <p className="text-2xl font-bold text-primary">
                ${creditInfo.availableCredit.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowModal(true);
              setError("");
              setSuccess("");
            }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Usar Crédito
          </button>
        </div>

        {/* Applied credit badge */}
        {appliedCredit > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-green-500/20 px-3 py-2 text-sm border border-green-500/30">
            <div className="flex items-center gap-2">
              <MdCheckCircle className="text-green-400" size={18} />
              <span className="text-green-200">
                ${appliedCredit.toFixed(2)} aplicado en esta compra
              </span>
            </div>
            <button
              onClick={removeAppliedCredit}
              className="text-green-400 hover:text-green-300"
            >
              <MdClose size={18} />
            </button>
          </div>
        )}
      </motion.div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md space-y-4 rounded-lg bg-zinc-900 p-6 border border-white/10"
          >
            <h3 className="text-xl font-bold text-white">Aplicar Crédito</h3>

            {error && (
              <div className="rounded-lg bg-red-500/20 border border-red-500/50 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-green-500/20 border border-green-500/50 p-3 text-sm text-green-200">
                {success}
              </div>
            )}

            <div className="space-y-3">
              {/* Info section */}
              <div className="rounded-lg bg-zinc-800 p-3 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Crédito disponible:</span>
                  <span className="font-semibold text-white">
                    ${creditInfo.availableCredit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Total a comprar:</span>
                  <span className="font-semibold text-white">
                    ${cartTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Quick buttons */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-400">
                  Monto a aplicar
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[25, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => {
                        const max = Math.min(
                          amount,
                          creditInfo.availableCredit,
                        );
                        if (max <= cartTotal) {
                          setCustomAmount(max.toString());
                        } else {
                          setCustomAmount(cartTotal.toString());
                        }
                      }}
                      disabled={amount > creditInfo.availableCredit}
                      className="rounded-lg border border-white/20 py-2 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount input */}
              <div>
                <label className="text-sm font-semibold text-zinc-400">
                  Monto personalizado
                </label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  max={Math.min(creditInfo.availableCredit, cartTotal)}
                  min="0"
                  step="0.01"
                  className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-primary"
                  placeholder="0.00"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Máximo: $
                  {Math.min(creditInfo.availableCredit, cartTotal).toFixed(2)}
                </p>
              </div>

              {/* Summary */}
              {customAmount && (
                <div className="rounded-lg bg-primary/20 border border-primary/30 p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Total a comprar:</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Crédito a usar:</span>
                    <span>-${parseFloat(customAmount || "0").toFixed(2)}</span>
                  </div>
                  <div className="border-t border-primary/30 pt-2 mt-2 flex justify-between font-semibold">
                    <span>Total a pagar:</span>
                    <span>
                      $
                      {(cartTotal - parseFloat(customAmount || "0")).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setCustomAmount("");
                  setError("");
                }}
                className="flex-1 rounded-lg border border-white/20 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyCredit}
                disabled={!customAmount}
                className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ApplyCreditCheckout;
