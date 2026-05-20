"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FaPencilAlt,
  FaCheck,
  FaTimes,
  FaEye,
  FaUserCheck,
  FaEnvelope,
} from "react-icons/fa";
import Swal, { SweetAlertIcon } from "sweetalert2";
import { CachaRegistration } from "@/types/cacha";
import CancellationModal from "./CancellationModal";

interface AllCachaRegistrationsComponentProps {
  registrations: CachaRegistration[];
  onRegistrationUpdate: () => void;
  filteredCount: number;
}

const AllCachaRegistrationsComponent: React.FC<
  AllCachaRegistrationsComponentProps
> = ({ registrations, onRegistrationUpdate, filteredCount }) => {
  const [cancellationModal, setCancellationModal] = useState<{
    isOpen: boolean;
    registration: CachaRegistration | null;
  }>({
    isOpen: false,
    registration: null,
  });

  const getStatusBadge = (estado: string) => {
    const statusConfig = {
      pendiente: { color: "bg-yellow-100 text-yellow-800", text: "Pendiente" },
      confirmado: { color: "bg-green-100 text-green-800", text: "Confirmado" },
      asistio: { color: "bg-blue-100 text-blue-800", text: "Asistió" },
      cancelado: { color: "bg-red-100 text-red-800", text: "Cancelado" },
    };

    const config =
      statusConfig[estado as keyof typeof statusConfig] ||
      statusConfig.pendiente;

    return <Badge className={`${config.color} border-0`}>{config.text}</Badge>;
  };

  const handleStatusChange = async (
    registration: CachaRegistration,
    newStatus: string
  ) => {
    let title: string;
    let text: string;
    let confirmBtn: string;
    let successTitle: string;
    let successText: string;
    let icon: SweetAlertIcon;
    let confirmBtnColor: string;

    const statusLabels = {
      confirmado: "confirmar",
      asistio: "marcar como asistió",
      pendiente: "marcar como pendiente",
    };

    const statusLabel =
      statusLabels[newStatus as keyof typeof statusLabels] || newStatus;

    icon = "question";
    title = "¿Estás seguro?";
    text = `¿Deseas ${statusLabel} este registro?`;
    confirmBtn = `Sí, ${statusLabel}`;
    confirmBtnColor = newStatus === "confirmado" ? "#10B981" : "#3B82F6";
    successTitle = "¡Actualizado!";
    successText = `El registro ha sido ${statusLabel}.`;

    const result = await Swal.fire({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonColor: confirmBtnColor,
      cancelButtonColor: "#6B7280",
      confirmButtonText: confirmBtn,
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/cacha/${registration._id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ estado: newStatus }),
        });

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            title: successTitle,
            text: successText,
            icon: "success",
          });
          onRegistrationUpdate();
        } else {
          throw new Error(data.message || "Error al actualizar");
        }
      } catch (error) {
        console.error("Error updating registration:", error);
        Swal.fire({
          title: "Error",
          text: "Hubo un problema al actualizar el registro",
          icon: "error",
        });
      }
    }
  };

  const handleCancellation = (registration: CachaRegistration) => {
    setCancellationModal({
      isOpen: true,
      registration,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">{filteredCount} Registros</h2>
          </div>

          {registrations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron registros
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left">
                      Participante
                    </th>
                    <th scope="col" className="px-6 py-3 text-left">
                      Contacto
                    </th>
                    <th scope="col" className="px-6 py-3 text-left">
                      Código
                    </th>
                    <th scope="col" className="px-6 py-3 text-left">
                      Estado
                    </th>
                    <th scope="col" className="px-6 py-3 text-left">
                      Registro
                    </th>
                    <th scope="col" className="px-6 py-3 text-center">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((registration, index) => (
                    <tr
                      key={registration._id}
                      className={`border-b hover:bg-gray-600 ${
                        registration.estado === "cancelado" ? "bg-red-500" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-100">
                            {registration.nombre}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {registration.edad} años
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-gray-100">
                            {registration.email}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {registration.telefono}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs text-black">
                          {registration.codigoConfirmacion}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(registration.estado)}
                      </td>
                      <td className="px-6 py-4 text-gray-200 text-xs">
                        {formatDate(registration.fechaRegistro)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-center">
                          {/* Ver detalles */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              Swal.fire({
                                title: `Detalles de ${registration.nombre}`,
                                html: `
                                  <div class="text-left">
                                    <p><strong>Email:</strong> ${
                                      registration.email
                                    }</p>
                                    <p><strong>Teléfono:</strong> ${
                                      registration.telefono
                                    }</p>
                                    <p><strong>Edad:</strong> ${
                                      registration.edad
                                    } años</p>
                                    <p><strong>Código:</strong> ${
                                      registration.codigoConfirmacion
                                    }</p>
                                    <p><strong>Estado:</strong> ${
                                      registration.estado
                                    }</p>
                                    <p><strong>Registro:</strong> ${formatDate(
                                      registration.fechaRegistro
                                    )}</p>
                                    ${
                                      registration.mensaje
                                        ? `<p><strong>Mensaje:</strong> ${registration.mensaje}</p>`
                                        : ""
                                    }
                                  </div>
                                `,
                                width: 600,
                                showCloseButton: true,
                                showConfirmButton: false,
                              });
                            }}
                          >
                            <FaEye className="h-3 w-3" />
                          </Button>

                          {/* Confirmar asistencia */}
                          {registration.estado === "pendiente" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() =>
                                handleStatusChange(registration, "confirmado")
                              }
                            >
                              <FaCheck className="h-3 w-3" />
                            </Button>
                          )}

                          {/* Marcar como asistió */}
                          {registration.estado === "confirmado" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700"
                              onClick={() =>
                                handleStatusChange(registration, "asistio")
                              }
                            >
                              <FaUserCheck className="h-3 w-3" />
                            </Button>
                          )}

                          {/* Cancelar registro */}
                          {registration.estado !== "cancelado" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleCancellation(registration)}
                            >
                              <FaTimes className="h-3 w-3" />
                            </Button>
                          )}

                          {/* Reenviar email (solo para confirmados) */}
                          {registration.estado === "confirmado" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-purple-600 hover:text-purple-700"
                              onClick={() => {
                                // TODO: Implementar reenvío de email
                                Swal.fire({
                                  title: "Función próximamente",
                                  text: "La función de reenvío de email estará disponible pronto",
                                  icon: "info",
                                });
                              }}
                            >
                              <FaEnvelope className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de cancelación */}
      <CancellationModal
        isOpen={cancellationModal.isOpen}
        registration={cancellationModal.registration}
        onClose={() =>
          setCancellationModal({ isOpen: false, registration: null })
        }
        onCancel={onRegistrationUpdate}
      />
    </>
  );
};

export default AllCachaRegistrationsComponent;
