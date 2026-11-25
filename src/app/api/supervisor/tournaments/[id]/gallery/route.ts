export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import TournamentGallery from "@/backend/models/TournamentGallery";
import Tournament from "@/backend/models/Tournament";
import User from "@/backend/models/User";

/**
 * POST /api/supervisor/tournaments/:id/upload-gallery
 * Upload tournament photos/gallery images
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
    const { imageUrl, caption, featured } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "URL de imagen requerida" },
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

    // Create gallery image entry
    const galleryImage = new TournamentGallery({
      tournamentId,
      imageUrl,
      caption: caption || "",
      uploadedBy: session.user._id,
      uploadedAt: new Date(),
      featured: featured || false,
    });

    await galleryImage.save();

    // Update tournament cover image if featured
    if (featured) {
      await Tournament.findByIdAndUpdate(tournamentId, {
        coverImage: imageUrl,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Imagen subida exitosamente",
      image: {
        _id: galleryImage._id,
        imageUrl,
        caption,
        featured,
        uploadedAt: galleryImage.uploadedAt,
      },
    });
  } catch (error) {
    console.error("Error uploading gallery image:", error);
    return NextResponse.json(
      { error: "Error al subir imagen a la galería" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/supervisor/tournaments/:id/upload-gallery
 * Get gallery images for a tournament
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

    // Get gallery images
    const gallery = await TournamentGallery.find({ tournamentId })
      .sort({ featured: -1, uploadedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: gallery,
      count: gallery.length,
    });
  } catch (error) {
    console.error("Error fetching gallery:", error);
    return NextResponse.json(
      { error: "Error al obtener galería" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/supervisor/tournaments/:id/upload-gallery
 * Delete a gallery image
 */
export async function DELETE(
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
    const { imageId } = body;

    if (!imageId) {
      return NextResponse.json(
        { error: "ID de imagen requerido" },
        { status: 400 },
      );
    }

    const deleted = await TournamentGallery.findByIdAndDelete(imageId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Imagen no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Imagen eliminada exitosamente",
    });
  } catch (error) {
    console.error("Error deleting gallery image:", error);
    return NextResponse.json(
      { error: "Error al eliminar imagen" },
      { status: 500 },
    );
  }
}
