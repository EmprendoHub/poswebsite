"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  MdHistory,
  MdEmojiEvents,
  MdCalendarToday,
  MdTimer,
} from "react-icons/md";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

interface TournamentHistory {
  _id: string;
  tournamentId: string;
  tournamentName: string;
  status: "participated" | "won";
  creditsWon?: number;
  badgesEarned?: Array<{
    _id: string;
    badgeName: string;
    description: string;
  }>;
  registrationDate: string;
  tournamentStartDate: string;
  tournamentEndDate: string;
}

const MyTournaments = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<TournamentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "participated" | "won">("all");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.user) {
      router.push("/iniciar");
      return;
    }

    const fetchHistory = async () => {
      try {
        const response = await fetch("/api/tournaments/my-history");
        if (!response.ok) throw new Error("Failed to fetch tournament history");
        const data = await response.json();
        setTournaments(data.tournaments || []);
      } catch (err) {
        setError("Error loading tournament history");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [session, router]);

  const filteredTournaments = tournaments.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  if (!session?.user) return null;

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MdHistory className="text-primary" size={28} />
          <h2 className="text-3xl font-bold text-white">Mis Torneos</h2>
        </div>
        <p className="text-sm text-zinc-400">
          Historial de participación en torneos y premios ganados
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
        {(["all", "participated", "won"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-3 text-sm font-semibold transition whitespace-nowrap ${
              filter === f
                ? "border-b-2 border-primary text-primary"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {f === "all" && "Todos"}
            {f === "participated" && "Participé"}
            {f === "won" && "Gané"}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/20 border border-red-500/50 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Tournaments List */}
      {filteredTournaments.length > 0 ? (
        <div className="space-y-4">
          {filteredTournaments.map((tournament, idx) => (
            <motion.div
              key={tournament._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group relative overflow-hidden rounded-lg border border-white/10 bg-gradient-to-r from-zinc-900 to-zinc-900/50 p-5 transition hover:border-primary/50 hover:bg-zinc-900"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Left side - Tournament info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2 ${
                        tournament.status === "won"
                          ? "bg-yellow-500/20"
                          : "bg-blue-500/20"
                      }`}
                    >
                      <MdEmojiEvents
                        className={
                          tournament.status === "won"
                            ? "text-yellow-400"
                            : "text-blue-400"
                        }
                        size={20}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {tournament.tournamentName}
                      </h3>
                      <span
                        className={`text-xs font-semibold uppercase tracking-widest ${
                          tournament.status === "won"
                            ? "text-yellow-400"
                            : "text-blue-400"
                        }`}
                      >
                        {tournament.status === "won"
                          ? "🏆 Ganador"
                          : "✓ Participé"}
                      </span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex flex-wrap gap-4 text-xs text-zinc-400 mt-2">
                    <span className="flex items-center gap-1">
                      <MdTimer size={14} />
                      Fechas:{" "}
                      {new Date(
                        tournament.tournamentStartDate,
                      ).toLocaleDateString("es-MX", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      -{" "}
                      {new Date(
                        tournament.tournamentEndDate,
                      ).toLocaleDateString("es-MX", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MdCalendarToday size={14} />
                      Inscripción:{" "}
                      {new Date(tournament.registrationDate).toLocaleDateString(
                        "es-MX",
                      )}
                    </span>
                  </div>

                  {/* Badges */}
                  {tournament.badgesEarned &&
                    tournament.badgesEarned.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {tournament.badgesEarned.map((badge) => (
                          <span
                            key={badge._id}
                            className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary border border-primary/30 flex items-center gap-1"
                          >
                            🎖️ {badge.badgeName}
                          </span>
                        ))}
                      </div>
                    )}
                </div>

                {/* Right side - Credits */}
                {tournament.status === "won" && tournament.creditsWon ? (
                  <div className="flex flex-col items-end justify-center sm:min-w-fit">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                      Créditos Ganados
                    </span>
                    <span className="text-3xl font-bold text-green-400">
                      ${tournament.creditsWon.toFixed(2)}
                    </span>
                    <span className="text-xs text-zinc-400 mt-1">
                      Válido por 6 meses
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-end justify-center sm:min-w-fit">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest">
                      Estado
                    </span>
                    <span className="text-sm font-semibold text-zinc-300 mt-2">
                      No ganaste en este
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-zinc-900 p-12 text-center">
          <MdHistory size={48} className="mx-auto mb-3 text-zinc-500" />
          <p className="text-zinc-400">
            {filter === "all"
              ? "Aún no has participado en ningún torneo"
              : filter === "won"
                ? "No has ganado ningún torneo"
                : "No has participado en ningún torneo"}
          </p>
          <a
            href="/torneos"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Ver Torneos Activos
          </a>
        </div>
      )}
    </div>
  );
};

export default MyTournaments;
