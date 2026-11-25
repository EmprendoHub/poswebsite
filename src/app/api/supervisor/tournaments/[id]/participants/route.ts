export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import TournamentParticipant from "@/backend/models/TournamentParticipant";
import Tournament from "@/backend/models/Tournament";
import User from "@/backend/models/User";

/**
 * GET /api/supervisor/tournaments/:id/participants
 * Get all participants for a tournament with their stats
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?._id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    // Check organizador role
    const user = await User.findById(session.user._id);
    if (user?.role !== "organizador") {
      return NextResponse.json(
        { error: "Se requiere rol de organizador" },
        { status: 403 },
      );
    }

    const { id: tournamentId } = await context.params;

    // Verify tournament exists
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 },
      );
    }

    // Get all participants
    const participants = await TournamentParticipant.find({
      tournamentId,
    })
      .populate("userId", ["name", "email", "avatar"])
      .sort({ registrationDate: -1 })
      .lean();

    // Add winner badge if applicable
    const participantsWithWinner = participants.map((p: any) => ({
      ...p,
      isWinner: tournament.winnerId?.toString() === p.userId?._id?.toString(),
    }));

    return NextResponse.json({
      success: true,
      data: participantsWithWinner,
      count: participantsWithWinner.length,
      tournament: {
        name: tournament.tournamentName,
        status: tournament.status,
        winnerId: tournament.winnerId,
        winnerName: tournament.winnerName,
      },
    });
  } catch (error) {
    console.error("Error fetching tournament participants:", error);
    return NextResponse.json(
      { error: "Error al obtener participantes del torneo" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/supervisor/tournaments/:id/activate-participant
 * Manually activate a participant (send confirmation email)
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?._id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    // Check organizador role
    const user = await User.findById(session.user._id);
    if (user?.role !== "organizador") {
      return NextResponse.json(
        { error: "Se requiere rol de organizador" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { participantId } = body;

    if (!participantId) {
      return NextResponse.json(
        { error: "ID de participante requerido" },
        { status: 400 },
      );
    }

    // Get participant
    const participant = await TournamentParticipant.findByIdAndUpdate(
      participantId,
      {
        status: "active",
        confirmationEmailSent: true,
        confirmationEmailSentAt: new Date(),
      },
      { new: true },
    );

    if (!participant) {
      return NextResponse.json(
        { error: "Participante no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Participante activado exitosamente",
      participant: {
        _id: participant._id,
        email: participant.email,
        status: participant.status,
        confirmationEmailSent: participant.confirmationEmailSent,
      },
    });
  } catch (error) {
    console.error("Error activating participant:", error);
    return NextResponse.json(
      { error: "Error al activar participante" },
      { status: 500 },
    );
  }
}
