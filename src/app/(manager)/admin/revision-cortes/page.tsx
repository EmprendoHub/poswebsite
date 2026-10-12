export const dynamic = "force-dynamic";

import React from "react";
import { Metadata } from "next";
import ArqueoContent from "./_components/ArqueoContent";

export const metadata: Metadata = {
  title: "Revisión de Cortes | Admin",
  description: "Verifica y confirma los montos recibidos de cada método de pago",
};

export default function RevisionCortesPage() {
  return <ArqueoContent />;
}
