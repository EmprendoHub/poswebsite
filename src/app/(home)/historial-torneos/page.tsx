import React from "react";
import PublicTournamentHistory from "../torneos/_components/PublicTournamentHistory";

export const metadata = {
  title: "Historial Público de Torneos - Super Collectibles",
  description:
    "Revisa los resultados, ganadores y galerías de torneos pasados.",
};

const PublicHistoryPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="border-b border-white/10 bg-gradient-to-b from-primary/10 to-background">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Historial Público de Torneos
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              Revisa resultados de torneos anteriores, conoce a los ganadores y
              visualiza las galerías de fotos.
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <PublicTournamentHistory />
      </section>
    </div>
  );
};

export default PublicHistoryPage;
