"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MdEmojiEvents, MdSearch } from "react-icons/md";

interface LeaderboardEntry {
  position: number;
  customerName: string;
  email: string;
  creditsEarned: number;
  tournamentWins: number;
  badgesEarned: number;
}

const PointsLeaderboard = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if ((session?.user as any)?.role !== "organizador") {
      router.push("/no-autorizado");
      return;
    }

    const fetchLeaderboard = async () => {
      try {
        const response = await fetch("/api/supervisor/leaderboard");
        if (!response.ok) {
          // Handle empty response
          if (response.status === 404) {
            setLeaderboard([]);
          } else {
            throw new Error("Failed to fetch leaderboard");
          }
        } else {
          const data = await response.json();
          setLeaderboard(data.leaderboard || []);
        }
      } catch (err) {
        console.error("Error loading leaderboard:", err);
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [session, router]);

  const filteredLeaderboard = leaderboard.filter((entry) =>
    entry.customerName.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Tabla de Posiciones
        </h2>
        <p className="text-sm text-zinc-400">
          Top Ganadores del torneo y acumuladores de créditos
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/20 border border-red-500/50 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <MdSearch className="absolute left-3 top-3 text-zinc-500" size={20} />
        <input
          type="text"
          placeholder="Search customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg bg-zinc-800 pl-10 pr-4 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-primary"
        />
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <div className="space-y-3">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-5 gap-4 px-4 py-3 text-sm font-semibold text-zinc-400 uppercase tracking-widest">
            <div>Rank</div>
            <div>Customer</div>
            <div className="text-right">Créditos Ganados</div>
            <div className="text-right">Victorias</div>
            <div className="text-right">Insignias</div>
          </div>

          {/* Entries */}
          {filteredLeaderboard.length > 0 ? (
            filteredLeaderboard.map((entry, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-lg border border-white/10 bg-zinc-900 p-4 hover:border-primary/50 transition"
              >
                <div className="grid sm:grid-cols-5 gap-4 items-center">
                  {/* Rank */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                        entry.position === 1
                          ? "bg-yellow-500/20 text-yellow-400"
                          : entry.position === 2
                            ? "bg-gray-400/20 text-gray-300"
                            : entry.position === 3
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-zinc-700 text-zinc-300"
                      }`}
                    >
                      {entry.position === 1 && "🥇"}
                      {entry.position === 2 && "🥈"}
                      {entry.position === 3 && "🥉"}
                      {entry.position > 3 && entry.position}
                    </div>
                    <div className="sm:hidden">
                      <p className="font-semibold text-white">
                        {entry.customerName}
                      </p>
                      <p className="text-xs text-zinc-400">{entry.email}</p>
                    </div>
                  </div>

                  {/* Customer Info (desktop only) */}
                  <div className="hidden sm:block">
                    <p className="font-semibold text-white">
                      {entry.customerName}
                    </p>
                    <p className="text-xs text-zinc-400">{entry.email}</p>
                  </div>

                  {/* Credits */}
                  <div className="text-right">
                    <p className="font-bold text-green-400">
                      ${entry.creditsEarned.toFixed(2)}
                    </p>
                    <p className="text-xs text-zinc-400 sm:hidden">Créditos</p>
                  </div>

                  {/* Wins */}
                  <div className="text-right">
                    <p className="font-bold text-blue-400">
                      {entry.tournamentWins}
                    </p>
                    <p className="text-xs text-zinc-400 sm:hidden">Victorias</p>
                  </div>

                  {/* Badges */}
                  <div className="text-right">
                    <p className="font-bold text-purple-400">
                      {entry.badgesEarned}
                    </p>
                    <p className="text-xs text-zinc-400 sm:hidden">Insignias</p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="rounded-lg border border-white/10 bg-zinc-900 p-12 text-center">
              <MdEmojiEvents size={48} className="mx-auto mb-3 text-zinc-500" />
              <p className="text-zinc-400">No se encontraron clientes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PointsLeaderboard;
