export const dynamic = "force-dynamic";

import React from "react";
import { Metadata } from "next";
import ArqueoHistoryContent from "../_components/ArqueoHistoryContent";

export const metadata: Metadata = {
  title: "Historial de Arqueos | Admin",
  description: "Ver y exportar todos los arqueos realizados",
};

export default function ArqueoHistoryPage() {
  return <ArqueoHistoryContent />;
}
