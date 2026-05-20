import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QrCode, Users } from "lucide-react";
import CachaRegistrationsPage from "./_components/CachaRegistrationsPage";

export const metadata: Metadata = {
  title: "Registros Meet & Greet Cacha - Admin | Super Collectibles",
  description:
    "Administración de registros para el evento Meet & Greet con Cacha",
};

const AdminCachaPage = async () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="px-2 mx-auto py-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Registros Meet & Greet Cacha
              </h1>
              <p className="text-muted-foreground">
                Gestiona los registros para el evento exclusivo con Cacha
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin/evento/scanner">
                <Button className="bg-green-600 hover:bg-green-700">
                  <QrCode className="w-4 h-4 mr-2" />
                  🎫 Escáner QR
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <CachaRegistrationsPage />
      </div>
    </div>
  );
};

export default AdminCachaPage;
