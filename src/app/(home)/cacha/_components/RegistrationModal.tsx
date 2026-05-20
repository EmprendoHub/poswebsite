"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BsUiChecks } from "react-icons/bs";
import {
  CachaRegistrationForm,
  CachaRegistrationResponse,
} from "@/types/cacha";

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState<CachaRegistrationForm>({
    nombre: "",
    email: "",
    telefono: "",
    edad: "",
    mensaje: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/cacha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data: CachaRegistrationResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al procesar el registro");
      }

      if (data.success) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          onClose();
          setFormData({
            nombre: "",
            email: "",
            telefono: "",
            edad: "",
            mensaje: "",
          });
        }, 10000);
      } else {
        throw new Error(data.message || "Error al registrar");
      }
    } catch (error: any) {
      console.error("Error al registrar:", error);
      setError(
        error.message ||
          "Error al procesar el registro. Por favor, intenta de nuevo."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] bg-black border-emerald-200">
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <BsUiChecks className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-emerald-800 mb-4">
              ¡Registro Exitoso! 🎉
            </h3>
            <div className="bg-white rounded-lg p-6 mb-4 border border-emerald-200">
              <p className="text-emerald-700 mb-3 font-medium">
                Te has registrado correctamente para el Meet & Greet con Cacha.
              </p>
              <div className="space-y-2 text-sm text-emerald-600">
                <div className="flex items-center justify-center gap-2">
                  <span>📧</span>
                  <span>
                    Hemos enviado un email de confirmación a tu correo
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span>🎫</span>
                  <span>Incluye tu código de confirmación único</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span>📅</span>
                  <span>Próximamente recibirás detalles del evento</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-green-600 mb-4">
              <strong>Importante:</strong> Revisa tu bandeja de entrada y spam.
              Guarda el código de confirmación para el acceso al evento.
            </p>
            <div className="text-xs text-gray-500">
              Este mensaje se cerrará automáticamente en unos segundos
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-300 border-purple-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent text-center">
            Registro Meet & Greet con Cacha
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Input
                id="nombre"
                name="nombre"
                type="text"
                placeholder="Tu nombre completo"
                value={formData.nombre}
                onChange={handleInputChange}
                required
                className="border-purple-200 text-gray-700 bg-gray-200 focus:border-purple-400 focus:ring-purple-400 placeholder:text-purple-500"
              />
            </div>

            <div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="border-purple-200 text-gray-700 bg-gray-200 focus:border-purple-400 focus:ring-purple-400 placeholder:text-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  placeholder="555-123-4567"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  required
                  className="border-purple-200 text-gray-700 bg-gray-200 focus:border-purple-400 focus:ring-purple-400 placeholder:text-purple-500"
                />
              </div>

              <div>
                <Input
                  id="edad"
                  name="edad"
                  type="number"
                  placeholder="18"
                  min="13"
                  max="100"
                  value={formData.edad}
                  onChange={handleInputChange}
                  required
                  className="border-purple-200 text-gray-700 bg-gray-200 focus:border-purple-400 focus:ring-purple-400 placeholder:text-purple-500"
                />
              </div>
            </div>

            <div>
              <Textarea
                id="mensaje"
                name="mensaje"
                placeholder="Escribe un mensaje para Cacha..."
                value={formData.mensaje}
                onChange={handleInputChange}
                rows={3}
                className="border-purple-200 text-gray-700 bg-gray-200 focus:border-purple-400 focus:ring-purple-400 placeholder:text-purple-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-300 p-4 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-purple-100 p-4 rounded-lg">
            <p className="text-sm text-purple-700">
              <strong>Nota:</strong> Al registrarte, recibirás información
              detallada sobre fecha, hora y ubicación del evento. El acceso es
              gratuito pero los cupos son limitados.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50"
            >
              {isSubmitting ? "Registrando..." : "Registrarme Gratis"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationModal;
