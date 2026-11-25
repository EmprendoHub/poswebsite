"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  MdEmojiEvents,
  MdGroups,
  MdAttachMoney,
  MdImage,
  MdNavigateNext,
} from "react-icons/md";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

interface PublicTournament {
  _id: string;
  tournamentName: string;
  status: "active" | "completed" | "upcoming";
  startDate: string;
  endDate: string;
  totalParticipants: number;
  prizePool: number;
  winner?: {
    name: string;
    position: number;
  };
  imageCount: number;
}

interface GalleryImage {
  _id: string;
  url: string;
  caption: string;
  uploadedBy: string;
  uploadedAt: string;
}

const PublicTournamentHistory = () => {
  const [tournaments, setTournaments] = useState<PublicTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] =
    useState<PublicTournament | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "completed" | "upcoming">("all");

  useEffect(() => {
    const fetchPublicHistory = async () => {
      try {
        const response = await fetch("/api/tournaments/public-history");
        if (!response.ok) throw new Error("Failed to fetch public history");
        const data = await response.json();
        setTournaments(data.tournaments || []);
      } catch (err) {
        setError("Error loading tournament history");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicHistory();
  }, []);

  const fetchGallery = async (tournamentId: string) => {
    setGalleryLoading(true);
    try {
      const response = await fetch(
        `/api/supervisor/tournaments/${tournamentId}/gallery`,
      );
      if (!response.ok) throw new Error("Failed to fetch gallery");
      const data = await response.json();
      setGalleryImages(data.images || []);
    } catch (err) {
      console.error("Error fetching gallery:", err);
      setGalleryImages([]);
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleSelectTournament = (tournament: PublicTournament) => {
    setSelectedTournament(tournament);
    fetchGallery(tournament._id);
  };

  const filteredTournaments = tournaments.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

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
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MdEmojiEvents className="text-primary" size={28} />
          <h2 className="text-3xl font-bold text-white">
            Historial Público de Torneos
          </h2>
        </div>
        <p className="text-sm text-zinc-400">
          Revisa los resultados, ganadores y galerías de torneos pasados
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/20 border border-red-500/50 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
        {(["all", "completed", "upcoming"] as const).map((f) => (
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
            {f === "completed" && "Completados"}
            {f === "upcoming" && "Próximos"}
          </button>
        ))}
      </div>

      {/* Tournaments Grid */}
      {filteredTournaments.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTournaments.map((tournament) => (
            <motion.div
              key={tournament._id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              onClick={() => handleSelectTournament(tournament)}
              className="group cursor-pointer relative overflow-hidden rounded-lg border border-white/10 bg-zinc-900 transition hover:border-primary/50"
            >
              {/* Status badge */}
              <div className="absolute top-3 right-3 z-10">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest border ${
                    tournament.status === "completed"
                      ? "bg-green-500/20 text-green-200 border-green-500/30"
                      : "bg-blue-500/20 text-blue-200 border-blue-500/30"
                  }`}
                >
                  {tournament.status === "completed"
                    ? "✓ Completado"
                    : "⏰ Próximo"}
                </span>
              </div>

              {/* Image placeholder */}
              <div className="h-40 w-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center relative overflow-hidden">
                {tournament.imageCount > 0 ? (
                  <div className="flex items-center justify-center gap-2 text-white">
                    <MdImage size={24} />
                    <span className="text-sm font-semibold">
                      {tournament.imageCount} fotos
                    </span>
                  </div>
                ) : (
                  <MdEmojiEvents size={48} className="text-primary/50" />
                )}
              </div>

              {/* Content */}
              <div className="space-y-3 p-4">
                <h3 className="text-lg font-semibold text-white line-clamp-2">
                  {tournament.tournamentName}
                </h3>

                {/* Winner info */}
                {tournament.winner && tournament.status === "completed" && (
                  <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-2 text-center">
                    <p className="text-xs text-yellow-200 font-semibold">
                      🏆 Ganador
                    </p>
                    <p className="text-sm font-bold text-yellow-300 mt-1">
                      {tournament.winner.name}
                    </p>
                  </div>
                )}

                {/* Stats */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-zinc-400">
                      <MdGroups size={16} /> Participantes
                    </span>
                    <span className="font-semibold text-white">
                      {tournament.totalParticipants}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-zinc-400">
                      <MdAttachMoney size={16} /> Fondo
                    </span>
                    <span className="font-semibold text-green-400">
                      ${tournament.prizePool.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* CTA Button */}
                <button className="w-full rounded-lg bg-primary/20 py-2 text-sm font-semibold text-primary transition hover:bg-primary/30 flex items-center justify-center gap-2 border border-primary/30">
                  Ver detalles
                  <MdNavigateNext size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-zinc-900 p-12 text-center">
          <MdEmojiEvents size={48} className="mx-auto mb-3 text-zinc-500" />
          <p className="text-zinc-400">
            {filter === "all"
              ? "No hay torneos en el historial"
              : filter === "completed"
                ? "No hay torneos completados"
                : "No hay torneos próximos"}
          </p>
        </div>
      )}

      {/* Tournament Details Modal */}
      {selectedTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-lg bg-zinc-900 border border-white/10 my-8"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-6 border-b border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {selectedTournament.tournamentName}
                  </h2>
                  <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                    <span className="flex items-center gap-1">
                      <MdGroups size={16} />{" "}
                      {selectedTournament.totalParticipants} participantes
                    </span>
                    <span className="flex items-center gap-1">
                      <MdAttachMoney size={16} /> $
                      {selectedTournament.prizePool.toFixed(2)} en premios
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTournament(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Winner Info */}
              {selectedTournament.winner &&
                selectedTournament.status === "completed" && (
                  <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-4">
                    <p className="text-sm text-yellow-200 font-semibold mb-2">
                      🏆 Ganador del Torneo
                    </p>
                    <p className="text-2xl font-bold text-yellow-300">
                      {selectedTournament.winner.name}
                    </p>
                    <p className="text-xs text-yellow-200 mt-1">
                      Ha ganado crédito para usar en la tienda
                    </p>
                  </div>
                )}

              {/* Gallery */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MdImage size={20} /> Galería de Fotos
                </h3>

                {galleryLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-40 rounded-lg bg-zinc-800 animate-pulse"
                      />
                    ))}
                  </div>
                ) : galleryImages.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {galleryImages.map((image) => (
                      <motion.div
                        key={image._id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-lg overflow-hidden border border-white/10 hover:border-primary/50 transition group cursor-pointer"
                      >
                        <div className="relative h-40 w-full bg-zinc-800 group-hover:opacity-75 transition">
                          <Image
                            src={image.url}
                            alt={image.caption}
                            fill
                            className="object-cover group-hover:scale-110 transition"
                          />
                        </div>
                        {image.caption && (
                          <div className="p-3 bg-zinc-800">
                            <p className="text-sm text-white font-semibold line-clamp-2">
                              {image.caption}
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">
                              Por {image.uploadedBy}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-zinc-800 p-8 text-center">
                    <MdImage size={40} className="mx-auto mb-2 text-zinc-500" />
                    <p className="text-zinc-400">No hay fotos en la galería</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 p-6 flex justify-end">
              <button
                onClick={() => setSelectedTournament(null)}
                className="rounded-lg border border-white/20 px-6 py-2 font-semibold text-white transition hover:bg-white/5"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PublicTournamentHistory;
