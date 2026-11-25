"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { motion } from "framer-motion";
import { MdEmojiEvents, MdCollections, MdStar } from "react-icons/md";

interface Badge {
  _id: string;
  badgeName: string;
  description: string;
  icon?: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  tournamentId: string;
  earnedDate: string;
}

interface ProfileBadgesProps {
  userId?: string;
  compact?: boolean;
}

const ProfileTournaments = ({
  userId,
  compact = false,
}: ProfileBadgesProps) => {
  const { data: session } = useSession();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  useEffect(() => {
    if (!session?.user && !userId) return;

    const fetchBadges = async () => {
      try {
        // This endpoint returns badges for the current user or specified user
        const response = await fetch(
          `/api/customer-credit?${userId ? `userId=${userId}` : ""}`,
        );
        if (!response.ok) throw new Error("Failed to fetch badges");
        const data = await response.json();
        setBadges(data.badgesEarned || []);
      } catch (err) {
        console.error("Error fetching badges:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [session, userId]);

  const rarityConfig = {
    common: {
      color: "text-gray-300",
      bgColor: "bg-gray-500/20",
      borderColor: "border-gray-500/30",
    },
    rare: {
      color: "text-blue-300",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500/30",
    },
    epic: {
      color: "text-purple-300",
      bgColor: "bg-purple-500/20",
      borderColor: "border-purple-500/30",
    },
    legendary: {
      color: "text-yellow-300",
      bgColor: "bg-yellow-500/20",
      borderColor: "border-yellow-500/30",
    },
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-zinc-900 animate-pulse" />
        ))}
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-zinc-900 p-8 text-center">
        <MdEmojiEvents size={40} className="mx-auto mb-3 text-zinc-500" />
        <p className="text-zinc-400">
          Aún no has ganado ningún torneo para obtener insignias
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MdCollections className="text-primary" size={20} />
          <h3 className="font-semibold text-white">Insignias Ganadas</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {badges.slice(0, 6).map((badge) => (
            <motion.div
              key={badge._id}
              whileHover={{ scale: 1.1 }}
              className={`rounded-lg p-3 cursor-pointer border transition ${
                rarityConfig[badge.rarity].bgColor
              } ${rarityConfig[badge.rarity].borderColor}`}
            >
              <span className="text-2xl block text-center">🎖️</span>
              <p
                className={`text-xs font-bold text-center mt-1 ${
                  rarityConfig[badge.rarity].color
                }`}
              >
                {badge.badgeName}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MdCollections className="text-primary" size={28} />
          <h2 className="text-3xl font-bold text-white">Mis Insignias</h2>
        </div>
        <p className="text-sm text-zinc-400">
          Colecciona insignias ganando torneos
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/20 border border-red-500/50 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Badges Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {badges.map((badge) => {
          const config = rarityConfig[badge.rarity];
          return (
            <motion.div
              key={badge._id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              viewport={{ once: true }}
              onClick={() => setSelectedBadge(badge)}
              className={`group rounded-lg p-6 border cursor-pointer transition ${config.bgColor} ${config.borderColor} hover:border-primary/50`}
            >
              <div className="text-center space-y-3">
                {/* Badge Icon */}
                <div className="text-5xl mx-auto">🎖️</div>

                {/* Badge Name */}
                <div>
                  <h3 className={`text-sm font-bold ${config.color}`}>
                    {badge.badgeName}
                  </h3>
                </div>

                {/* Rarity */}
                <div className="flex items-center justify-center gap-1 text-xs">
                  {[1, 2, 3, 4].map((i) => (
                    <MdStar
                      key={i}
                      className={
                        i <=
                        (badge.rarity === "common"
                          ? 1
                          : badge.rarity === "rare"
                            ? 2
                            : badge.rarity === "epic"
                              ? 3
                              : 4)
                          ? config.color
                          : "text-zinc-700"
                      }
                      size={14}
                    />
                  ))}
                </div>

                {/* Earned Date */}
                <p className="text-xs text-zinc-500">
                  Obtenida el{" "}
                  {new Date(badge.earnedDate).toLocaleDateString("es-MX")}
                </p>

                {/* View Details Button */}
                <button className="w-full rounded-lg bg-primary/20 py-2 text-xs font-semibold text-primary transition hover:bg-primary/30 group-hover:bg-primary/30">
                  Ver Detalles
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Badge Details Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-lg bg-zinc-900 border border-white/10 p-6 space-y-4"
          >
            {/* Badge Display */}
            <div
              className={`rounded-lg p-8 text-center ${
                rarityConfig[selectedBadge.rarity].bgColor
              } ${rarityConfig[selectedBadge.rarity].borderColor} border`}
            >
              <div className="text-7xl mb-4">🎖️</div>
              <h2
                className={`text-2xl font-bold ${
                  rarityConfig[selectedBadge.rarity].color
                }`}
              >
                {selectedBadge.badgeName}
              </h2>
            </div>

            {/* Details */}
            <div className="space-y-3">
              {/* Rarity */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  Rareza
                </label>
                <div className="flex items-center gap-2 mt-1">
                  {[1, 2, 3, 4].map((i) => (
                    <MdStar
                      key={i}
                      className={
                        i <=
                        (selectedBadge.rarity === "common"
                          ? 1
                          : selectedBadge.rarity === "rare"
                            ? 2
                            : selectedBadge.rarity === "epic"
                              ? 3
                              : 4)
                          ? rarityConfig[selectedBadge.rarity].color
                          : "text-zinc-700"
                      }
                      size={18}
                    />
                  ))}
                  <span
                    className={`text-sm font-semibold uppercase ml-2 ${
                      rarityConfig[selectedBadge.rarity].color
                    }`}
                  >
                    {selectedBadge.rarity}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  Descripción
                </label>
                <p className="text-sm text-white mt-1">
                  {selectedBadge.description}
                </p>
              </div>

              {/* Earned Date */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  Obtenida
                </label>
                <p className="text-sm text-white mt-1">
                  {new Date(selectedBadge.earnedDate).toLocaleDateString(
                    "es-MX",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full rounded-lg border border-white/20 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              Cerrar
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProfileTournaments;
