"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AllCachaRegistrationsComponent from "./AllCachaRegistrationsComponent";
import CachaRegistrationSearch from "./CachaRegistrationSearch";
import { CachaRegistration } from "@/types/cacha";

const CachaRegistrationsPage = () => {
  const [registrations, setRegistrations] = useState<CachaRegistration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<
    CachaRegistration[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pendiente: 0,
    confirmado: 0,
    asistio: 0,
    cancelado: 0,
  });

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/cacha?limit=1000"); // Fetch all registrations
      const data = await response.json();

      if (data.success) {
        setRegistrations(data.data.registrations);
        setFilteredRegistrations(data.data.registrations);

        // Calculate stats
        const statsData = data.data.estadisticas.reduce(
          (acc: any, stat: any) => {
            acc[stat._id] = stat.count;
            return acc;
          },
          {}
        );

        setStats({
          total: data.data.pagination.total,
          pendiente: statsData.pendiente || 0,
          confirmado: statsData.confirmado || 0,
          asistio: statsData.asistio || 0,
          cancelado: statsData.cancelado || 0,
        });
      } else {
        setError(data.message || "Error al cargar registros");
      }
    } catch (err) {
      console.error("Error fetching registrations:", err);
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const handleSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredRegistrations(registrations);
      return;
    }

    const filtered = registrations.filter(
      (registration) =>
        registration.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        registration.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        registration.telefono.includes(searchTerm) ||
        registration.codigoConfirmacion
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );

    setFilteredRegistrations(filtered);
  };

  const handleFilterByStatus = (status: string) => {
    if (status === "all") {
      setFilteredRegistrations(registrations);
      return;
    }

    const filtered = registrations.filter(
      (registration) => registration.estado === status
    );
    setFilteredRegistrations(filtered);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchRegistrations}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendiente}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confirmados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.confirmado}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancelados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.cancelado}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <CachaRegistrationSearch
        onSearch={handleSearch}
        onFilterByStatus={handleFilterByStatus}
      />

      {/* Registrations Table */}
      <AllCachaRegistrationsComponent
        registrations={filteredRegistrations}
        onRegistrationUpdate={fetchRegistrations}
        filteredCount={filteredRegistrations.length}
      />
    </div>
  );
};

export default CachaRegistrationsPage;
