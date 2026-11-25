"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { MdImage, MdUpload, MdDelete, MdClose, MdSave } from "react-icons/md";

interface GalleryImage {
  _id: string;
  url: string;
  caption: string;
  uploadedBy: string;
}

const TournamentGallery = ({ tournamentId }: { tournamentId: string }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if ((session?.user as any)?.role !== "organizador") {
      router.push("/no-autorizado");
      return;
    }

    const fetchImages = async () => {
      try {
        // If no tournamentId provided, show empty state
        if (!tournamentId) {
          setImages([]);
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/supervisor/tournaments/${tournamentId}/gallery`,
        );
        if (!response.ok) {
          // Handle empty response
          if (response.status === 404) {
            setImages([]);
          } else {
            throw new Error("Failed to fetch images");
          }
        } else {
          const data = await response.json();
          setImages(data.images || []);
        }
      } catch (err) {
        console.error("Error loading gallery:", err);
        setImages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [session, router, tournamentId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select an image");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("caption", caption);

      const response = await fetch(
        `/api/supervisor/tournaments/${tournamentId}/gallery`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to upload image");
      }

      setSuccess("Image uploaded successfully!");
      setShowUploadModal(false);
      setCaption("");
      setSelectedFile(null);
      setPreview("");

      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error uploading image");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("Delete this image?")) return;

    try {
      const response = await fetch(
        `/api/supervisor/tournaments/${tournamentId}/gallery?imageId=${imageId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) throw new Error("Failed to delete image");

      setSuccess("Image deleted!");
      setImages((prev) => prev.filter((img) => img._id !== imageId));
    } catch (err) {
      setError("Error deleting image");
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-lg bg-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Galería</h2>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <MdUpload size={20} /> Subir Foto
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/20 border border-red-500/50 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-500/20 border border-green-500/50 p-3 text-sm text-green-200">
          {success}
        </div>
      )}

      {/* Images Grid */}
      {images.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <motion.div
              key={image._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative overflow-hidden rounded-lg border border-white/10 bg-zinc-900"
            >
              <div className="relative h-40 w-full bg-zinc-800 overflow-hidden">
                <Image
                  src={image.url}
                  alt={image.caption}
                  fill
                  className="object-cover group-hover:scale-110 transition"
                />
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                <button
                  onClick={() => handleDelete(image._id)}
                  className="rounded-lg bg-red-500/20 p-2 text-red-400 transition hover:bg-red-500/30"
                >
                  <MdDelete size={24} />
                </button>
              </div>

              {/* Info */}
              {image.caption && (
                <div className="p-3 bg-zinc-800">
                  <p className="text-sm font-semibold text-white line-clamp-2">
                    {image.caption}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    By {image.uploadedBy}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-zinc-900 p-12 text-center">
          <MdImage size={48} className="mx-auto mb-3 text-zinc-500" />
          <p className="text-zinc-400">No existen imágenes en la galería</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-lg bg-zinc-900 border border-white/10 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Subir Foto</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <MdClose size={24} />
              </button>
            </div>

            {/* File Input */}
            <div>
              <label className="text-sm font-semibold text-zinc-400">
                Select Image *
              </label>
              <div className="mt-2 rounded-lg border-2 border-dashed border-white/20 p-6 text-center cursor-pointer hover:border-primary/50 transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input" className="cursor-pointer block">
                  <MdUpload className="mx-auto mb-2 text-zinc-400" size={32} />
                  <p className="text-sm text-zinc-400">Click to select image</p>
                </label>
              </div>
            </div>

            {/* Preview */}
            {preview && (
              <div className="relative h-40 w-full rounded-lg overflow-hidden bg-zinc-800">
                <Image
                  src={preview}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Caption */}
            <div>
              <label className="text-sm font-semibold text-zinc-400">
                Descripción (Opcional)
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-primary"
                placeholder="Describe the photo..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 rounded-lg border border-white/20 py-2 font-semibold text-white transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                <MdSave size={18} /> {uploading ? "Subiendo..." : "Subir"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TournamentGallery;
