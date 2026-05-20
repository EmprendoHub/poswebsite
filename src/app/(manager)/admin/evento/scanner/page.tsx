"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Camera,
  CameraOff,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  RotateCcw,
} from "lucide-react";
import Swal from "sweetalert2";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface RegistrationData {
  _id: string;
  nombre: string;
  email: string;
  telefono: string;
  edad: number;
  estado: "pendiente" | "confirmado" | "asistio" | "cancelado";
  codigoConfirmacion: string;
  fechaRegistro: string;
  fechaConfirmacion?: string;
  mensaje?: string;
}

const QRScannerPage = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scannedData, setScannedData] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
          scannerRef.current = null;
        } catch (error) {
          console.log("Scanner already cleared");
        }
      }
    };
  }, []);

  // Stop scanner
  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
        console.log("🛑 Escáner detenido");
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
    setIsScanning(false);
    setHasPermission(null);
    setError(null);
  }, []);

  // Initialize scanner with html5-qrcode
  const startScanner = useCallback(() => {
    console.log("🔄 Intentando iniciar escáner...");

    // Set scanning state first
    setIsScanning(true);
    setError(null);

    // Wait a bit for the DOM element to be rendered
    setTimeout(() => {
      const scannerElement = document.getElementById("qr-scanner-container");

      if (!scannerElement) {
        console.error("❌ Elemento del escáner no encontrado");
        setError("Error: Elemento del escáner no encontrado");
        setIsScanning(false);
        return;
      }

      try {
        console.log("🔄 Iniciando escáner QR con html5-qrcode...");

        // Configure supported formats for QR and barcode scanning
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          defaultZoomValueIfSupported: 2,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
        };

        // Success callback - when QR code is detected
        const onScanSuccess = (decodedText: string) => {
          console.log("✅ Código escaneado:", decodedText);

          // Search for the registration with this code
          searchByCode(decodedText);

          // Stop scanner after successful scan
          stopScanner();
        };

        // Error callback
        const onScanError = (errorMessage: string) => {
          // Don't log every frame error, only actual errors
          if (
            !errorMessage.includes(
              "No MultiFormat Readers were able to detect the code"
            ) &&
            !errorMessage.includes("NotFoundException") &&
            !errorMessage.includes("QR code parse error")
          ) {
            console.warn("Scan error:", errorMessage);
          }
        };

        scannerRef.current = new Html5QrcodeScanner(
          "qr-scanner-container",
          config,
          true // Enable verbose mode for camera selection
        );

        scannerRef.current.render(onScanSuccess, onScanError);
        setHasPermission(true);
        console.log("✅ Escáner QR iniciado correctamente");
      } catch (err) {
        console.error("❌ Error starting scanner:", err);
        setError(
          "No se pudo iniciar el escáner. Verifique los permisos de cámara."
        );
        setHasPermission(false);
        setIsScanning(false);
      }
    }, 100); // Small delay to ensure DOM is ready
  }, [stopScanner]);

  const searchByCode = async (code: string) => {
    if (!code.trim()) return;

    setLoading(true);
    console.log("🔍 Buscando código:", code);

    try {
      const response = await fetch(
        `/api/cacha?search=${encodeURIComponent(code)}`
      );
      const data = await response.json();

      console.log("📊 Respuesta de la API:", data);
      console.log("📝 Datos recibidos:", data.data);

      if (data.success && data.data && data.data.length > 0) {
        console.log("🔍 Buscando en", data.data.length, "registros");

        // Buscar el registro que coincida exactamente con el código
        const registration = data.data.find((reg: RegistrationData) => {
          console.log("🔍 Comparando:", reg.codigoConfirmacion, "con", code);
          return reg.codigoConfirmacion === code;
        });

        console.log("✅ Registro encontrado:", registration);

        if (registration) {
          setScannedData(registration);
          setIsModalOpen(true);
          console.log("✅ Datos del participante cargados");
        } else {
          console.log("❌ No se encontró coincidencia exacta");
          console.log(
            "📋 Códigos disponibles:",
            data.data.map((reg: RegistrationData) => reg.codigoConfirmacion)
          );

          Swal.fire({
            title: "No encontrado",
            html: `
              <p>No se encontró ningún registro con este código: <strong>${code}</strong></p>
              <p class="text-sm text-gray-600 mt-2">
                Códigos disponibles: ${data.data
                  .map((reg: RegistrationData) => reg.codigoConfirmacion)
                  .join(", ")}
              </p>
            `,
            icon: "warning",
          });
          setScannedData(null);
        }
      } else {
        console.log("❌ No hay datos o la búsqueda falló");
        Swal.fire(
          "No encontrado",
          `No se encontró ningún registro con este código: ${code}`,
          "warning"
        );
        setScannedData(null);
      }
    } catch (error) {
      console.error("❌ Error searching registration:", error);
      Swal.fire("Error", "Error al buscar el registro", "error");
    } finally {
      setLoading(false);
    }
  };

  const markAsAttended = async (id: string) => {
    try {
      const response = await fetch(`/api/cacha/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estado: "asistio" }),
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          title: "¡Acceso Confirmado!",
          text: "El participante ha sido marcado como asistente",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });

        // Actualizar el estado local
        if (scannedData) {
          setScannedData({ ...scannedData, estado: "asistio" });
        }

        // Limpiar después de un momento
        setTimeout(() => {
          setScannedData(null);
          setManualCode("");
          setIsModalOpen(false);
        }, 2000);
      } else {
        Swal.fire(
          "Error",
          data.message || "Error al marcar asistencia",
          "error"
        );
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      Swal.fire("Error", "Error al procesar la solicitud", "error");
    }
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case "confirmado":
        return "bg-blue-500";
      case "asistio":
        return "bg-emerald-600";
      case "pendiente":
        return "bg-yellow-500";
      case "cancelado":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case "confirmado":
        return <CheckCircle className="w-4 h-4" />;
      case "asistio":
        return <UserCheck className="w-4 h-4" />;
      case "pendiente":
        return <Clock className="w-4 h-4" />;
      case "cancelado":
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <>
      <style jsx global>{`
        .qr-scanner-container video {
          object-fit: cover !important;
          border-radius: 8px;
        }

        .qr-scanner-container #qr-shaded-region {
          border-radius: 8px;
        }

        .qr-scanner-container #qr-scanning-region {
          border-radius: 8px;
        }

        #html5-qrcode-button-camera-permission,
        #html5-qrcode-button-camera-start {
          background-color: #3b82f6 !important;
          color: white !important;
          border: none !important;
          padding: 8px 16px !important;
          border-radius: 6px !important;
          font-size: 14px !important;
          margin: 4px !important;
        }

        #html5-qrcode-button-camera-stop {
          background-color: #ef4444 !important;
          color: white !important;
          border: none !important;
          padding: 8px 16px !important;
          border-radius: 6px !important;
          font-size: 14px !important;
          margin: 4px !important;
        }

        #html5-qrcode-select-camera {
          background-color: white !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
          padding: 8px 12px !important;
          font-size: 14px !important;
          margin: 4px !important;
          color: #374151 !important;
        }

        #html5-qrcode-select-camera:focus {
          outline: none !important;
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
        }

        .html5-qrcode-element {
          margin: 4px !important;
        }

        #html5-qrcode-anchor-scan-type-change {
          color: #3b82f6 !important;
          text-decoration: none !important;
          font-size: 14px !important;
          margin: 4px !important;
        }

        #html5-qrcode-anchor-scan-type-change:hover {
          text-decoration: underline !important;
        }
      `}</style>
      <div className=" max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-gray-200 mb-2">
            🎫 Escáner QR - Evento Cacha
          </h1>
        </div>

        {/* Scanner Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Camera Scanner */}
          <Card>
            <CardContent className="p-2">
              <div className="space-y-4">
                <div
                  className="relative max-w-[280px] rounded-lg overflow-hidden border-2 border-gray-300"
                  style={{ aspectRatio: "4/3", minHeight: "450px" }}
                >
                  {isScanning ? (
                    <div
                      id="qr-scanner-container"
                      className="w-full h-full qr-scanner-container"
                      style={
                        {
                          "--qr-border-color": "#ffffff",
                          "--qr-scanner-border-color": "#ffffff",
                          "--qr-text-color": "#ffffff",
                        } as React.CSSProperties
                      }
                    />
                  ) : (
                    <div className="flex flex-col items-start justify-start h-full text-white bg-black">
                      <div className="text-center">
                        <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Presiona iniciar para usar la cámara</p>
                      </div>
                    </div>
                  )}

                  {/* Permission / Error States */}
                  {(hasPermission === false || error) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                      <Card className="w-full max-w-md mx-4">
                        <CardContent className="p-6 text-center">
                          <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <h3 className="text-lg font-semibold mb-2">
                            {error
                              ? "Error de Cámara"
                              : "Acceso a la Cámara Requerido"}
                          </h3>
                          <p className="text-gray-600 mb-4">
                            {error ||
                              "Por favor permita el acceso a la cámara para escanear códigos QR"}
                          </p>
                          <Button onClick={startScanner} className="w-full">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reintentar
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Overlay para ayudar con el enfoque del QR */}
                  {isScanning && !error && hasPermission && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 -translate-y-[15%] w-48 h-48 border-2 border-white border-dashed rounded-lg opacity-50"></div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {!isScanning ? (
                    <Button onClick={startScanner} className="flex-1">
                      <Camera className="w-4 h-4 mr-2" />
                      Iniciar Escáner QR
                    </Button>
                  ) : (
                    <Button
                      onClick={stopScanner}
                      variant="outline"
                      className="flex-1"
                    >
                      <CameraOff className="w-4 h-4 mr-2" />
                      Detener Escáner
                    </Button>
                  )}
                </div>

                {/* Manual Input */}
                <Card>
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2">
                      <Search className="w-5 h-5 mb-2" />
                      Búsqueda Manual
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-4">
                      <div>
                        <Input
                          value={manualCode}
                          onChange={(e) =>
                            setManualCode(e.target.value.toUpperCase())
                          }
                          placeholder="Código de Confirmación"
                          className="font-mono"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              searchByCode(manualCode);
                            }
                          }}
                        />
                      </div>

                      <Button
                        onClick={() => searchByCode(manualCode)}
                        disabled={loading || !manualCode.trim()}
                        className="w-full"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Buscando...
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4 mr-2" />
                            Buscar Registro
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
          {/* Instructions */}
          {/* <Card>
            <CardHeader>
              <CardTitle>📖 Instrucciones de Uso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-600">1.</span>
                  <span>
                    Usa la cámara para escanear el código QR del participante o
                    ingresa manualmente el código
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-600">2.</span>
                  <span>
                    Verifica que el estado sea &ldquo;Confirmado&rdquo; antes de
                    permitir el acceso
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-600">3.</span>
                  <span>
                    Presiona &ldquo;Marcar como Asistido&rdquo; para registrar
                    la asistencia al evento
                  </span>
                </div>
              </div>
            </CardContent>
          </Card> */}
        </div>

        {/* Participant Information Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-[350px] top-[50%]">
            <DialogHeader>
              <DialogTitle className="flex flex-col items-center justify-between">
                <span className="text-lg">📋 Información del Participante</span>
                {scannedData && (
                  <Badge
                    className={`${getStatusColor(
                      scannedData.estado
                    )} text-white`}
                  >
                    {getStatusIcon(scannedData.estado)}
                    <span className="ml-1 text-2xl capitalize">
                      {scannedData.estado}
                    </span>
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            {scannedData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nombre</p>
                    <p className="font-semibold">{scannedData.nombre}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-semibold">{scannedData.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Teléfono</p>
                    <p className="font-semibold">{scannedData.telefono}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Edad</p>
                    <p className="font-semibold">{scannedData.edad} años</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Código</p>
                    <p className="font-mono font-semibold">
                      {scannedData.codigoConfirmacion}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fecha de Registro</p>
                    <p className="font-semibold">
                      {new Date(scannedData.fechaRegistro).toLocaleDateString(
                        "es-MX"
                      )}
                    </p>
                  </div>
                </div>

                {scannedData.mensaje && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">
                      Mensaje para Cacha
                    </p>
                    <p className="italic bg-gray-500 p-3 rounded">
                      &ldquo;{scannedData.mensaje}&rdquo;
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  {scannedData.estado === "confirmado" && (
                    <Button
                      onClick={() => markAsAttended(scannedData._id)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-lg px-8 py-6"
                      size="lg"
                    >
                      <UserCheck className="w-5 h-5 mr-2" />
                      Marcar Asistencia
                    </Button>
                  )}

                  {scannedData.estado === "asistio" && (
                    <div className="flex items-center text-green-600 font-semibold text-lg">
                      <CheckCircle className="w-6 h-6 mr-2" />
                      Ya registró su asistencia
                    </div>
                  )}

                  {scannedData.estado === "pendiente" && (
                    <div className="flex items-center text-yellow-600 font-semibold text-lg">
                      <Clock className="w-6 h-6 mr-2" />
                      Registro pendiente de confirmación
                    </div>
                  )}

                  {scannedData.estado === "cancelado" && (
                    <div className="flex items-center text-red-600 font-semibold text-lg">
                      <XCircle className="w-6 h-6 mr-2" />
                      Registro cancelado
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default QRScannerPage;
