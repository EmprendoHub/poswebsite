export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import Tournament from "@/backend/models/Tournament";
import TournamentParticipant from "@/backend/models/TournamentParticipant";
import CustomerCredit from "@/backend/models/CustomerCredit";
import User from "@/backend/models/User";
import { sendTournamentWinnerEmail } from "@/lib/tournamentEmailService";
import TournamentBadge from "@/backend/models/TournamentBadge";

/**
 * POST /api/supervisor/tournaments/:id/assign-winner
 * Assign winner and award tournament credit
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

    // Check supervisor role
    const user = await User.findById(session.user._id);
    if (user?.role !== "organizador") {
      return NextResponse.json(
        { error: "Se requiere rol de supervisor" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { winnerId, badgeIds } = body;

    if (!winnerId) {
      return NextResponse.json(
        { error: "ID del ganador requerido" },
        { status: 400 },
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

    // Check if already has a winner
    if (tournament.winnerId) {
      return NextResponse.json(
        { error: "Este torneo ya tiene un ganador asignado" },
        { status: 400 },
      );
    }

    // Verify winner is a participant
    const winner = await TournamentParticipant.findOne({
      tournamentId,
      userId: winnerId,
    });

    if (!winner) {
      return NextResponse.json(
        { error: "El ganador debe ser un participante del torneo" },
        { status: 400 },
      );
    }

    // Get winner user info
    const winnerUser = await User.findById(winnerId);
    if (!winnerUser) {
      return NextResponse.json(
        { error: "Usuario ganador no encontrado" },
        { status: 404 },
      );
    }

    // Calculate credit amount (100% of total pool)
    const creditAmount = tournament.totalPool;

    // Update tournament with winner
    tournament.winnerId = winnerId;
    tournament.winnerName = winnerUser.name;
    tournament.winnerEmail = winnerUser.email;
    tournament.winnerCredit = creditAmount;
    if (badgeIds && badgeIds.length > 0) {
      tournament.badges = badgeIds;
    }
    await tournament.save();

    // Award credit to winner
    let creditRecord = await CustomerCredit.findOne({ userId: winnerId });

    if (!creditRecord) {
      // Create new credit record if doesn't exist
      creditRecord = new CustomerCredit({
        userId: winnerId,
        totalBalance: creditAmount,
        usedAmount: 0,
        transactions: [
          {
            type: "earned",
            amount: creditAmount,
            tournamentId,
            description: `Ganador del torneo: ${tournament.tournamentName}`,
            transactionDate: new Date(),
            expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
            status: "active",
          },
        ],
      });
    } else {
      // Add transaction to existing record
      creditRecord.totalBalance += creditAmount;
      creditRecord.transactions.push({
        type: "earned",
        amount: creditAmount,
        tournamentId,
        description: `Ganador del torneo: ${tournament.tournamentName}`,
        transactionDate: new Date(),
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
        status: "active",
      } as any);
    }

    await creditRecord.save();

    // Add badges to user if provided
    if (badgeIds && badgeIds.length > 0) {
      await User.findByIdAndUpdate(winnerId, {
        $push: {
          earnedBadges: badgeIds.map((badgeId: string) => ({
            badgeId,
            tournamentId,
            earnedAt: new Date(),
          })),
        },
      });
    }

    // Update participant status to winner
    await TournamentParticipant.findByIdAndUpdate(winner._id, {
      status: "active",
    });

    // Prepare badge names for email if any
    let badgeNames: string[] = [];
    if (badgeIds && badgeIds.length > 0) {
      const badgeRecords = await TournamentBadge.find({
        _id: { $in: badgeIds },
      });
      badgeNames = badgeRecords.map((b: any) => b.badgeName);
    }

    const expiryDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    const expiryDateFormatted = expiryDate.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Send winner announcement email (async, non-blocking)
    sendTournamentWinnerEmail({
      recipientEmail: winnerUser.email,
      customerName: winnerUser.name || "Ganador",
      tournamentName: tournament.tournamentName,
      creditAmount,
      expiryDate: expiryDateFormatted,
      badgesWon: badgeNames,
      totalParticipants: tournament.totalParticipants,
      position: "1st",
    }).catch((err) => console.error("Failed to send winner email:", err));

    return NextResponse.json({
      success: true,
      message: "Ganador asignado y crédito otorgado exitosamente",
      data: {
        tournamentId,
        winnerId,
        winnerName: winnerUser.name,
        creditAwarded: creditAmount,
        expiresAt: expiryDate,
        badgesAwarded: badgeIds || [],
      },
    });
  } catch (error) {
    console.error("Error assigning winner:", error);
    return NextResponse.json(
      { error: "Error al asignar ganador" },
      { status: 500 },
    );
  }
}
