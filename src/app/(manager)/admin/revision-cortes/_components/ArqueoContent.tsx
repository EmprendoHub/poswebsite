"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { jsPDF } from "jspdf";

interface PaymentMethodData {
  expectedAmount: number;
  receivedAmount: number;
  discrepancy: number;
  verified: boolean;
}

interface GastoItem {
  description: string;
  amount: number;
  category: string;
  createdBy: string;
  verified: boolean;
}

interface GastoData {
  expectedTotal: number;
  actualTotal: number;
  discrepancy: number;
  verified: boolean;
  items: GastoItem[];
}

interface ArqueoData {
  store: { id: string; name: string };
  dateRange: { startDate: Date; endDate: Date };
  inStore: {
    efectivo: PaymentMethodData;
    transferencia: PaymentMethodData;
    tarjeta: PaymentMethodData;
  };
  online: {
    transferencia: PaymentMethodData;
    tarjeta: PaymentMethodData;
  };
  redesSociales: {
    transferencia: PaymentMethodData;
    tarjeta: PaymentMethodData;
  };
  gastos: GastoData;
}

interface Corte {
  _id: string;
  cutNumber: number;
  storeName: string;
  periodStart: string;
  periodEnd: string;
  type: string;
  totals: { totalSales: number };
  createdAt: string;
}

