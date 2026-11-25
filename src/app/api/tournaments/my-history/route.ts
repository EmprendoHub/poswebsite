export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import TournamentParticipant from "@/backend/models/TournamentParticipant";
import Tournament from "@/backend/models/Tournament";
import TournamentBadge from "@/backend/models/TournamentBadge";

/**
 * GET /api/tournaments/my-history?userId=xxx
 * Returns customer's tournament participation history
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?._id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || session.user._id;

    // Get all tournament participations
    const participations = await TournamentParticipant.find({
      userId,
    })
      .populate({
        path: "tournamentId",
        select: [
          "tournamentName",
          "description",
          "startDate",
          "endDate",
          "status",
          "winnerId",
          "ticketCost",
          "totalPool",
          "winnerCredit",
          "badges",
          "coverImage",
        ],
        populate: {
          path: "badges",
          model: "TournamentBadge",
        },
      })
      .sort({ registrationDate: -1 })
      .lean();

    // Format response with tournament details
    const history = participations.map((p: any) => ({
      participationId: p._id,
      tournament: p.tournamentId,
      status: p.status,
      points: p.points,
      registrationDate: p.registrationDate,
      isWinner: p.tournamentId?.winnerId?.toString() === userId,
      badgesWon: p.tournamentId?.badges || [],
    }));

    return NextResponse.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    console.error("Error fetching tournament history:", error);
    return NextResponse.json(
      { error: "Error al obtener historial de torneos" },
      { status: 500 },
    );
  }
}
