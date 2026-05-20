import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CachaRegistration from "@/backend/models/CachaRegistration";
import { sendCachaConfirmationEmail } from "@/backend/helpers/emailService";

// Configuración para renderizado dinámico
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const confirmationCode = searchParams.get("code");

    if (!confirmationCode) {
      return NextResponse.redirect(
        new URL("/cacha?error=missing-code", request.url)
      );
    }

    // Buscar el registro por código de confirmación
    const registration = await CachaRegistration.findOne({
      codigoConfirmacion: confirmationCode,
    });

    if (!registration) {
      return NextResponse.redirect(
        new URL("/cacha?error=invalid-code", request.url)
      );
    }

    // Verificar si ya fue confirmado
    if (registration.estado === "confirmado") {
      return NextResponse.redirect(
        new URL("/cacha?message=already-confirmed", request.url)
      );
    }

    // Verificar si no está vencido (24 horas)
    const now = new Date();
    const registrationDate = new Date(registration.fechaRegistro);
    const hoursDifference =
      (now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60);

    if (hoursDifference > 24) {
      // Actualizar estado a vencido
      await CachaRegistration.findByIdAndUpdate(registration._id, {
        estado: "cancelado",
      });

      return NextResponse.redirect(
        new URL("/cacha?error=expired", request.url)
      );
    }

    // Confirmar el registro
    const updatedRegistration = await CachaRegistration.findByIdAndUpdate(
      registration._id,
      {
        estado: "confirmado",
        fechaConfirmacion: new Date(),
      },
      { new: true }
    );

    if (!updatedRegistration) {
      return NextResponse.redirect(
        new URL("/cacha?error=update-failed", request.url)
      );
    }

    // Enviar email con QR de confirmación
    try {
      await sendCachaConfirmationEmail({
        nombre: updatedRegistration.nombre,
        email: updatedRegistration.email,
        codigoConfirmacion: updatedRegistration.codigoConfirmacion!,
        fechaRegistro: updatedRegistration.fechaRegistro,
      });
      console.log(
        "Email con QR enviado exitosamente a:",
        updatedRegistration.email
      );
    } catch (emailError) {
      console.error("Error al enviar email con QR:", emailError);
      // No fallar la confirmación si hay error en el email
    }

    return NextResponse.redirect(
      new URL("/cacha?message=confirmed", request.url)
    );
  } catch (error) {
    console.error("Error al confirmar registro:", error);
    return NextResponse.redirect(
      new URL("/cacha?error=server-error", request.url)
    );
  }
}
