// Tipos para el registro de Cacha
export interface CachaRegistrationForm {
  nombre: string;
  email: string;
  telefono: string;
  edad: string;
  mensaje?: string;
}

export interface CachaRegistrationResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    nombre: string;
    email: string;
    codigoConfirmacion: string;
    fechaRegistro: string;
  };
}

export interface CachaRegistration {
  _id: string;
  nombre: string;
  email: string;
  telefono: string;
  edad: number;
  mensaje?: string;
  fechaRegistro: string;
  estado: "pendiente" | "confirmado" | "asistio" | "cancelado";
  codigoConfirmacion: string;
  notificacionesEnviadas: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CachaRegistrationsResponse {
  success: boolean;
  data: {
    registrations: CachaRegistration[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    estadisticas: Array<{
      _id: string;
      count: number;
    }>;
  };
}
