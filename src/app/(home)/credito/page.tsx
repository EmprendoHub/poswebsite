import React from "react";
import CreditDashboard from "../torneos/_components/CreditDashboard";

export const metadata = {
  title: "Mi Crédito - Super Collectibles",
  description: "Administra y visualiza tu saldo de créditos disponibles.",
};

const CreditPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="border-b border-white/10 bg-gradient-to-b from-primary/10 to-background">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Mi Crédito
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              Visualiza y administra tu saldo de créditos ganados en torneos.
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <CreditDashboard />
      </section>
    </div>
  );
};

export default CreditPage;
