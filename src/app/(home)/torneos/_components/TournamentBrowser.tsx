"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  MdEmojiEvents,
  MdGroups,
  MdAttachMoney,
  MdTimer,
} from "react-icons/md";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

interface Tournament {
  _id: string;
  tournamentName: string;
  description: string;
  ticketCost: number;
  startDate: string;
  endDate: string;
  maxParticipants: number;
  currentParticipants: number;
  prizePool: number;
  status: "active" | "completed" | "upcoming";
  image?: string;
}

interface RegistrationData {
  tournamentId: string;
  participantName: string;
  quantity: number;
}

const TournamentBrowser = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    tournamentId: "",
    participantName: "",
    quantity: 1,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch active tournaments
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch("/api/tournaments/active");
        if (!response.ok) throw new Error("Failed to fetch tournaments");
        const data = await response.json();
        setTournaments(data.tournaments || []);
      } catch (err) {
        setError("Error loading tournaments");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  const handleRegister = async (tournament: Tournament) => {
    if (!session?.user) {
      router.push("/iniciar");
      return;
    }
    setSelectedTournament(tournament);
    setRegistrationData({
      tournamentId: tournament._id,
      participantName: session.user.name || "",
      quantity: 1,
    });
  };

  const submitRegistration = async () => {
    if (!registrationData.participantName) {
      setError("Por favor ingresa tu nombre");
      return;
    }

    setRegistering(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/tournaments/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: registrationData.tournamentId,
          participantName: registrationData.participantName,
          quantity: registrationData.quantity,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Registration failed");
      }

      setSuccess("¡Inscripción exitosa! Revisa tu correo para confirmar.");
      setSelectedTournament(null);
      setRegistrationData({
        tournamentId: "",
        participantName: "",
        quantity: 1,
      });

      // Refresh tournaments
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error durante la inscripción",
      );
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
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
          <h2 className="text-3xl font-bold text-white">Torneos Activos</h2>
        </div>
        <p className="text-sm text-zinc-400">
          Participa en nuestros torneos y gana créditos para tu próxima compra
        </p>
      </div>

      {/* Tournaments Grid */}
      {tournaments.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((tournament) => (
            <motion.div
              key={tournament._id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-lg border border-white/10 bg-zinc-900 transition hover:border-primary/50"
            >
              {/* Image placeholder */}
              {tournament.image ? (
                <Image
                  src={tournament.image}
                  alt={tournament.tournamentName}
                  width={300}
                  height={200}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="h-40 w-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                  <MdEmojiEvents size={48} className="text-primary/50" />
                </div>
              )}

              {/* Content */}
              <div className="space-y-3 p-4">
                <h3 className="text-lg font-semibold text-white line-clamp-2">
                  {tournament.tournamentName}
                </h3>

                <p className="text-xs text-zinc-400 line-clamp-2">
                  {tournament.description}
                </p>

                {/* Stats */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-zinc-400">
                      <MdAttachMoney size={16} /> Entrada
                    </span>
                    <span className="font-semibold text-primary">
                      ${tournament.ticketCost}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-zinc-400">
                      <MdGroups size={16} /> Participantes
                    </span>
                    <span className="font-semibold text-white">
                      {tournament.currentParticipants}/
                      {tournament.maxParticipants}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-zinc-400">
                      <MdAttachMoney size={16} /> Fondo de Premios
                    </span>
                    <span className="font-semibold text-green-400">
                      ${tournament.prizePool.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-2 text-xs text-zinc-500 border-t border-white/5 pt-3">
                  <MdTimer size={14} />
                  <span>
                    {new Date(tournament.startDate).toLocaleDateString("es-MX")}{" "}
                    - {new Date(tournament.endDate).toLocaleDateString("es-MX")}
                  </span>
                </div>

                {/* Register Button */}
                <button
                  onClick={() => handleRegister(tournament)}
                  disabled={
                    tournament.currentParticipants >= tournament.maxParticipants
                  }
                  className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tournament.currentParticipants >= tournament.maxParticipants
                    ? "Torneo Lleno"
                    : "Inscribirse"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-zinc-900 p-12 text-center">
          <MdEmojiEvents size={48} className="mx-auto mb-3 text-zinc-500" />
          <p className="text-zinc-400">
            No hay torneos activos en este momento
          </p>
        </div>
      )}

      {/* Registration Modal */}
      {selectedTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md space-y-4 rounded-lg bg-zinc-900 p-6 border border-white/10"
          >
            <h3 className="text-xl font-bold text-white">
              Inscribirse en {selectedTournament.tournamentName}
            </h3>

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
              <div>
                <label className="text-sm font-semibold text-zinc-400">
                  Nombre del Participante
                </label>
                <input
                  type="text"
                  value={registrationData.participantName}
                  onChange={(e) =>
                    setRegistrationData({
                      ...registrationData,
                      participantName: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 outline-none ring-1 ring-white/10 focus:ring-primary"
                  placeholder="Tu nombre completo"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-zinc-400">
                  Cantidad de Entradas
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={registrationData.quantity}
                  onChange={(e) =>
                    setRegistrationData({
                      ...registrationData,
                      quantity: parseInt(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-primary"
                />
              </div>

              <div className="rounded-lg bg-zinc-800 p-3 text-sm">
                <div className="flex justify-between">
                  <span>Costo por entrada:</span>
                  <span>${selectedTournament.ticketCost}</span>
                </div>
                <div className="flex justify-between font-semibold text-primary mt-1 border-t border-white/10 pt-2">
                  <span>Total:</span>
                  <span>
                    ${selectedTournament.ticketCost * registrationData.quantity}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedTournament(null)}
                className="flex-1 rounded-lg border border-white/20 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={submitRegistration}
                disabled={registering}
                className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {registering ? "Inscribiendo..." : "Confirmar Inscripción"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TournamentBrowser;
