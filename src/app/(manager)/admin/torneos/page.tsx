import React from "react";
import { Metadata } from "next";
import TournamentTabs from "./_components/TournamentTabs";

export const metadata: Metadata = {
  title: "Administración de Torneos | Super Collectibles",
  description: "Gestiona torneos, participantes y premios",
};

const TorneosAdminPage = async () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="px-2 mx-auto py-8">
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Administración de Torneos
            </h1>
            <p className="text-muted-foreground">
              Gestiona torneos, participantes, premios y todas las
              configuraciones relacionadas
            </p>
          </div>
        </div>
        <TournamentTabs />
      </div>
    </div>
  );
};

export default TorneosAdminPage;
