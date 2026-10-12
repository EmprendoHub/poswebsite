"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { jsPDF } from "jspdf";

interface Arqueo {
  _id: string;
  store: string;
  storeName: string;
  date: string;
  performedByName: string;
  dateRange: { startDate: string; endDate: string };
  inStore: { efectivo: any; transferencia: any; tarjeta: any };
  online: { transferencia: any; tarjeta: any };
  redesSociales: { transferencia: any; tarjeta: any };
  gastos?: {
    expectedTotal: number;
    actualTotal: number;
    discrepancy: number;
    verified: boolean;
    items: {
      description: string;
      amount: number;
      category: string;
      createdBy: string;
      verified: boolean;
    }[];
  };
  totals: {
    expectedTotal: number;
    receivedTotal: number;
    totalDiscrepancy: number;
  };
  allVerified: boolean;
  notes?: string;
  createdAt: string;
}

export default function ArqueoHistoryContent() {
  const { data: session } = useSession();
  const [stores, setStores] = useState<any[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [arqueos, setArqueos] = useState<Arqueo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch stores on mount
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await fetch("/api/stores");
        const data = await response.json();
        setStores(data);
      } catch (error) {
        console.error("Error fetching stores:", error);
      }
    };

    fetchStores();
  }, []);

  const fetchArqueos = async (pageNum = 1) => {
    setLoading(true);
    try {
      let url = "/api/admin/arqueo/history";
      const params = new URLSearchParams();

      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedStore) params.append("storeId", selectedStore);
      params.append("page", pageNum.toString());

      if (params.toString()) {
        url += "?" + params.toString();
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setArqueos(data.arqueos);
        setTotalPages(data.pagination.pages);
        setPage(pageNum);
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los arqueos",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching arqueos:", error);
      toast({
        title: "Error",
        description: "Error al cargar los arqueos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchArqueos(1);
  };

  const exportToPDF = (arqueo: Arqueo) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Header
      doc.setFontSize(16);
      doc.text("REPORTE DE ARQUEO", pageWidth / 2, yPosition, { align: "center" });

      yPosition += 15;
      doc.setFontSize(10);

      // Basic Info
      doc.text(`Sucursal: ${arqueo.storeName}`, 20, yPosition);
      yPosition += 7;
      doc.text(
        `Período: ${new Date(arqueo.dateRange.startDate).toLocaleDateString("es-MX")} - ${new Date(arqueo.dateRange.endDate).toLocaleDateString("es-MX")}`,
        20,
        yPosition,
      );
      yPosition += 7;
      doc.text(`Realizado por: ${arqueo.performedByName}`, 20, yPosition);
      yPosition += 7;
      doc.text(
        `Fecha: ${new Date(arqueo.createdAt).toLocaleDateString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        20,
        yPosition,
      );

      yPosition += 12;
      doc.setFontSize(11);
      doc.text("EN TIENDA", 20, yPosition);
      yPosition += 8;

      // In Store Table
      const inStoreData = [
        ["Método", "Esperado", "Recibido", "Discrepancia", "Verificado"],
        [
          "Efectivo",
          `$${arqueo.inStore.efectivo.expectedAmount.toFixed(2)}`,
          `$${arqueo.inStore.efectivo.receivedAmount.toFixed(2)}`,
          `$${arqueo.inStore.efectivo.discrepancy.toFixed(2)}`,
          arqueo.inStore.efectivo.verified ? "✓" : "✗",
        ],
        [
          "Transferencia",
          `$${arqueo.inStore.transferencia.expectedAmount.toFixed(2)}`,
          `$${arqueo.inStore.transferencia.receivedAmount.toFixed(2)}`,
          `$${arqueo.inStore.transferencia.discrepancy.toFixed(2)}`,
          arqueo.inStore.transferencia.verified ? "✓" : "✗",
        ],
        [
          "Tarjeta",
          `$${arqueo.inStore.tarjeta.expectedAmount.toFixed(2)}`,
          `$${arqueo.inStore.tarjeta.receivedAmount.toFixed(2)}`,
          `$${arqueo.inStore.tarjeta.discrepancy.toFixed(2)}`,
          arqueo.inStore.tarjeta.verified ? "✓" : "✗",
        ],
      ];

      (doc as any).autoTable({
        head: [inStoreData[0]],
        body: inStoreData.slice(1),
        startY: yPosition,
        theme: "grid",
        columnStyles: { 0: { cellWidth: 30 } },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Online Section
      doc.setFontSize(11);
      doc.text("VENTAS ONLINE", 20, yPosition);
      yPosition += 8;

      const onlineData = [
        ["Método", "Esperado", "Recibido", "Discrepancia", "Verificado"],
        [
          "Transferencia",
          `$${arqueo.online.transferencia.expectedAmount.toFixed(2)}`,
          `$${arqueo.online.transferencia.receivedAmount.toFixed(2)}`,
          `$${arqueo.online.transferencia.discrepancy.toFixed(2)}`,
          arqueo.online.transferencia.verified ? "✓" : "✗",
        ],
        [
          "Tarjeta",
          `$${arqueo.online.tarjeta.expectedAmount.toFixed(2)}`,
          `$${arqueo.online.tarjeta.receivedAmount.toFixed(2)}`,
          `$${arqueo.online.tarjeta.discrepancy.toFixed(2)}`,
          arqueo.online.tarjeta.verified ? "✓" : "✗",
        ],
      ];

      (doc as any).autoTable({
        head: [onlineData[0]],
        body: onlineData.slice(1),
        startY: yPosition,
        theme: "grid",
        columnStyles: { 0: { cellWidth: 30 } },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Social Media Section
      doc.setFontSize(11);
      doc.text("REDES SOCIALES", 20, yPosition);
      yPosition += 8;

      const socialData = [
        ["Método", "Esperado", "Recibido", "Discrepancia", "Verificado"],
        [
          "Transferencia",
          `$${arqueo.redesSociales.transferencia.expectedAmount.toFixed(2)}`,
          `$${arqueo.redesSociales.transferencia.receivedAmount.toFixed(2)}`,
          `$${arqueo.redesSociales.transferencia.discrepancy.toFixed(2)}`,
          arqueo.redesSociales.transferencia.verified ? "✓" : "✗",
        ],
        [
          "Tarjeta",
          `$${arqueo.redesSociales.tarjeta.expectedAmount.toFixed(2)}`,
          `$${arqueo.redesSociales.tarjeta.receivedAmount.toFixed(2)}`,
          `$${arqueo.redesSociales.tarjeta.discrepancy.toFixed(2)}`,
          arqueo.redesSociales.tarjeta.verified ? "✓" : "✗",
        ],
      ];

      (doc as any).autoTable({
        head: [socialData[0]],
        body: socialData.slice(1),
        startY: yPosition,
        theme: "grid",
        columnStyles: { 0: { cellWidth: 30 } },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 12;

      // Totals Section
      doc.setFontSize(11);
      doc.text("RESUMEN", 20, yPosition);
      yPosition += 8;

      const totalsData = [
        ["Concepto", "Monto"],
        ["Total Esperado", `$${arqueo.totals.expectedTotal.toFixed(2)}`],
        ["Total Recibido", `$${arqueo.totals.receivedTotal.toFixed(2)}`],
        ["Discrepancia Total", `$${arqueo.totals.totalDiscrepancy.toFixed(2)}`],
      ];

      (doc as any).autoTable({
        head: [totalsData[0]],
        body: totalsData.slice(1),
        startY: yPosition,
        theme: "grid",
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Notes
      if (arqueo.notes) {
        doc.setFontSize(10);
        doc.text("Notas:", 20, yPosition);
        yPosition += 5;
        const noteLines = doc.splitTextToSize(arqueo.notes, pageWidth - 40);
        doc.text(noteLines, 20, yPosition);
      }

      // Save PDF
      const fileName = `Arqueo_${arqueo.storeName}_${new Date(arqueo.date).toLocaleDateString("es-MX").replace(/\//g, "-")}.pdf`;
      doc.save(fileName);

      toast({
        title: "Éxito",
        description: "PDF descargado correctamente",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Error al generar el PDF",
        variant: "destructive",
      });
    }
  };

  const getDiscrepancyAlert = (discrepancy: number, expected: number) => {
    if (expected === 0) return null;
    const percentage = Math.abs(discrepancy) / expected;
    return percentage > 0.01; // 1% threshold
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Historial de Arqueos</h1>
        <p className="text-muted-foreground">
          Ver y exportar todos los arqueos realizados
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="store">Sucursal</Label>
              <select
                id="store"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background"
              >
                <option value="">Todas las sucursales</option>
                {stores.map((store) => (
                  <option key={store._id} value={store._id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="start-date">Fecha Inicio</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">Fecha Fin</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={loading} className="w-full">
                {loading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : arqueos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No se encontraron arqueos
            </p>
          ) : (
            <div className="space-y-4">
              {arqueos.map((arqueo) => {
                const hasAlert = getDiscrepancyAlert(
                  arqueo.totals.totalDiscrepancy,
                  arqueo.totals.expectedTotal,
                );

                return (
                  <div
                    key={arqueo._id}
                    className={`p-4 border rounded-lg ${
                      hasAlert ? "border-red-300 bg-red-50 dark:bg-red-950" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-lg">
                          {arqueo.storeName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(arqueo.date).toLocaleDateString("es-MX", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-semibold">
                          Discrepancia: ${arqueo.totals.totalDiscrepancy.toFixed(2)}
                        </p>
                        {hasAlert && (
                          <p className="text-xs font-bold text-red-600">
                            ⚠️ ALERTA: Discrepancia &gt; 1%
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Esperado</p>
                        <p className="font-semibold">
                          ${arqueo.totals.expectedTotal.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Recibido</p>
                        <p className="font-semibold">
                          ${arqueo.totals.receivedTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Gastos Section */}
                    {arqueo.gastos && arqueo.gastos.items.length > 0 && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">
                          💰 Gastos Registrados
                        </p>
                        <div className="space-y-2">
                          {arqueo.gastos.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center text-sm"
                            >
                              <div>
                                <p className="font-medium text-blue-900 dark:text-blue-100">
                                  {item.description}
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                  {item.category} • {item.createdBy}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-blue-900 dark:text-blue-100">
                                  ${item.amount.toFixed(2)}
                                </p>
                                {item.verified && (
                                  <p className="text-xs text-green-600 dark:text-green-400">
                                    ✓ Verificado
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-blue-200 dark:border-blue-800 mt-2 pt-2 flex justify-between">
                          <p className="font-semibold text-blue-900 dark:text-blue-100">
                            Total de Gastos
                          </p>
                          <p className="font-semibold text-blue-900 dark:text-blue-100">
                            ${arqueo.gastos.expectedTotal.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}

                    {arqueo.notes && (
                      <div className="mb-4 p-3 bg-muted rounded text-sm">
                        <p className="font-semibold mb-1">Notas:</p>
                        <p>{arqueo.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => exportToPDF(arqueo)}
                        variant="outline"
                      >
                        Descargar PDF
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                onClick={() => fetchArqueos(page - 1)}
                disabled={page === 1 || loading}
                variant="outline"
              >
                Anterior
              </Button>
              <div className="flex items-center gap-2">
                <span>
                  Página {page} de {totalPages}
                </span>
              </div>
              <Button
                onClick={() => fetchArqueos(page + 1)}
                disabled={page === totalPages || loading}
                variant="outline"
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
