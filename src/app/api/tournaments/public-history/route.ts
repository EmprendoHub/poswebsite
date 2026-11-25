export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Tournament from "@/backend/models/Tournament";
import TournamentParticipant from "@/backend/models/TournamentParticipant";
import TournamentGallery from "@/backend/models/TournamentGallery";
import User from "@/backend/models/User";

/**
 * GET /api/tournaments/public-history?page=1&limit=10&status=completed
 * Returns public tournament history with galleries and participant stats
 * This is accessible to all website visitors
 */
export async function GET(req: Request) {
  try {
    await dbConnect();

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const status = url.searchParams.get("status") || "completed";
    const skip = (page - 1) * limit;

    // Get completed tournaments with winner info
    const tournaments = await Tournament.find({ status })
      .select([
        "tournamentName",
        "description",
        "startDate",
        "endDate",
        "status",
        "winnerId",
        "winnerName",
        "totalParticipants",
        "totalPool",
        "ticketCost",
        "badges",
        "coverImage",
        "createdAt",
      ])
      .sort({ endDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get gallery images for each tournament
    const tournamentsWithGallery = await Promise.all(
      tournaments.map(async (tournament: any) => {
        const gallery = await TournamentGallery.find({
          tournamentId: tournament._id,
        })
          .select(["imageUrl", "caption", "featured"])
          .sort({ featured: -1, uploadedAt: -1 })
          .limit(6)
          .lean();

        return {
          ...tournament,
          gallery,
        };
      }),
    );

    // Get total count
    const total = await Tournament.countDocuments({ status });

    return NextResponse.json({
      success: true,
      data: tournamentsWithGallery,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching public tournament history:", error);
    return NextResponse.json(
      { error: "Error al obtener historial de torneos" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/tournaments/public-history/leaderboard
 * Returns all-time points leaderboard (public)
 * NOTE: This is currently disabled as it conflicts with the main GET handler
 * To enable, move to a separate route: /api/tournaments/leaderboard/route.ts
 */
/*
export async function GET_Leaderboard(req: Request) {
  try {
    await dbConnect();

    const url = new URL(req.url);
    const timeframe = url.searchParams.get("timeframe") || "all"; // all, year, month

    let matchStage: any = {};

    if (timeframe === "year") {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      matchStage = { endDate: { $gte: oneYearAgo } };
    } else if (timeframe === "month") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      matchStage = { endDate: { $gte: oneMonthAgo } };
    }

    // Get leaderboard by aggregating participant points
    const leaderboard = await TournamentParticipant.aggregate([
      {
        $lookup: {
          from: "tournaments",
          localField: "tournamentId",
          foreignField: "_id",
          as: "tournament",
        },
      },
      { $match: matchStage },
      {
        $group: {
          _id: "$userId",
          totalPoints: { $sum: "$points" },
          participations: { $sum: 1 },
          email: { $first: "$email" },
          name: { $first: "$name" },
        },
      },
      { $sort: { totalPoints: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      timeframe,
      data: leaderboard,
      count: leaderboard.length,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Error al obtener tabla de clasificación" },
      { status: 500 },
    );
  }
}
*/
