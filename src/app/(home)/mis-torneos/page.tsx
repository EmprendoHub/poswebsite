import React from "react";
import MyTournaments from "../torneos/_components/MyTournaments";

export const metadata = {
  title: "Mis Torneos - Super Collectibles",
  description:
    "Revisa tu historial de participación en torneos y créditos ganados.",
};

const MyTournamentsPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="border-b border-white/10 bg-gradient-to-b from-primary/10 to-background">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Mi Historial de Torneos
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              Visualiza tu participación en torneos pasados y los créditos que
              has ganado.
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <MyTournaments />
      </section>
    </div>
  );
};

export default MyTournamentsPage;
