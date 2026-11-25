"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MdCheckCircle,
  MdCancel,
  MdGroups,
  MdPersonAdd,
  MdSearch,
  MdClose,
} from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Participant {
  _id: string;
  participantId?: string;
  tournamentId: string;
  participantName?: string;
  name?: string;
  email?: string;
  status: "active" | "inactive" | "registered" | "withdrawn" | "disqualified";
  registrationDate: string;
  user?: {
    email: string;
    name: string;
  };
}

interface Tournament {
  _id: string;
  tournamentName: string;
  status: string;
  ticketCost?: number;
}

const TournamentParticipants = ({ tournamentId }: { tournamentId: string }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    payMethod: "EFECTIVO",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    const userRole = (session?.user as any)?.role;
    if (userRole !== "organizador") {
      router.push("/no-autorizado");
      return;
    }

    const fetchData = async () => {
      try {
        // If no tournamentId provided, show empty state
        if (!tournamentId) {
          setParticipants([]);
          setLoading(false);
          return;
        }

        const [tournamentRes, participantsRes] = await Promise.all([
          fetch(`/api/supervisor/tournaments/${tournamentId}`),
          fetch(`/api/supervisor/tournaments/${tournamentId}/participants`),
        ]);

        if (!tournamentRes.ok) {
          setTournament(null);
        } else {
          const tournamentData = await tournamentRes.json();
          setTournament(tournamentData.tournament);
        }

        if (!participantsRes.ok) {
          setParticipants([]);
        } else {
          const participantsData = await participantsRes.json();
          setParticipants(participantsData.data || []);
        }
      } catch (err) {
        console.error("Error loading participants:", err);
        setParticipants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, router, tournamentId]);

  const handleStatusChange = async (
    participantId: string,
    newStatus: string,
  ) => {
    try {
      const response = await fetch(
        `/api/supervisor/tournaments/${tournamentId}/participants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantId,
            status: newStatus,
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to update status");

      setSuccess("Participant status updated!");
      setParticipants((prev) =>
        prev.map((p) =>
          p._id === participantId ? { ...p, status: newStatus as any } : p,
        ),
      );
    } catch (err) {
      setError("Error updating participant");
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    // Validation
    if (!formData.name.trim() || !formData.email.trim()) {
      setError("Por favor completa todos los campos");
      setIsSubmitting(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Por favor ingresa un email válido");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/supervisor/tournaments/${tournamentId}/add-participant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantName: formData.name,
            email: formData.email,
            customerId: selectedCustomer?._id,
            ticketCost: tournament?.ticketCost || 0,
            payMethod: formData.payMethod,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al agregar participante");
      }

      // Refresh participants list first
      const participantsRes = await fetch(
        `/api/supervisor/tournaments/${tournamentId}/participants`,
      );
      if (participantsRes.ok) {
        const participantsData = await participantsRes.json();
        setParticipants(participantsData.data || []);
      }

      // Use the notification message from API response
      setSuccess(
        data.message ||
          "Participante agregado exitosamente. Se envió correo de confirmación.",
      );
      setFormData({ name: "", email: "", payMethod: "EFECTIVO" });
      setCustomerSearch("");
      setSelectedCustomer(null);
      setShowAddModal(false);
    } catch (err: any) {
      setError(err.message || "Error al agregar participante");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchCustomers = async (query: string) => {
    setCustomerSearch(query);

    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/supervisor/tournaments/${tournamentId}/add-participant?search=${encodeURIComponent(query)}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

      const data = await response.json();
      if (response.ok) {
        setSearchResults(data.customers || []);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Error searching customers:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.fullName,
      email: customer.email,
      payMethod: "EFECTIVO",
    });
    setShowSearchResults(false);
    setCustomerSearch("");
    setSearchResults([]);
  };

  const filteredParticipants = participants.filter((p) => {
    const name = (p.participantName || p.name || "").toLowerCase();
    return name.includes(search.toLowerCase());
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {tournament?.tournamentName || "Torneo"}
          </h2>
          <div className="flex items-center gap-2 text-zinc-400">
            <MdGroups size={18} />
            <span>{participants.length} Participantes</span>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-primary-foreground px-4 py-2 rounded-lg transition"
        >
          <MdPersonAdd size={20} />
          Agregar Participante
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/20 border border-red-500/50 p-3 text-sm text-red-200 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="text-red-200 hover:text-red-100"
          >
            <MdClose size={20} />
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-500/20 border border-green-500/50 p-3 text-sm text-green-200 flex items-center justify-between">
          <span>{success}</span>
          <button
            onClick={() => setSuccess("")}
            className="text-green-200 hover:text-green-100"
          >
            <MdClose size={20} />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <MdSearch className="absolute left-3 top-3 text-zinc-500" size={20} />
        <input
          type="text"
          placeholder="Buscar participantes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg bg-zinc-800 pl-10 pr-4 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-primary"
        />
      </div>

      {/* Empty State */}
      {participants.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-600 p-12 text-center">
          <MdGroups size={48} className="mx-auto mb-4 text-zinc-500" />
          <h3 className="text-lg font-semibold text-zinc-400 mb-2">
            No existen participantes registrados
          </h3>
          <p className="text-sm text-zinc-500">
            Los participantes aparecerán aquí cuando se registren en los torneos
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
                    {participant.participantName ||
                      participant.name ||
                      "Sin nombre"}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {participant.email || participant.user?.email || "No email"}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Registrado:{" "}
                    {new Date(participant.registrationDate).toLocaleDateString(
                      "es-MX",
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold px-3 py-1 rounded-full ${
                      participant.status === "active"
                        ? "bg-green-500/20 text-green-200"
                        : "bg-red-500/20 text-red-200"
                    }`}
                  >
                    {participant.status === "active"
                      ? "✓ Active"
                      : "✗ Inactive"}
                  </span>

                  <button
                    onClick={() =>
                      handleStatusChange(
                        participant._id,
                        participant.status === "active" ? "inactive" : "active",
                      )
                    }
                    className={`rounded-lg p-2 transition ${
                      participant.status === "active"
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    }`}
                  >
                    {participant.status === "active" ? (
                      <MdCancel size={20} />
                    ) : (
                      <MdCheckCircle size={20} />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {filteredParticipants.length === 0 && participants.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-zinc-900 p-12 text-center">
          <MdPersonAdd size={48} className="mx-auto mb-3 text-zinc-500" />
          <p className="text-zinc-400">No se encontraron participantes</p>
        </div>
      )}

      {/* Add Participant Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MdPersonAdd size={24} className="text-primary" />
              Agregar Participante
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddParticipant} className="space-y-4">
            {/* Customer Search */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">
                Buscar Cliente Existente
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Busca por nombre o email..."
                  value={customerSearch}
                  onChange={(e) => handleSearchCustomers(e.target.value)}
                  disabled={isSubmitting || selectedCustomer !== null}
                />
                {isSearching && (
                  <div className="absolute right-3 top-3 text-primary">
                    <div className="animate-spin">⌛</div>
                  </div>
                )}

                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-white/10 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {searchResults.map((customer) => (
                      <button
                        key={customer._id}
                        type="button"
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full px-4 py-2 text-left hover:bg-zinc-700 transition border-b border-white/5 last:border-b-0"
                      >
                        <div className="font-semibold text-white">
                          {customer.fullName}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {customer.email}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedCustomer && (
                <div className="mt-2 p-3 bg-primary/20 border border-primary/50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {selectedCustomer.fullName}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {selectedCustomer.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setFormData({
                        name: "",
                        email: "",
                        payMethod: "EFECTIVO",
                      });
                      setCustomerSearch("");
                    }}
                    className="text-primary hover:text-primary/80"
                  >
                    <MdClose size={20} />
                  </button>
                </div>
              )}
            </div>

            {/* Or Create New */}
            {selectedCustomer === null && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-background text-zinc-400">
                      O crear nuevo cliente
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Nombre Completo
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Correo Electrónico
                  </label>
                  <Input
                    type="email"
                    placeholder="Ej: juan@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}

            {/* Payment Method */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">
                Método de Pago
              </label>
              <select
                value={formData.payMethod}
                onChange={(e) =>
                  setFormData({ ...formData, payMethod: e.target.value })
                }
                disabled={isSubmitting}
                className="w-full rounded-lg bg-zinc-800 px-4 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-primary transition disabled:opacity-50"
              >
                <option value="EFECTIVO">💵 Efectivo</option>
                <option value="TERMINAL">💳 Terminal (Tarjeta)</option>
                <option value="TRANSFERENCIA">🏦 Transferencia</option>
              </select>
            </div>

            <div className="text-xs text-zinc-400 bg-zinc-900/50 p-3 rounded">
              Se enviará un correo de confirmación con los detalles del torneo
              al participante agregado.
              {tournament?.ticketCost && (
                <div className="mt-2 font-semibold">
                  Costo de entrada: ${tournament.ticketCost.toFixed(2)}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ name: "", email: "", payMethod: "EFECTIVO" });
                  setCustomerSearch("");
                  setSelectedCustomer(null);
                  setShowSearchResults(false);
                }}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Agregando..." : "Agregar Participante"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentParticipants;
