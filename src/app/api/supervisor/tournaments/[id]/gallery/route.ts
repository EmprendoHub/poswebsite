export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import TournamentGallery from "@/backend/models/TournamentGallery";
import Tournament from "@/backend/models/Tournament";
import User from "@/backend/models/User";
import { mc } from "@/lib/minio";
import sharp from "sharp";

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

    const { id: tournamentId } = await context.params;

    // Verify tournament exists
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 },
      );
    }

    // Parse FormData instead of JSON
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const caption = (formData.get("caption") as string) || "";
    const featured = (formData.get("featured") as string) === "true" || false;

    if (!file) {
      return NextResponse.json(
        { error: "Archivo de imagen requerido" },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Optimize image with sharp
    const optimizedBuffer = await sharp(buffer)
      .resize(1200, 800, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 80 })
      .toBuffer();

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `tournaments/${tournamentId}/gallery-${timestamp}-${randomStr}.webp`;

    // Upload to MinIO
    await mc.putObject(
      "emprendomex",
      filename,
      optimizedBuffer,
      optimizedBuffer.length,
      {
        "Content-Type": "image/webp",
      },
    );

    // Generate public URL
    const imageUrl = `https://minio.salvawebpro.com:9000/emprendomex/${filename}`;

    // Create gallery image entry
    const galleryImage = new TournamentGallery({
      tournamentId,
      imageUrl,
      caption,
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

    // Transform imageUrl to url for client compatibility
    const transformedGallery = gallery.map((img: any) => ({
      ...img,
      url: img.imageUrl,
    }));

    return NextResponse.json({
      success: true,
      images: transformedGallery,
      count: transformedGallery.length,
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

    // Extract imageId from query parameters
    const url = new URL(req.url);
    const imageId = url.searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json(
        { error: "ID de imagen requerido" },
        { status: 400 },
      );
    }

    // Find and delete the gallery image
    const deletedImage = await TournamentGallery.findByIdAndDelete(imageId);

    if (!deletedImage) {
      return NextResponse.json(
        { error: "Imagen no encontrada" },
        { status: 404 },
      );
    }

    // Delete from MinIO if it was stored there
    if (deletedImage.imageUrl?.includes("minio")) {
      try {
        const urlObj = new URL(deletedImage.imageUrl);
        const objectName = urlObj.pathname.substring(1); // Remove leading slash
        await mc.removeObject("emprendomex", objectName);
      } catch (minioError) {
        console.warn("Warning: Could not delete file from MinIO:", minioError);
      }
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
