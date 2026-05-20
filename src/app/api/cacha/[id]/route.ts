import { NextRequest, NextResponse } from "next/server";
import CachaRegistration from "@/backend/models/CachaRegistration";
import dbConnect from "@/lib/db";
import { sendCachaCancellationEmail } from "@/backend/helpers/emailService";

// Configuración para renderizado dinámico
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET - Obtener un registro específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const { id } = params;

    const registration = await CachaRegistration.findById(id).select("-__v");

    if (!registration) {
      return NextResponse.json(
        {
          success: false,
          message: "Registro no encontrado",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: registration,
    });
  } catch (error) {
    console.error("Error al obtener registro:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener el registro",
      },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar estado de un registro
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const { id } = params;
    const body = await request.json();
    const { estado, notificacionesEnviadas, razonCancelacion } = body;

    // Validar estado
    const estadosValidos = ["pendiente", "confirmado", "asistio", "cancelado"];
    if (estado && !estadosValidos.includes(estado)) {
      return NextResponse.json(
        {
          success: false,
          message: "Estado no válido",
        },
        { status: 400 }
      );
    }

    // Si es cancelación, requerir razón
    if (estado === "cancelado" && !razonCancelacion?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "La razón de cancelación es requerida",
        },
        { status: 400 }
      );
    }

    // Obtener el registro actual antes de actualizar
    const currentRegistration = await CachaRegistration.findById(id);
    if (!currentRegistration) {
      return NextResponse.json(
        {
          success: false,
          message: "Registro no encontrado",
        },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (estado) updateData.estado = estado;
    if (typeof notificacionesEnviadas === "boolean") {
      updateData.notificacionesEnviadas = notificacionesEnviadas;
    }

    const registration = await CachaRegistration.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select("-__v");

    if (!registration) {
      return NextResponse.json(
        {
          success: false,
          message: "Registro no encontrado",
        },
        { status: 404 }
      );
    }

    // Si el estado cambió a cancelado, enviar email de cancelación
    if (estado === "cancelado" && currentRegistration.estado !== "cancelado") {
      try {
        await sendCachaCancellationEmail({
          nombre: registration.nombre,
          email: registration.email,
          codigoConfirmacion: registration.codigoConfirmacion!,
          razonCancelacion: razonCancelacion.trim(),
          fechaCancelacion: new Date(),
        });
        console.log(
          "Email de cancelación enviado exitosamente a:",
          registration.email
        );
      } catch (emailError) {
        console.error("Error al enviar email de cancelación:", emailError);
        // No fallar la actualización si hay error en el email
      }
    }

    return NextResponse.json({
      success: true,
      data: registration,
      message: "Registro actualizado correctamente",
    });
  } catch (error) {
    console.error("Error al actualizar registro:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al actualizar el registro",
      },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un registro
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const { id } = params;

    const registration = await CachaRegistration.findByIdAndDelete(id);

    if (!registration) {
      return NextResponse.json(
        {
          success: false,
          message: "Registro no encontrado",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Registro eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar registro:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al eliminar el registro",
      },
      { status: 500 }
    );
  }
}