export default function ArqueoContent() {
  const { data: session } = useSession();
  const [corteNumber, setCorteNumber] = useState<string>("");
  const [searchStartDate, setSearchStartDate] = useState<string>("");
  const [searchEndDate, setSearchEndDate] = useState<string>("");
  const [cortesList, setCortesList] = useState<Corte[]>([]);
  const [corteData, setCorteData] = useState<any>(null);
  const [arqueoData, setArqueoData] = useState<ArqueoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  // Fetch recent cortes on component mount
  useEffect(() => {
    fetchRecentCortes();
  }, []);

  const fetchRecentCortes = async (startDate?: string, endDate?: string) => {
    setLoading(true);
    try {
      let url = "/api/admin/arqueo/recent";
      const params = new URLSearchParams();

      if (startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      }

      if (params.toString()) {
        url += "?" + params.toString();
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setCortesList(data.cortes);
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los cortes",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching cortes:", error);
      toast({
        title: "Error",
        description: "Error al cargar los cortes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByDate = () => {
    if (!searchStartDate || !searchEndDate) {
      toast({
        title: "Error",
        description: "Por favor completa ambas fechas",
        variant: "destructive",
      });
      return;
    }

    fetchRecentCortes(searchStartDate, searchEndDate);
  };

  const handleSearchCorte = async () => {
    if (!corteNumber.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un número de corte",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/arqueo/search?cutNumber=${corteNumber}`);
      const data = await response.json();

      if (!data.success) {
        toast({
          title: "Error",
          description: data.error || "Corte no encontrado",
          variant: "destructive",
        });
        return;
      }

      setCorteData(data.corte);
      loadCorteForAudit(data.corte);
    } catch (error) {
      console.error("Error fetching corte:", error);
      toast({
        title: "Error",
        description: "Error al buscar el corte",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCorte = (corte: Corte) => {
    setCorteData(corte);
    loadCorteForAudit(corte);
  };

  const loadCorteForAudit = (corte: any) => {
    setArqueoData({
      store: {
        id: corte.store?.toString() || "",
        name: corte.storeName,
      },
      dateRange: {
        startDate: new Date(corte.periodStart),
        endDate: new Date(corte.periodEnd),
      },
      inStore: {
        efectivo: {
          expectedAmount: corte.paymentMethods?.inStore?.efectivo || corte.totals?.cashSales || 0,
          receivedAmount: 0,
          discrepancy: 0,
          verified: false,
        },
        transferencia: {
          expectedAmount: corte.paymentMethods?.inStore?.transferencia || 0,
          receivedAmount: 0,
          discrepancy: 0,
          verified: false,
        },
        tarjeta: {
          expectedAmount: corte.paymentMethods?.inStore?.tarjeta || corte.totals?.cardSales || 0,
          receivedAmount: 0,
          discrepancy: 0,
          verified: false,
        },
      },
      online: {
        transferencia: {
          expectedAmount: corte.paymentMethods?.online?.transferencia || 0,
          receivedAmount: 0,
          discrepancy: 0,
          verified: false,
        },
        tarjeta: {
          expectedAmount: corte.paymentMethods?.online?.tarjeta || 0,
          receivedAmount: 0,
          discrepancy: 0,
          verified: false,
        },
      },
      redesSociales: {
        transferencia: {
          expectedAmount: corte.paymentMethods?.redesSociales?.transferencia || 0,
          receivedAmount: 0,
          discrepancy: 0,
          verified: false,
        },
        tarjeta: {
          expectedAmount: corte.paymentMethods?.redesSociales?.tarjeta || 0,
          receivedAmount: 0,
          discrepancy: 0,
          verified: false,
        },
      },
      gastos: {
        expectedTotal: corte.gastos?.total || 0,
        actualTotal: 0,
        discrepancy: 0,
        verified: false,
        items: (corte.gastos?.items || []).map((item: any) => ({
          description: item.description,
          amount: item.amount,
          category: item.category,
          createdBy: item.createdBy,
          verified: false,
        })),
      },
    });
  };

  const updatePaymentMethod = (
    category: "inStore" | "online" | "redesSociales",
    method: string,
    field: string,
    value: any,
  ) => {
    if (!arqueoData) return;

    const updated = JSON.parse(JSON.stringify(arqueoData));

    try {
      const categoryData = updated[category];
      const methodData = categoryData[method];

      if (!methodData) return;

      if (field === "receivedAmount" || field === "expectedAmount") {
        methodData[field] = parseFloat(value) || 0;
        methodData.discrepancy =
          methodData.receivedAmount - methodData.expectedAmount;
      } else if (field === "verified") {
        methodData.verified = value;
      }

      setArqueoData(updated);
    } catch (error) {
      console.error("Error updating payment method:", error);
    }
  };

  const updateGastos = (field: string, value: any) => {
    if (!arqueoData) return;

    const updated = JSON.parse(JSON.stringify(arqueoData));

    try {
      if (field === "actualTotal") {
        updated.gastos.actualTotal = parseFloat(value) || 0;
        updated.gastos.discrepancy =
          updated.gastos.actualTotal - updated.gastos.expectedTotal;
      } else if (field === "verified") {
        updated.gastos.verified = value;
      }

      setArqueoData(updated);
    } catch (error) {
      console.error("Error updating gastos:", error);
    }
  };

  const updateGastoItem = (index: number, verified: boolean) => {
    if (!arqueoData) return;

    const updated = JSON.parse(JSON.stringify(arqueoData));
    if (updated.gastos.items[index]) {
      updated.gastos.items[index].verified = verified;
    }
    setArqueoData(updated);
  };

  const allVerified =
    arqueoData &&
    arqueoData.inStore.efectivo.verified &&
    arqueoData.inStore.transferencia.verified &&
    arqueoData.inStore.tarjeta.verified &&
    arqueoData.online.transferencia.verified &&
    arqueoData.online.tarjeta.verified &&
    arqueoData.redesSociales.transferencia.verified &&
    arqueoData.redesSociales.tarjeta.verified &&
    arqueoData.gastos.verified;

  // Check for significant discrepancies (> 1%)
  const hasDiscrepancyAlert = () => {
    if (!arqueoData) return false;

    const checkMethod = (method: PaymentMethodData) => {
      if (method.expectedAmount === 0) return false;
      const percentage = Math.abs(method.discrepancy) / method.expectedAmount;
      return percentage > 0.01;
    };

    return (
      checkMethod(arqueoData.inStore.efectivo) ||
      checkMethod(arqueoData.inStore.transferencia) ||
      checkMethod(arqueoData.inStore.tarjeta) ||
      checkMethod(arqueoData.online.transferencia) ||
      checkMethod(arqueoData.online.tarjeta) ||
      checkMethod(arqueoData.redesSociales.transferencia) ||
      checkMethod(arqueoData.redesSociales.tarjeta)
    );
  };

  const exportToPDF = () => {
    if (!arqueoData) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // Header
      doc.setFontSize(16);
      doc.text("REPORTE DE ARQUEO", pageWidth / 2, yPosition, { align: "center" });

      yPosition += 15;
      doc.setFontSize(10);

      // Basic Info
      doc.text(`Sucursal: ${arqueoData.store.name}`, 20, yPosition);
      yPosition += 7;
      doc.text(
        `Período: ${new Date(arqueoData.dateRange.startDate).toLocaleDateString("es-MX")} - ${new Date(arqueoData.dateRange.endDate).toLocaleDateString("es-MX")}`,
        20,
        yPosition,
      );
      yPosition += 7;
      doc.text(
        `Realizado por: ${(session?.user as any)?.name || "Admin"}`,
        20,
        yPosition,
      );
      yPosition += 7;
      doc.text(`Fecha: ${new Date().toLocaleDateString("es-MX")}`, 20, yPosition);

      yPosition += 12;
      doc.setFontSize(11);
      doc.text("EN TIENDA", 20, yPosition);
      yPosition += 8;

      // In Store Table
      const inStoreData = [
        ["Método", "Esperado", "Recibido", "Discrepancia"],
        [
          "Efectivo",
          `$${arqueoData.inStore.efectivo.expectedAmount.toFixed(2)}`,
          `$${arqueoData.inStore.efectivo.receivedAmount.toFixed(2)}`,
          `$${arqueoData.inStore.efectivo.discrepancy.toFixed(2)}`,
        ],
        [
          "Transferencia",
          `$${arqueoData.inStore.transferencia.expectedAmount.toFixed(2)}`,
          `$${arqueoData.inStore.transferencia.receivedAmount.toFixed(2)}`,
          `$${arqueoData.inStore.transferencia.discrepancy.toFixed(2)}`,
        ],
        [
          "Tarjeta",
          `$${arqueoData.inStore.tarjeta.expectedAmount.toFixed(2)}`,
          `$${arqueoData.inStore.tarjeta.receivedAmount.toFixed(2)}`,
          `$${arqueoData.inStore.tarjeta.discrepancy.toFixed(2)}`,
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
        ["Método", "Esperado", "Recibido", "Discrepancia"],
        [
          "Transferencia",
          `$${arqueoData.online.transferencia.expectedAmount.toFixed(2)}`,
          `$${arqueoData.online.transferencia.receivedAmount.toFixed(2)}`,
          `$${arqueoData.online.transferencia.discrepancy.toFixed(2)}`,
        ],
        [
          "Tarjeta",
          `$${arqueoData.online.tarjeta.expectedAmount.toFixed(2)}`,
          `$${arqueoData.online.tarjeta.receivedAmount.toFixed(2)}`,
          `$${arqueoData.online.tarjeta.discrepancy.toFixed(2)}`,
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
        ["Método", "Esperado", "Recibido", "Discrepancia"],
        [
          "Transferencia",
          `$${arqueoData.redesSociales.transferencia.expectedAmount.toFixed(2)}`,
          `$${arqueoData.redesSociales.transferencia.receivedAmount.toFixed(2)}`,
          `$${arqueoData.redesSociales.transferencia.discrepancy.toFixed(2)}`,
        ],
        [
          "Tarjeta",
          `$${arqueoData.redesSociales.tarjeta.expectedAmount.toFixed(2)}`,
          `$${arqueoData.redesSociales.tarjeta.receivedAmount.toFixed(2)}`,
          `$${arqueoData.redesSociales.tarjeta.discrepancy.toFixed(2)}`,
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

      // Totals
      doc.setFontSize(11);
      doc.text("RESUMEN", 20, yPosition);
      yPosition += 8;

      const totalsData = [
        ["Concepto", "Monto"],
        ["Total Esperado", `$${(arqueoData.inStore.efectivo.expectedAmount + arqueoData.inStore.transferencia.expectedAmount + arqueoData.inStore.tarjeta.expectedAmount + arqueoData.online.transferencia.expectedAmount + arqueoData.online.tarjeta.expectedAmount + arqueoData.redesSociales.transferencia.expectedAmount + arqueoData.redesSociales.tarjeta.expectedAmount).toFixed(2)}`],
        ["Total Recibido", `$${(arqueoData.inStore.efectivo.receivedAmount + arqueoData.inStore.transferencia.receivedAmount + arqueoData.inStore.tarjeta.receivedAmount + arqueoData.online.transferencia.receivedAmount + arqueoData.online.tarjeta.receivedAmount + arqueoData.redesSociales.transferencia.receivedAmount + arqueoData.redesSociales.tarjeta.receivedAmount).toFixed(2)}`],
      ];

      (doc as any).autoTable({
        head: [totalsData[0]],
        body: totalsData.slice(1),
        startY: yPosition,
        theme: "grid",
      });

      // Notes
      if (notes) {
        yPosition = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.text("Notas:", 20, yPosition);
        yPosition += 5;
        const noteLines = doc.splitTextToSize(notes, pageWidth - 40);
        doc.text(noteLines, 20, yPosition);
      }

      const fileName = `Arqueo_${arqueoData.store.name}_${new Date().toLocaleDateString("es-MX").replace(/\//g, "-")}.pdf`;
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

  const handleSubmitArqueo = async () => {
    if (!arqueoData || !allVerified) {
      toast({
        title: "Error",
        description: "Por favor verifica todos los montos antes de enviar",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/arqueo/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: arqueoData.store.id,
          storeName: arqueoData.store.name,
          dateRange: {
            startDate: new Date(arqueoData.dateRange.startDate),
            endDate: new Date(arqueoData.dateRange.endDate),
          },
          inStore: arqueoData.inStore,
          online: arqueoData.online,
          redesSociales: arqueoData.redesSociales,
          gastos: arqueoData.gastos,
          notes,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Éxito",
          description: "Arqueo registrado correctamente",
        });
        // Reset form and reload cortes
        setArqueoData(null);
        setCorteNumber("");
        setCorteData(null);
        setNotes("");
        fetchRecentCortes();
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al registrar el arqueo",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting arqueo:", error);
      toast({
        title: "Error",
        description: "Error al registrar el arqueo",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const PaymentMethodRow = ({
    category,
    method,
    label,
  }: {
    category: "inStore" | "online" | "redesSociales";
    method: string;
    label: string;
  }) => {
    if (!arqueoData) return null;
    const methodData = (arqueoData[category] as any)?.[method] as PaymentMethodData;

    if (!methodData) return null;

    return (
      <div className="grid grid-cols-6 gap-4 items-end py-3 border-b">
        <div>
          <p className="font-medium text-sm">{label}</p>
        </div>
        <div>
          <Label className="text-xs">Monto Esperado</Label>
          <p className="font-semibold">
            ${methodData.expectedAmount.toFixed(2)}
          </p>
        </div>
        <div>
          <Label htmlFor={`${category}-${method}-received`} className="text-xs">
            Monto Recibido
          </Label>
          <Input
            id={`${category}-${method}-received`}
            type="number"
            step="0.01"
            value={methodData.receivedAmount}
            onChange={(e) =>
              updatePaymentMethod(category, method, "receivedAmount", e.target.value)
            }
            className="w-full"
            disabled={methodData.verified}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            Discrepancia
          </p>
          <p
            className={`font-bold ${
              methodData.discrepancy === 0
                ? "text-green-600"
                : methodData.discrepancy > 0
                  ? "text-blue-600"
                  : "text-red-600"
            }`}
          >
            ${methodData.discrepancy.toFixed(2)}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Checkbox
            id={`${category}-${method}-verify`}
            checked={methodData.verified}
            onCheckedChange={(checked) =>
              updatePaymentMethod(category, method, "verified", checked)
            }
          />
          <Label
            htmlFor={`${category}-${method}-verify`}
            className="text-xs cursor-pointer"
          >
            Verificado
          </Label>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Revisión de Cortes</h1>
        <p className="text-muted-foreground">
          Busca el corte de caja y verifica los montos recibidos de cada método de pago
        </p>
      </div>

      {/* Search Section */}
      {!arqueoData && (
        <Card>
          <CardHeader>
            <CardTitle>Búsqueda de Corte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search by Corte Number */}
            <div>
              <h3 className="font-semibold mb-4">Por Número de Corte</h3>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="corte-number">Número de Corte</Label>
                  <Input
                    id="corte-number"
                    type="text"
                    placeholder="Ej: 2024-10-001"
                    value={corteNumber}
                    onChange={(e) => setCorteNumber(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearchCorte();
                      }
                    }}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleSearchCorte}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? "Buscando..." : "Buscar Corte"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t"></div>

            {/* Search by Date */}
            <div>
              <h3 className="font-semibold mb-4">Por Rango de Fechas</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="start-date">Fecha Inicio</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={searchStartDate}
                    onChange={(e) => setSearchStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">Fecha Fin</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={searchEndDate}
                    onChange={(e) => setSearchEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleSearchByDate}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? "Cargando..." : "Buscar por Fechas"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Cortes List */}
      {!arqueoData && (
        <Card>
          <CardHeader>
            <CardTitle>
              Cortes Recientes
              {searchStartDate &&
                searchEndDate &&
                ` (${new Date(searchStartDate).toLocaleDateString("es-MX")} - ${new Date(searchEndDate).toLocaleDateString("es-MX")})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Cargando...</p>
            ) : cortesList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No se encontraron cortes
              </p>
            ) : (
              <div className="space-y-3">
                {cortesList.map((corte) => (
                  <div
                    key={corte._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-lg">
                          Corte #{corte.cutNumber}
                        </span>
                        <span className="text-xs bg-muted px-3 py-1 rounded capitalize">
                          {corte.type}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>
                          <strong>Sucursal:</strong> {corte.storeName}
                        </p>
                        <p>
                          <strong>Período:</strong>{" "}
                          {new Date(corte.periodStart).toLocaleDateString("es-MX")} -{" "}
                          {new Date(corte.periodEnd).toLocaleDateString("es-MX")}
                        </p>
                        <p>
                          <strong>Total Ventas:</strong> $
                          {(corte.totals?.totalSales || 0).toFixed(2)}
                        </p>
                        <p>
                          <strong>Creado:</strong>{" "}
                          {new Date(corte.createdAt).toLocaleDateString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => handleSelectCorte(corte)} size="sm">
                      Auditar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Arqueo Form */}
      {arqueoData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Arqueo de {arqueoData.store.name} - Corte #{corteData?.cutNumber}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                {new Date(arqueoData.dateRange.startDate).toLocaleDateString("es-MX")} -{" "}
                {new Date(arqueoData.dateRange.endDate).toLocaleDateString("es-MX")}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* In Store Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">En Tienda</h3>
                <PaymentMethodRow
                  category="inStore"
                  method="efectivo"
                  label="Efectivo"
                />
                <PaymentMethodRow
                  category="inStore"
                  method="transferencia"
                  label="Transferencia"
                />
                <PaymentMethodRow
                  category="inStore"
                  method="tarjeta"
                  label="Tarjeta"
                />
              </div>

              {/* Online Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Ventas Online</h3>
                <PaymentMethodRow
                  category="online"
                  method="transferencia"
                  label="Transferencia"
                />
                <PaymentMethodRow
                  category="online"
                  method="tarjeta"
                  label="Tarjeta"
                />
              </div>

              {/* Social Media Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Redes Sociales</h3>
                <PaymentMethodRow
                  category="redesSociales"
                  method="transferencia"
                  label="Transferencia"
                />
                <PaymentMethodRow
                  category="redesSociales"
                  method="tarjeta"
                  label="Tarjeta"
                />
              </div>

              {/* Gastos Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Gastos del Día</h3>
                  {arqueoData?.gastos.items.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No hay gastos registrados para este periodo.</p>
                  ) : (
                    <div className="space-y-3">
                      {arqueoData?.gastos.items.map((item, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <p className="font-medium">{item.description}</p>
                              <p className="text-sm text-muted-foreground">
                                Categoría: {item.category} | Por: {item.createdBy}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="font-semibold">${item.amount.toFixed(2)}</p>
                              <Checkbox
                                checked={item.verified}
                                onCheckedChange={(checked) =>
                                  updateGastoItem(index, !!checked)
                                }
                                title="Verificar gasto"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 bg-muted p-4 rounded-lg">
                  <div>
                    <Label className="text-muted-foreground text-xs">Total Esperado</Label>
                    <p className="text-xl font-bold">
                      ${arqueoData?.gastos.expectedTotal.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="actualGastos" className="text-muted-foreground text-xs">
                      Total Actual
                    </Label>
                    <Input
                      id="actualGastos"
                      type="number"
                      step="0.01"
                      value={arqueoData?.gastos.actualTotal || 0}
                      onChange={(e) => updateGastos("actualTotal", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Discrepancia</Label>
                    <p className={`text-xl font-bold ${
                      Math.abs(arqueoData?.gastos.discrepancy || 0) > 0.01
                        ? "text-red-600"
                        : "text-green-600"
                    }`}>
                      ${(arqueoData?.gastos.discrepancy || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="verifyGastos"
                    checked={arqueoData?.gastos.verified || false}
                    onCheckedChange={(checked) =>
                      updateGastos("verified", !!checked)
                    }
                  />
                  <Label
                    htmlFor="verifyGastos"
                    className="font-medium cursor-pointer"
                  >
                    Verificar gastos
                  </Label>
                </div>
              </div>

              {/* Discrepancy Alert */}
              {hasDiscrepancyAlert() && (
                <Card className="border-red-500 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="text-red-600 text-xl">⚠️</div>
                      <div>
                        <p className="font-semibold text-red-900">
                          Alerta de Discrepancia
                        </p>
                        <p className="text-sm text-red-800 mt-1">
                          Se ha detectado una discrepancia mayor al 1% en uno o más métodos de pago.
                          Por favor revisa los montos antes de registrar el arqueo.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Añade cualquier nota sobre discrepancias o observaciones..."
                  className="mt-2"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 flex-wrap">
                <Button
                  onClick={() => {
                    setArqueoData(null);
                    setCorteNumber("");
                    setCorteData(null);
                    setNotes("");
                  }}
                  variant="outline"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={exportToPDF}
                  variant="outline"
                  disabled={!allVerified}
                >
                  Descargar PDF
                </Button>
                <Button
                  onClick={handleSubmitArqueo}
                  disabled={submitting || !allVerified}
                  className="flex-1"
                >
                  {submitting ? "Registrando..." : "Registrar Arqueo"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
