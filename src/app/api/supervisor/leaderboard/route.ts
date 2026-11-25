export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import TournamentParticipant from "@/backend/models/TournamentParticipant";
import User from "@/backend/models/User";

/**
 * GET /api/supervisor/leaderboard
 * Get tournament points leaderboard (supervisor only)
 */
export async function GET(req: Request) {
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

    // Get URL query params
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const tournamentId = searchParams.get("tournamentId");

    const skip = (page - 1) * limit;

    // Build query
    const query: any = { status: "active" };
    if (tournamentId) query.tournamentId = tournamentId;

    // Get leaderboard with user info
    const leaderboard = await TournamentParticipant.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $lookup: {
          from: "tournaments",
          localField: "tournamentId",
          foreignField: "_id",
          as: "tournament",
        },
      },
      {
        $unwind: "$tournament",
      },
      {
        $project: {
          _id: 1,
          participantId: 1,
          userId: 1,
          "user.name": 1,
          "user.email": 1,
          tournamentId: 1,
          "tournament.tournamentName": 1,
          "tournament.startDate": 1,
          "tournament.endDate": 1,
          points: 1,
          status: 1,
          isWinner: { $eq: ["$userId", "$tournament.winnerId"] },
        },
      },
      {
        $sort: { points: -1, "tournament.startDate": -1 },
      },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: "count" }],
        },
      },
    ]);

    const data = leaderboard[0]?.data || [];
    const total = leaderboard[0]?.total[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Error al obtener leaderboard" },
      { status: 500 },
    );
  }
}
