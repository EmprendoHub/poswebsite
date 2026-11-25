"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  MdEmojiEvents,
  MdGroups,
  MdAttachMoney,
  MdImage,
  MdLeaderboard,
  MdAnalytics,
} from "react-icons/md";
import TournamentManagement from "./TournamentManagement";
import TournamentParticipants from "./TournamentParticipants";
import AssignWinner from "./AssignWinner";
import TournamentGallery from "./TournamentGallery";
import PointsLeaderboard from "./PointsLeaderboard";
import CreditAnalytics from "./CreditAnalytics";

type TabType =
  | "tournaments"
  | "participants"
  | "winners"
  | "gallery"
  | "leaderboard"
  | "analytics";

interface Tournament {
  _id: string;
  tournamentName: string;
}

const TournamentTabs = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("tournaments");
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);

  // Fetch tournaments list
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch("/api/supervisor/tournaments");
        if (response.ok) {
          const data = await response.json();
          const tournamentList = data.tournaments || [];
          setTournaments(tournamentList);
          if (tournamentList.length > 0) {
            setSelectedTournamentId(tournamentList[0]._id);
          }
        }
      } catch (err) {
        console.error("Error loading tournaments:", err);
      } finally {
        setLoadingTournaments(false);
      }
    };

    fetchTournaments();
  }, []);

  // Check authorization
  if (!session || (session?.user as any)?.role !== "organizador") {
    return (
      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-800 dark:text-red-200">
          No tienes permiso para acceder a esta sección.
        </p>
      </div>
    );
  }

  const tabs = [
    {
      id: "tournaments",
      label: "Torneos",
      icon: <MdEmojiEvents size={20} />,
    },
    {
      id: "participants",
      label: "Participantes",
      icon: <MdGroups size={20} />,
    },
    {
      id: "winners",
      label: "Ganadores",
      icon: <MdAttachMoney size={20} />,
    },
    {
      id: "gallery",
      label: "Galería",
      icon: <MdImage size={20} />,
    },
    {
      id: "leaderboard",
      label: "Tabla de Posiciones",
      icon: <MdLeaderboard size={20} />,
    },
    {
      id: "analytics",
      label: "Analítica",
      icon: <MdAnalytics size={20} />,
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "tournaments":
        return <TournamentManagement />;
      case "participants":
        return <TournamentParticipants tournamentId={selectedTournamentId} />;
      case "winners":
        return <AssignWinner tournamentId={selectedTournamentId} />;
      case "gallery":
        return <TournamentGallery tournamentId={selectedTournamentId} />;
      case "leaderboard":
        return <PointsLeaderboard />;
      case "analytics":
        return <CreditAnalytics />;
      default:
        return <TournamentManagement />;
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Tournament Selector */}
      {activeTab !== "tournaments" && (
        <div className="bg-card rounded-lg border border-border p-4">
          <label className="text-sm font-semibold text-muted-foreground mb-2 block">
            Selecciona un Torneo
          </label>
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground outline-none ring-1 ring-transparent focus:ring-primary"
            disabled={loadingTournaments || tournaments.length === 0}
          >
            <option value="">
              {loadingTournaments
                ? "Cargando torneos..."
                : tournaments.length === 0
                  ? "No hay torneos disponibles"
                  : "Selecciona un torneo"}
            </option>
            {tournaments.map((tournament) => (
              <option key={tournament._id} value={tournament._id}>
                {tournament.tournamentName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-card rounded-lg border border-border p-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default TournamentTabs;
