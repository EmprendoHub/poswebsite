"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MdEmojiEvents,
  MdSearch,
  MdClose,
  MdSave,
  MdAttachMoney,
  MdEdit,
} from "react-icons/md";

interface Participant {
  _id: string;
  participantName: string;
  status: string;
  user?: {
    email: string;
    name: string;
  };
}

interface Tournament {
  _id: string;
  tournamentName: string;
  status: string;
}

interface Badge {
  _id: string;
  badgeName: string;
  rarity: string;
}

const AssignWinner = ({ tournamentId }: { tournamentId: string }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if ((session?.user as any)?.role !== "organizador") {
      router.push("/no-autorizado");
      return;
    }

    const fetchData = async () => {
      try {
        // If no tournamentId provided, show empty state
        if (!tournamentId) {
          setParticipants([]);
          setBadges([]);
          setLoading(false);
          return;
        }

        const [tournamentRes, participantsRes, badgesRes] = await Promise.all([
          fetch(`/api/supervisor/tournaments/${tournamentId}`),
          fetch(`/api/supervisor/tournaments/${tournamentId}/participants`),
          fetch(`/api/supervisor/tournaments/${tournamentId}/badges`),
        ]);

        if (tournamentRes.ok) {
          const tournamentData = await tournamentRes.json();
          setTournament(tournamentData.tournament);
        }

        if (participantsRes.ok) {
          const participantsData = await participantsRes.json();
          setParticipants(
            participantsData.participants?.filter(
              (p: any) => p.status === "active",
            ) || [],
          );
        } else {
          setParticipants([]);
        }

        if (badgesRes.ok) {
          const badgesData = await badgesRes.json();
          setBadges(badgesData.badges || []);
        } else {
          setBadges([]);
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setParticipants([]);
        setBadges([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, router, tournamentId]);

  const handleAssignWinner = async () => {
    if (!selectedParticipant || !creditAmount) {
      setError("Please select a participant and enter credit amount");
      return;
    }

    try {
      const response = await fetch(
        `/api/supervisor/tournaments/${tournamentId}/assign-winner`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantId: selectedParticipant._id,
            creditAmount: parseFloat(creditAmount),
            badgeIds: selectedBadges,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to assign winner");
      }

      setSuccess("Winner assigned successfully!");
      setShowModal(false);
      setCreditAmount("");
      setSelectedBadges([]);
      setSelectedParticipant(null);

      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error assigning winner");
    }
  };

  const filteredParticipants = participants.filter((p) =>
    p.participantName.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {tournament?.tournamentName || "Torneo"}
        </h2>
        <p className="text-sm text-zinc-400">
          Selecciona un ganador y otorga créditos y badges si es necesario
        </p>
      </div>

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

      {/* Search */}
      <div className="relative">
        <MdSearch className="absolute left-3 top-3 text-zinc-500" size={20} />
        <input
          type="text"
          placeholder="Search participants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg bg-zinc-800 pl-10 pr-4 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-primary"
        />
      </div>

      {/* Empty State */}
      {participants.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-600 p-12 text-center">
          <MdAttachMoney size={48} className="mx-auto mb-4 text-zinc-500" />
          <h3 className="text-lg font-semibold text-zinc-400 mb-2">
            Aun no hay participantes activos
          </h3>
          <p className="text-sm text-zinc-500">
            Asignar un ganador requiere al menos un participante activo
          </p>
        </div>
      )}

      {/* Participants List */}
      {participants.length > 0 && (
        <div className="space-y-3">
          {filteredParticipants.map((participant) => (
            <motion.div
              key={participant._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-lg border border-white/10 bg-zinc-900 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-white">
                    {participant.participantName}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {participant.user?.email || "No email"}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedParticipant(participant);
                    setShowModal(true);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-yellow-500/20 px-4 py-2 font-semibold text-yellow-400 transition hover:bg-yellow-500/30"
                >
                  <MdEmojiEvents size={18} /> Assign Winner
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {filteredParticipants.length === 0 && participants.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-zinc-900 p-12 text-center">
          <MdEmojiEvents size={48} className="mx-auto mb-3 text-zinc-500" />
          <p className="text-zinc-400">No hay participantes activos</p>
        </div>
      )}

      {/* Modal */}
      {showModal && selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-lg bg-zinc-900 border border-white/10 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Asignar Ganador</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <MdClose size={24} />
              </button>
            </div>

            <div className="rounded-lg bg-zinc-800 p-3 text-sm">
              <p className="font-semibold text-white">
                {selectedParticipant.participantName}
              </p>
              <p className="text-zinc-400">{selectedParticipant.user?.email}</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-400">
                Monto de Créditos *
              </label>
              <div className="relative mt-1">
                <MdAttachMoney className="absolute left-3 top-3 text-zinc-500" />
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  step="0.01"
                  className="w-full rounded-lg bg-zinc-800 pl-10 pr-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-primary"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-400 mb-2 block">
                Badges (Opcional)
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {badges.map((badge) => (
                  <label
                    key={badge._id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBadges.includes(badge._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBadges([...selectedBadges, badge._id]);
                        } else {
                          setSelectedBadges(
                            selectedBadges.filter((id) => id !== badge._id),
                          );
                        }
                      }}
                      className="rounded accent-primary"
                    />
                    <span className="text-sm text-white">
                      {badge.badgeName}
                    </span>
                    <span className="text-xs text-zinc-500">
                      ({badge.rarity})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-white/20 py-2 font-semibold text-white transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssignWinner}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2 font-semibold text-primary-foreground transition hover:opacity-90"
              >
                <MdSave size={18} /> Asignar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AssignWinner;
