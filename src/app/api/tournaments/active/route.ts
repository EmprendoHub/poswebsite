export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Tournament from "@/backend/models/Tournament";

/**
 * GET /api/tournaments/active
 * Returns list of active tournaments that users can register for
 */
export async function GET() {
  try {
    await dbConnect();

    // Get all active and upcoming tournaments
    const tournaments = await Tournament.find({
      status: { $in: ["upcoming", "active"] },
    })
      .sort({ startDate: 1 })
      .select([
        "tournamentName",
        "description",
        "ticketCost",
        "status",
        "startDate",
        "endDate",
        "totalParticipants",
        "totalPool",
        "coverImage",
        "_id",
      ])
      .lean();

    return NextResponse.json({
      success: true,
      data: tournaments,
      count: tournaments.length,
    });
  } catch (error) {
    console.error("Error fetching active tournaments:", error);
    return NextResponse.json(
      { error: "Error al obtener torneos activos" },
      { status: 500 },
    );
  }
}
