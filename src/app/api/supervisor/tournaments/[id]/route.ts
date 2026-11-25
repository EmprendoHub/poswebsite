export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import Tournament from "@/backend/models/Tournament";
import User from "@/backend/models/User";

/**
 * GET /api/supervisor/tournaments/:id
 * Get a specific tournament by ID (organizador only)
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

    // Fetch tournament
    const tournament = await Tournament.findById(tournamentId).lean();

    if (!tournament) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        tournament,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching tournament:", error);
    return NextResponse.json(
      { error: "Error al obtener torneo" },
      { status: 500 },
    );
  }
}
