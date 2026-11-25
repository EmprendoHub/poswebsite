import React from "react";
import TournamentBrowser from "./_components/TournamentBrowser";

export const metadata = {
  title: "Torneos de Créditos - Super Collectibles",
  description:
    "Participa en nuestros torneos de coleccionables y gana créditos para usar en tus compras. Compite, gana y colecciona insignias exclusivas.",
};

const TorneosPage = async () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="border-b border-white/10 bg-gradient-to-b from-primary/10 to-background">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Torneos de Coleccionables
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              Participa en torneos emocionantes y gana créditos para usar en tus
              compras favoritas. Cada torneo ganado te acerca a insignias
              especiales y premios exclusivos.
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <TournamentBrowser />
      </section>
    </div>
  );
};

export default TorneosPage;
