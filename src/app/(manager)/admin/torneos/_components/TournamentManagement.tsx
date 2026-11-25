"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdClose,
  MdSave,
  MdCalendarToday,
  MdAttachMoney,
  MdGroups,
  MdEmojiEvents,
} from "react-icons/md";

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
}

interface FormData {
  tournamentName: string;
  description: string;
  ticketCost: string;
  startDate: string;
  endDate: string;
  maxParticipants: string;
}

const TournamentManagement = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState<FormData>({
    tournamentName: "",
    description: "",
    ticketCost: "",
    startDate: "",
    endDate: "",
    maxParticipants: "",
  });

  useEffect(() => {
    if ((session?.user as any)?.role !== "organizador") {
      router.push("/no-autorizado");
      return;
    }

    const fetchTournaments = async () => {
      try {
        const response = await fetch("/api/supervisor/tournaments");
        if (response.ok) {
          const data = await response.json();
          setTournaments(data.tournaments || []);
        } else {
          // For any non-ok response (404, 500, etc), default to empty list
          console.warn("Failed to fetch tournaments:", response.status);
          setTournaments([]);
        }
      } catch (err) {
        // On error, default to empty list rather than showing error
        console.error("Error loading tournaments:", err);
        setTournaments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [session, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (
      !formData.tournamentName ||
      !formData.startDate ||
      !formData.endDate ||
      !formData.ticketCost
    ) {
      setError(
        "Por favor completa todos los campos requeridos (Nombre, Fecha de Inicio, Fecha de Fin, Costo)",
      );
      return;
    }

    const ticketCost = parseFloat(formData.ticketCost);
    if (isNaN(ticketCost) || ticketCost < 0) {
      setError("El costo del ticket debe ser un número válido mayor a 0");
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    if (startDate > endDate) {
      setError(
        "La fecha de inicio debe ser anterior o igual a la fecha de fin",
      );
      return;
    }

    setError("");
    setSuccess("");

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `/api/supervisor/tournaments/${editingId}`
        : "/api/supervisor/tournaments";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentName: formData.tournamentName,
          description: formData.description,
          ticketCost: ticketCost,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          maxParticipants: parseInt(formData.maxParticipants) || 100,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || data.message || "Failed to save tournament",
        );
      }

      setSuccess(editingId ? "Torneo actualizado!" : "Torneo creado!");
      setShowModal(false);
      setEditingId(null);
      setFormData({
        tournamentName: "",
        description: "",
        ticketCost: "",
        startDate: "",
        endDate: "",
        maxParticipants: "",
      });

      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving tournament");
    }
  };

  const handleEdit = (tournament: Tournament) => {
    setEditingId(tournament._id);
    setFormData({
      tournamentName: tournament.tournamentName,
      description: tournament.description,
      ticketCost: tournament.ticketCost.toString(),
      startDate: new Date(tournament.startDate).toISOString().split("T")[0],
      endDate: new Date(tournament.endDate).toISOString().split("T")[0],
      maxParticipants: tournament.maxParticipants.toString(),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este torneo?")) return;

    try {
      const response = await fetch(`/api/supervisor/tournaments/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete tournament");

      setSuccess("Tournament deleted!");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError("Error deleting tournament");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Torneos</h2>
        <button
          onClick={() => {
            setShowModal(true);
            setEditingId(null);
            setFormData({
              tournamentName: "",
              description: "",
              ticketCost: "",
              startDate: "",
              endDate: "",
              maxParticipants: "",
            });
          }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <MdAdd size={20} /> Nuevo Torneo
        </button>
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

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      )}

      {!loading && tournaments.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-600 p-12 text-center">
          <MdEmojiEvents size={48} className="mx-auto mb-4 text-zinc-500" />
          <h3 className="text-lg font-semibold text-zinc-400 mb-2">
            Aun no tienes torneos creados
          </h3>
          <p className="text-sm text-zinc-500 mb-6">
            Crea tu primer torneo para comenzar
          </p>
          <button
            onClick={() => {
              setShowModal(true);
              setEditingId(null);
              setFormData({
                tournamentName: "",
                description: "",
                ticketCost: "",
                startDate: "",
                endDate: "",
                maxParticipants: "",
              });
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <MdAdd size={20} /> Crear Torneo
          </button>
        </div>
      )}

      <div className="space-y-3">
        {tournaments.map((tournament) => (
          <motion.div
            key={tournament._id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-lg border border-white/10 bg-zinc-900 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-semibold text-white">
                  {tournament.tournamentName}
                </h3>
                <p className="text-sm text-zinc-400">
                  {tournament.description}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-zinc-500 mt-2">
                  <span className="flex items-center gap-1">
                    <MdCalendarToday size={14} />
                    {new Date(tournament.startDate).toLocaleDateString(
                      "es-MX",
                    )}{" "}
                    - {new Date(tournament.endDate).toLocaleDateString("es-MX")}
                  </span>
                  <span className="flex items-center gap-1">
                    <MdAttachMoney size={14} />${tournament.ticketCost}
                  </span>
                  <span className="flex items-center gap-1">
                    <MdGroups size={14} />
                    {tournament.currentParticipants}/
                    {tournament.maxParticipants}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(tournament)}
                  className="rounded-lg bg-blue-500/20 p-2 text-blue-400 transition hover:bg-blue-500/30"
                >
                  <MdEdit size={20} />
                </button>
                <button
                  onClick={() => handleDelete(tournament._id)}
                  className="rounded-lg bg-red-500/20 p-2 text-red-400 transition hover:bg-red-500/30"
                >
                  <MdDelete size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-lg bg-zinc-900 border border-white/10 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                {editingId ? "Editar Torneo" : "Nuevo Torneo"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <MdClose size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-zinc-400">
                  Nombre del Torneo *
                </label>
                <input
                  type="text"
                  name="tournamentName"
                  value={formData.tournamentName}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-zinc-400">
                  Descripción
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-zinc-400">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-zinc-400">
                    Fecha de Fin *
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-zinc-400">
                    Costo de Boleto
                  </label>
                  <input
                    type="number"
                    name="ticketCost"
                    value={formData.ticketCost}
                    onChange={handleInputChange}
                    step="0.01"
                    className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-zinc-400">
                    Maximo de Participantes *
                  </label>
                  <input
                    type="number"
                    name="maxParticipants"
                    value={formData.maxParticipants}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-white/20 py-2 font-semibold text-white transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2 font-semibold text-primary-foreground transition hover:opacity-90"
              >
                <MdSave size={18} /> {editingId ? "Actualizar" : "Crear"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TournamentManagement;
