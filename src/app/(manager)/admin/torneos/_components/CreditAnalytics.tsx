"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MdTrendingUp,
  MdSearch,
  MdAttachMoney,
  MdGroups,
} from "react-icons/md";

interface AnalyticsData {
  totalRevenue: number;
  totalParticipants: number;
  totalTournaments: number;
  averageTicketCost: number;
  totalCreditsAwarded: number;
  topTournaments: Array<{
    name: string;
    participants: number;
    revenue: number;
  }>;
  creditsbyStatus: {
    active: number;
    expired: number;
    used: number;
  };
}

const CreditAnalytics = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if ((session?.user as any)?.role !== "organizador") {
      router.push("/no-autorizado");
      return;
    }

    const fetchAnalytics = async () => {
      try {
        const response = await fetch("/api/supervisor/credit-analytics");
        if (!response.ok) {
          // Handle empty response or errors
          if (response.status === 404) {
            setAnalytics(null);
          } else {
            throw new Error("Failed to fetch analytics");
          }
        } else {
          const data = await response.json();
          setAnalytics(data);
        }
      } catch (err) {
        console.error("Error loading analytics:", err);
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [session, router]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="rounded-lg border border-white/10 bg-zinc-900 p-12 text-center">
        <p className="text-zinc-400">{error || "No data available"}</p>
      </div>
    );
  }

  // Provide defaults for analytics properties
  const analyticsData = {
    totalRevenue: analytics?.totalRevenue ?? 0,
    totalParticipants: analytics?.totalParticipants ?? 0,
    totalTournaments: analytics?.totalTournaments ?? 0,
    averageTicketCost: analytics?.averageTicketCost ?? 0,
    totalCreditsAwarded: analytics?.totalCreditsAwarded ?? 0,
    topTournaments: analytics?.topTournaments ?? [],
    creditsbyStatus: analytics?.creditsbyStatus ?? {
      active: 0,
      expired: 0,
      used: 0,
    },
  };

  const statCards = [
    {
      title: "Ingresos Totales",
      value: `$${analyticsData.totalRevenue.toFixed(2)}`,
      icon: MdAttachMoney,
      color: "text-green-400",
      bgColor: "bg-green-500/20",
    },
    {
      title: "Total de Participantes",
      value: analyticsData.totalParticipants,
      icon: MdGroups,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
    },
    {
      title: "Torneos Activos",
      value: analyticsData.totalTournaments,
      icon: MdTrendingUp,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
    },
    {
      title: "Créditos Otorgados",
      value: `$${analyticsData.totalCreditsAwarded.toFixed(2)}`,
      icon: MdAttachMoney,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white">Tablero Analítico</h2>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg border border-white/10 p-4 ${stat.bgColor}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    {stat.title}
                  </p>
                  <p className={`text-2xl font-bold mt-2 ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
                <Icon className={stat.color} size={28} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Top Tournaments */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Top Torneos</h3>
        <div className="space-y-3">
          {analyticsData.topTournaments.map((tournament, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-lg border border-white/10 bg-zinc-900 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-white">
                    {tournament.name}
                  </h4>
                  <p className="text-sm text-zinc-400 mt-1">
                    {tournament.participants} participantes
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-400">
                    ${tournament.revenue.toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-400">Ingresos</p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-primary transition"
                  style={{
                    width: `${
                      (tournament.participants /
                        (analyticsData.totalParticipants || 1)) *
                      100
                    }%`,
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Credit Status */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Estado de Créditos
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-green-500/30 bg-green-500/20 p-4">
            <p className="text-sm text-zinc-400">Créditos Activos</p>
            <p className="text-2xl font-bold text-green-400 mt-1">
              {analyticsData.creditsbyStatus.active}
            </p>
          </div>
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/20 p-4">
            <p className="text-sm text-zinc-400">Créditos Usados</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">
              {analyticsData.creditsbyStatus.used}
            </p>
          </div>
          <div className="rounded-lg border border-red-500/30 bg-red-500/20 p-4">
            <p className="text-sm text-zinc-400">Créditos Expirados</p>
            <p className="text-2xl font-bold text-red-400 mt-1">
              {analyticsData.creditsbyStatus.expired}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditAnalytics;
