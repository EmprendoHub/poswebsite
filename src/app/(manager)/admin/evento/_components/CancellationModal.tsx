"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { CachaRegistration } from "@/types/cacha";
import Swal from "sweetalert2";

interface CancellationModalProps {
  isOpen: boolean;
  registration: CachaRegistration | null;
  onClose: () => void;
  onCancel: () => void;
}

const CancellationModal: React.FC<CancellationModalProps> = ({
  isOpen,
  registration,
  onClose,
  onCancel,
}) => {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      Swal.fire({
        title: "Razón requerida",
        text: "Por favor, proporciona una razón para la cancelación",
        icon: "warning",
      });
      return;
    }

    if (!registration) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/cacha/${registration._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          estado: "cancelado",
          razonCancelacion: reason.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          title: "¡Cancelado!",
          text: "El registro ha sido cancelado y se ha enviado un email de notificación",
          icon: "success",
        });

        onCancel();
        onClose();
        setReason("");
      } else {
        throw new Error(data.message || "Error al cancelar");
      }
    } catch (error) {
      console.error("Error cancelling registration:", error);
      Swal.fire({
        title: "Error",
        text: "Hubo un problema al cancelar el registro",
        icon: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Cancelar Registro
          </DialogTitle>
        </DialogHeader>

        {registration && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-gray-700">
                Participante a cancelar:
              </h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>
                  <strong>Nombre:</strong> {registration.nombre}
                </p>
                <p>
                  <strong>Email:</strong> {registration.email}
                </p>
                <p>
                  <strong>Código:</strong> {registration.codigoConfirmacion}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="reason" className="text-base font-medium">
                  Razón de la cancelación{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Explica el motivo de la cancelación (este mensaje se enviará al participante)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="mt-1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Esta razón se incluirá en el email de cancelación que se
                  enviará al participante.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Importante:</p>
                    <p>
                      Esta acción cancelará permanentemente el registro y
                      enviará un email de notificación al participante con la
                      razón proporcionada.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !reason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isSubmitting ? "Cancelando..." : "Confirmar Cancelación"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CancellationModal;
