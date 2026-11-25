export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import Tournament from "@/backend/models/Tournament";
import User from "@/backend/models/User";

/**
 * POST /api/supervisor/tournaments
 * Create a new tournament (supervisor only)
 */
export async function POST(req: Request) {
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
    const {
      tournamentName,
      description,
      ticketCost,
      startDate,
      endDate,
      badges,
    } = body;

    // Validate required fields
    if (!tournamentName || !ticketCost || !startDate || !endDate) {
      return NextResponse.json(
        {
          error:
            "Campos requeridos: tournamentName, ticketCost, startDate, endDate",
        },
        { status: 400 },
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return NextResponse.json(
        {
          error:
            "La fecha de inicio debe ser anterior o igual a la fecha de fin",
        },
        { status: 400 },
      );
    }

    if (ticketCost < 0) {
      return NextResponse.json(
        { error: "El costo del ticket debe ser mayor a 0" },
        { status: 400 },
      );
    }

    // Create tournament
    const tournament = new Tournament({
      tournamentName,
      description,
      ticketCost,
      status: "upcoming",
      startDate: start,
      endDate: end,
      badges: badges || [],
      totalParticipants: 0,
      totalPool: 0,
      winnerCredit: 0,
      createdBy: session.user._id,
    });

    await tournament.save();

    return NextResponse.json({
      success: true,
      message: "Torneo creado exitosamente",
      tournament: {
        _id: tournament._id,
        tournamentName: tournament.tournamentName,
        status: tournament.status,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        ticketCost: tournament.ticketCost,
      },
    });
  } catch (error) {
    console.error("Error creating tournament:", error);
    return NextResponse.json(
      { error: "Error al crear el torneo" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/supervisor/tournaments/:id
 * Edit tournament details (supervisor only)
 */
export async function PUT(req: Request) {
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
    const { tournamentId, updateData } = body;

    if (!tournamentId) {
      return NextResponse.json(
        { error: "ID de torneo requerido" },
        { status: 400 },
      );
    }

    // Find tournament
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 },
      );
    }

    // Validate dates if provided
    if (updateData.startDate && updateData.endDate) {
      const start = new Date(updateData.startDate);
      const end = new Date(updateData.endDate);
      if (start > end) {
        return NextResponse.json(
          {
            error:
              "La fecha de inicio debe ser anterior o igual a la fecha de fin",
          },
          { status: 400 },
        );
      }
    }

    // Update allowed fields only
    const allowedFields = [
      "tournamentName",
      "description",
      "ticketCost",
      "startDate",
      "endDate",
      "status",
      "badges",
      "coverImage",
    ];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        (tournament as any)[field] = updateData[field];
      }
    });

    await tournament.save();

    return NextResponse.json({
      success: true,
      message: "Torneo actualizado exitosamente",
      tournament,
    });
  } catch (error) {
    console.error("Error updating tournament:", error);
    return NextResponse.json(
      { error: "Error al actualizar el torneo" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/supervisor/tournaments
 * Get all tournaments (organizador only)
 */
export async function GET(req: Request) {
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

    // Get all tournaments for this organizador
    const tournaments = await Tournament.find({
      createdBy: session.user._id,
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      tournaments: tournaments,
    });
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return NextResponse.json(
      { error: "Error al obtener los torneos" },
      { status: 500 },
    );
  }
}
