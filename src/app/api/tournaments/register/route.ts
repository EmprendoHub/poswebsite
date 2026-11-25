export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import Tournament from "@/backend/models/Tournament";
import TournamentParticipant from "@/backend/models/TournamentParticipant";
import User from "@/backend/models/User";
import { sendTournamentRegistrationEmail } from "@/lib/tournamentEmailService";

/**
 * POST /api/tournaments/register
 * Register a user for a tournament
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?._id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { tournamentId } = body;

    if (!tournamentId) {
      return NextResponse.json(
        { error: "ID de torneo requerido" },
        { status: 400 },
      );
    }

    // Check if tournament exists and is available for registration
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 },
      );
    }

    if (!["upcoming", "active"].includes(tournament.status)) {
      return NextResponse.json(
        { error: "El torneo no está disponible para registro" },
        { status: 400 },
      );
    }

    // Check if user is already registered
    const existingRegistration = await TournamentParticipant.findOne({
      tournamentId,
      userId: session.user._id,
    });

    if (existingRegistration) {
      return NextResponse.json(
        { error: "Ya estás registrado en este torneo" },
        { status: 409 },
      );
    }

    // Get user info
    const user = await User.findById(session.user._id);
    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    // Create participant registration
    const participant = new TournamentParticipant({
      tournamentId,
      userId: session.user._id,
      email: user.email,
      name: user.name,
      status: "registered",
      points: 0,
    });

    await participant.save();

    // Update tournament participant count and pool
    const participantCount = await TournamentParticipant.countDocuments({
      tournamentId,
      status: { $ne: "withdrawn" },
    });

    const totalPool = participantCount * tournament.ticketCost;
    const winnerCredit = totalPool;

    await Tournament.findByIdAndUpdate(tournamentId, {
      totalParticipants: participantCount,
      totalPool,
      winnerCredit,
    });

    // Add tournament to user's tournament history
    await User.findByIdAndUpdate(session.user._id, {
      $addToSet: { tournamentHistory: tournamentId },
    });

    // Send tournament registration confirmation email (async, non-blocking)
    sendTournamentRegistrationEmail({
      recipientEmail: user.email,
      customerName: user.name || "Participante",
      tournamentName: tournament.tournamentName,
      ticketCost: tournament.ticketCost,
      startDate: new Date(tournament.startDate).toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      endDate: new Date(tournament.endDate).toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      totalParticipants: participantCount,
      totalPool,
    }).catch((err) => console.error("Failed to send registration email:", err));

    return NextResponse.json({
      success: true,
      message: "Registrado exitosamente en el torneo",
      participant: {
        _id: participant._id,
        tournamentId,
        status: participant.status,
        registrationDate: participant.registrationDate,
      },
    });
  } catch (error) {
    console.error("Error registering for tournament:", error);
    return NextResponse.json(
      { error: "Error al registrarse en el torneo" },
      { status: 500 },
    );
  }
}
