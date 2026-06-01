"use client";
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import { MdClose, MdCameraswitch, MdRefresh, MdCheck } from "react-icons/md";

interface Props {
  onScan: (value: string) => void;
  onClose: () => void;
}

export default function BarcodeScannerModal({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  const [scanKey, setScanKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState<string | null>(null);
  const [editedValue, setEditedValue] = useState("");

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Enumerate cameras once on mount
  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((devices) => {
        setCameras(devices);
        const rearIdx = devices.findIndex((d) =>
          /back|rear|environment/i.test(d.label),
        );
        setCameraIndex(rearIdx >= 0 ? rearIdx : 0);
      })
      .catch(() => setError("No se pudo acceder a las cámaras."));

    return () => stopStream();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start/restart decode loop whenever the selected camera changes
  useEffect(() => {
    if (cameras.length === 0 || !videoRef.current) return;

    stopStream();
    setError(null);
    setScanned(null);

    const deviceId = cameras[cameraIndex]?.deviceId;
    const reader = new BrowserMultiFormatReader();

    const constraints: MediaStreamConstraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: "environment" },
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        streamRef.current = stream;
        const video = videoRef.current!;
        // Let decodeFromStream manage srcObject + play() internally to avoid
        // a concurrent video.play() promise that escapes our try/catch.
        void reader
          .decodeFromStream(stream, video, (result, err) => {
            if (result) {
              const text = result.getText();
              setScanned(text);
              setEditedValue(text);
              stopStream();
              onScan(text);
            } else if (err && !(err instanceof NotFoundException)) {
              console.warn("Scanner error:", err);
            }
          })
          .catch((e: any) => {
            // AbortError is expected whenever stopStream() is called mid-scan.
            if (e?.name === "AbortError") return;
            setError("Error al decodificar.");
            console.error(e);
          });
      })
      .catch(() => {
        setError("No se pudo iniciar la cámara. Verifica los permisos.");
      });

    return () => stopStream();
  }, [cameras, cameraIndex, scanKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function cycleCamera() {
    setCameraIndex((prev) => (prev + 1) % cameras.length);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-muted">
          <h2 className="font-semibold text-sm">Escanear código</h2>
          <div className="flex items-center gap-2">
            {scanned && (
              <button
                onClick={() => {
                  setScanned(null);
                  setEditedValue("");
                  setError(null);
                  setScanKey((k) => k + 1);
                }}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                title="Volver a escanear"
              >
                <MdRefresh size={18} />
              </button>
            )}
            {cameras.length > 1 && !scanned && (
              <button
                onClick={cycleCamera}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                title="Cambiar cámara"
              >
                <MdCameraswitch size={18} />
              </button>
            )}
            <button
              onClick={() => {
                stopStream();
                onClose();
              }}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <MdClose size={18} />
            </button>
          </div>
        </div>

        {/* Viewfinder */}
        <div className="relative bg-black">
          <video
            ref={videoRef}
            className="w-full aspect-square object-cover"
            muted
            playsInline
          />
          {/* Aim overlay */}
          {!scanned && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white/70 rounded-lg relative">
                <span className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-primary rounded-tl" />
                <span className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-primary rounded-tr" />
                <span className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-primary rounded-bl" />
                <span className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-primary rounded-br" />
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="px-4 py-3 text-sm min-h-[52px] flex flex-col items-center justify-center gap-2">
          {error && <p className="text-red-500 text-center">{error}</p>}
          {scanned && (
            <>
              <p className="text-green-600 text-xs font-medium">
                ✓ Código detectado — edita si es necesario
              </p>
              <div className="flex items-center gap-2 w-full">
                <input
                  className="flex-1 border border-input rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  value={editedValue}
                  onChange={(e) => setEditedValue(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (editedValue.trim()) onScan(editedValue.trim());
                  }}
                  disabled={!editedValue.trim()}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                  title="Confirmar"
                >
                  <MdCheck size={18} />
                </button>
              </div>
            </>
          )}
          {!error && !scanned && (
            <p className="text-muted-foreground text-xs">
              Apunta la cámara al código de barras o QR
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
