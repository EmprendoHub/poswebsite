"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MdAccountBalance,
  MdCreditCard,
  MdHistory,
  MdTimer,
  MdCheckCircle,
  MdCancelScheduleSend,
} from "react-icons/md";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

interface CreditTransaction {
  _id: string;
  type: "earned" | "spent" | "expired" | "adjusted";
  amount: number;
  balance: number;
  description: string;
  expiryDate?: string;
  daysRemaining?: number;
  status: "active" | "expired" | "used";
  createdAt: string;
}

interface CreditData {
  totalBalance: number;
  transactions: CreditTransaction[];
  activeCredits: number;
  expiredCredits: number;
  usedCredits: number;
}

const CreditDashboard = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [creditData, setCreditData] = useState<CreditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "used">(
    "active",
  );

  useEffect(() => {
    if (!session?.user) {
      router.push("/iniciar");
      return;
    }

    const fetchCredit = async () => {
      try {
        const response = await fetch("/api/customer-credit");
        if (!response.ok) throw new Error("Failed to fetch credit data");
        const data = await response.json();
        setCreditData(data);
      } catch (err) {
        setError("Error loading credit data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCredit();
  }, [session, router]);

  if (!session?.user) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-zinc-900 animate-pulse"
            />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-zinc-900 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!creditData) {
    return (
      <div className="rounded-lg border border-white/10 bg-zinc-900 p-12 text-center">
        <p className="text-zinc-400">{error || "Sin datos de crédito"}</p>
      </div>
    );
  }

  const filteredTransactions = creditData.transactions.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  const stats = [
    {
      label: "Crédito Disponible",
      value: `$${creditData.totalBalance.toFixed(2)}`,
      icon: MdAccountBalance,
      color: "text-green-400",
      bgColor: "bg-green-500/20",
    },
    {
      label: "Créditos Activos",
      value: creditData.activeCredits,
      icon: MdCheckCircle,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
    },
    {
      label: "Créditos Vencidos",
      value: creditData.expiredCredits,
      icon: MdCancelScheduleSend,
      color: "text-red-400",
      bgColor: "bg-red-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MdCreditCard className="text-primary" size={28} />
          <h2 className="text-3xl font-bold text-white">Mi Crédito</h2>
        </div>
        <p className="text-sm text-zinc-400">
          Administra y visualiza tus créditos disponibles
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-lg border border-white/10 bg-zinc-900 p-4 hover:border-primary/50 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    {stat.label}
                  </p>
                  <p className={`text-2xl font-bold mt-2 ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`rounded-lg p-3 ${stat.bgColor}`}>
                  <Icon className={stat.color} size={24} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* How to Use Credit */}
      <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="font-semibold text-white mb-1">
              ¿Cómo usar tu crédito?
            </h4>
            <p className="text-sm text-zinc-300">
              Tu crédito se puede usar en cualquier momento durante el checkout.
              Tienes 6 meses desde que lo ganaste para utilizarlo antes de que
              expire automáticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MdHistory className="text-zinc-400" size={20} />
              <h3 className="text-lg font-semibold text-white">
                Historial de Transacciones
              </h3>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
            {(["all", "active", "expired", "used"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
                  filter === f
                    ? "border-b-2 border-primary text-primary"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {f === "all" && "Todos"}
                {f === "active" && "Activos"}
                {f === "expired" && "Vencidos"}
                {f === "used" && "Utilizados"}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction List */}
        {filteredTransactions.length > 0 ? (
          <div className="space-y-3">
            {filteredTransactions.map((tx, idx) => (
              <motion.div
                key={tx._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-lg border border-white/10 bg-zinc-900 p-4 hover:border-primary/30 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left - Transaction info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-full p-2 ${
                          tx.status === "active"
                            ? "bg-green-500/20"
                            : tx.status === "expired"
                              ? "bg-red-500/20"
                              : "bg-blue-500/20"
                        }`}
                      >
                        {tx.status === "active" && (
                          <MdCheckCircle className="text-green-400" size={18} />
                        )}
                        {tx.status === "expired" && (
                          <MdCancelScheduleSend
                            className="text-red-400"
                            size={18}
                          />
                        )}
                        {tx.status === "used" && (
                          <MdCreditCard className="text-blue-400" size={18} />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {tx.type === "earned" && "🏆 Crédito Ganado"}
                          {tx.type === "spent" && "💳 Crédito Utilizado"}
                          {tx.type === "expired" && "⏰ Crédito Vencido"}
                          {tx.type === "adjusted" && "⚙️ Ajuste Manual"}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {tx.description}
                        </p>
                      </div>
                    </div>

                    {/* Dates and details */}
                    <div className="flex flex-wrap gap-4 text-xs text-zinc-500 ml-10">
                      <span>
                        {new Date(tx.createdAt).toLocaleDateString("es-MX")}
                      </span>
                      {tx.expiryDate && (
                        <span className="flex items-center gap-1">
                          <MdTimer size={12} />
                          Vence:{" "}
                          {new Date(tx.expiryDate).toLocaleDateString("es-MX")}
                          {tx.daysRemaining && (
                            <span className="ml-1">
                              ({tx.daysRemaining} días)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right - Amount */}
                  <div className="flex flex-col items-end">
                    <span
                      className={`text-lg font-bold ${
                        tx.type === "earned"
                          ? "text-green-400"
                          : tx.type === "spent"
                            ? "text-red-400"
                            : "text-zinc-400"
                      }`}
                    >
                      {tx.type === "earned" || tx.type === "adjusted"
                        ? "+"
                        : "-"}
                      ${tx.amount.toFixed(2)}
                    </span>
                    <span className="text-xs text-zinc-500 mt-1">
                      Balance: ${tx.balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-zinc-900 p-8 text-center">
            <MdHistory size={40} className="mx-auto mb-3 text-zinc-500" />
            <p className="text-zinc-400">No hay transacciones en este filtro</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditDashboard;
