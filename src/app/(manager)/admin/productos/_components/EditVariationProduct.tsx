"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { cstDateTimeClient } from "@/backend/helpers";
import { updateRevalidateProduct } from "@/app/_actions";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  set_colors,
  sizes_prendas,
  sizes_shoes_men,
  cat_tarjetas,
  product_categories,
  genders,
  cat_articulos,
  cat_misc,
} from "@/backend/data/productData";
import ToggleSwitch from "@/components/layouts/ToggleSwitch";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import { toast } from "@/components/ui/use-toast";
import { Loader } from "@/components/loader";
import BarcodeScannerModal from "@/components/modals/BarcodeScannerModal";
import { MdQrCodeScanner } from "react-icons/md";
import { ValidationError } from "@/types";

// =====================================================
// REMOTE IMAGE API CONFIGURATION
// =====================================================
const REMOTE_API_BASE = "https://api.salvawebpro.com";
const REMOTE_API_KEY =
  "B5VvOGo4cnNldjJjMzZucmJmc32YyaThxM2h0MzRhZmpzZGpmYXNkamZhc2RmYWpmc4RmamFzZGpmYXNkZmFzZGY=";
const REMOTE_PROCESS_URL = `${REMOTE_API_BASE}/api/process-image`;
const REMOTE_DELETE_URL = (filename: string) =>
  `${REMOTE_API_BASE}/api/image/${filename}`;

// Modify the extractImageName function to handle potential errors
function extractImageName(url: string | undefined): string {
  if (!url || typeof url !== "string") {
    console.error("Invalid URL provided to extractImageName:", url);
    return "unknown_image";
  }
  const lastSlashIndex = url.lastIndexOf("/");
  return lastSlashIndex !== -1 ? url.substring(lastSlashIndex + 1) : url;
}

const EditVariationProduct = ({
  product,
  currentCookies,
}: {
  product: any;
  currentCookies: string;
}) => {
  const getPathname = usePathname();
  let pathname: string = "";
  if (getPathname.includes("admin")) {
    pathname = "admin";
  }

  const searchParams = useSearchParams();
  const searchValue = searchParams.get("callback");
  const [callBack, setCallBack] = useState<string>("");

  useEffect(() => {
    if (searchValue !== null) {
      setCallBack(searchValue);
    } else {
      setCallBack(""); // or any default value you prefer
    }
  }, [searchValue]);

  const router = useRouter();
  const [title, setTitle] = useState(product?.title);
  const [isSending, setIsSending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [brand, setBrand] = useState(product?.brand);
  const [grade, setGrade] = useState(product?.rating);
  const [description, setDescription] = useState(product?.description);
  const [category, setCategory] = useState(product?.category);
  const [gender, setGender] = useState(product?.gender);
  const [asin, setAsin] = useState(product?.ASIN || "");
  const [showScanner, setShowScanner] = useState(false);
  const [featured, setFeatured] = useState(product?.featured);
  const [active, setActive] = useState(product?.active ?? true);
  const [onlineAvailability, setOnlineAvailability] = useState(
    product?.availability?.online,
  );
  const [updatedAt, setUpdatedAt] = useState(
    cstDateTimeClient().toLocaleString(),
  );

  const [weight, setWeight] = useState(product?.weight || 0.5);
  const [dimensions, setDimensions] = useState(
    product?.dimensions || {
      length: 15,
      width: 15,
      height: 10,
    },
  );

  const [validationError, setValidationError] =
    useState<ValidationError | null>(null);

  const [mainImage, setMainImage] = useState(product?.images[0]?.url || "");
  const [uploadingSecondaryIndices, setUploadingSecondaryIndices] = useState<
    number[]
  >([]);

  const [variations, setVariations] = useState(product?.variations);
  const [secondaryImages, setSecondaryImages] = useState(
    product?.images?.slice(1) || [],
  );

  // Debug logging
  useEffect(() => {
    console.log("Product data:", product);
    console.log("Variations:", variations);
    console.log("Current state:", {
      title,
      description,
      mainImage,
      variations: variations?.[0],
    });
  }, [product, variations, title, description, mainImage]);

  const addVariation = () => {
    setVariations(
      (
        prevVariations: {
          price: any;
        }[],
      ) => [
        ...prevVariations,
        {
          color: "",
          colorHex: "",
          colorHexTwo: "",
          colorHexThree: "",
          price: prevVariations[0].price,
          stock: 1,
        },
      ],
    );
  };

  const removeVariation = (indexToRemove: any) => {
    setVariations((prevVariations: any[]) =>
      prevVariations.filter((_: any, index: any) => index !== indexToRemove),
    );
  };

  const handlePriceChange = (index: number, newPrice: string) => {
    const newVariations = [...variations];
    newVariations[index].price = newPrice;
    setVariations(newVariations);
  };

  const handleStockChange = (index: number, newStock: string) => {
    const newVariations = [...variations];
    newVariations[index].stock = newStock;
    setVariations(newVariations);
  };

  // Function to delete image from MinIO
  const deleteImageFromMinio = async (
    imageUrl: string,
    options?: { silent?: boolean },
  ) => {
    try {
      console.group("🗑️ DELETE IMAGE REQUEST");
      console.log("🔗 Original URL:", imageUrl);

      const response = await fetch("/api/minio/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Cookie: currentCookies,
        },
        body: JSON.stringify({ imageUrl }),
      });

      console.log("📊 Response status:", response.status, response.statusText);

      if (!response.ok) {
        const responseText = await response.text();
        console.error("❌ Response body:", responseText);
        throw new Error(
          `Failed to delete image: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();
      console.log("✅ Deletion successful:", result);
      console.groupEnd();
      return true;
    } catch (error) {
      console.error("❌ ERROR deleting image:", error);
      if (error instanceof Error) {
        console.log("📋 Error message:", error.message);
        console.log("📍 Error stack:", error.stack);
      }
      console.groupEnd();
      if (!options?.silent) {
        toast({
          title: "Error",
          description: "No se pudo eliminar la imagen",
          variant: "destructive",
        });
      }
      return false;
    }
  };

  // Remove main image
  const removeMainImage = async () => {
    if (
      mainImage &&
      mainImage !== "/images/product-placeholder-minimalist.jpg"
    ) {
      const confirmed = window.confirm(
        "¿Estás seguro de que quieres eliminar la imagen principal?",
      );
      if (confirmed) {
        const deleted = await deleteImageFromMinio(mainImage);
        if (deleted) {
          setMainImage("/images/product-placeholder-minimalist.jpg");
          // Update first variation image as well
          const newVariations = [...variations];
          if (newVariations[0]) {
            newVariations[0].image =
              "/images/product-placeholder-minimalist.jpg";
            setVariations(newVariations);
          }
        }
      }
    }
  };

  // Remove secondary image
  const removeSecondaryImage = async (index: number) => {
    const imageToDelete = secondaryImages[index];
    if (imageToDelete?.url) {
      const confirmed = window.confirm(
        "¿Estás seguro de que quieres eliminar esta imagen?",
      );
      if (confirmed) {
        const deleted = await deleteImageFromMinio(imageToDelete.url);
        if (deleted) {
          const newSecondaryImages = secondaryImages.filter(
            (_: any, i: number) => i !== index,
          );
          setSecondaryImages(newSecondaryImages);
        }
      }
    }
  };

  // Make a secondary image the main image (with swap)
  const makeImageMain = (index: number) => {
    console.group("🔄 PROMOTING SECONDARY IMAGE");
    console.log("📍 Index to promote:", index);
    console.log("📊 All secondary images:", secondaryImages);
    console.log("📊 Still uploading indices:", uploadingSecondaryIndices);
    console.log("📸 Secondary image data:", secondaryImages[index]);
    console.log("🎯 Current main image in state:", mainImage);

    // Check if this image is still uploading
    if (uploadingSecondaryIndices.includes(index)) {
      console.warn("⏳ Image is still uploading, please wait...");
      toast({
        title: "Espera",
        description:
          "La imagen aún se está subiendo. Por favor espera a que termine.",
        variant: "destructive",
      });
      console.groupEnd();
      return;
    }

    const secondaryImage = secondaryImages[index];
    if (!secondaryImage) {
      console.error("❌ No secondary image found at index", index);
      toast({
        title: "Error",
        description: "No image data found at this position",
        variant: "destructive",
      });
      console.groupEnd();
      return;
    }

    if (!secondaryImage.url) {
      console.error("❌ No URL found in secondary image:", secondaryImage);
      toast({
        title: "Error",
        description: "Image URL is missing",
        variant: "destructive",
      });
      console.groupEnd();
      return;
    }

    // Check if URL is a blob (not yet uploaded)
    if (secondaryImage.url.startsWith("blob:")) {
      console.warn("⏳ Image preview not yet uploaded to server");
      toast({
        title: "Espera",
        description: "La imagen aún se está procesando. Por favor espera.",
        variant: "destructive",
      });
      console.groupEnd();
      return;
    }

    console.log("🎯 Current main image:", mainImage);
    console.log("✅ Swapping images. New main URL:", secondaryImage.url);

    // Create new secondary images array with the swap
    const newSecondaryImages = [...secondaryImages];
    // Put current main image in the secondary position
    newSecondaryImages[index] = { url: mainImage };

    // Update state
    console.log("📝 About to update state with:");
    console.log("   - mainImage:", secondaryImage.url);
    console.log("   - secondaryImages[" + index + "]:", mainImage);
    setMainImage(secondaryImage.url);
    setSecondaryImages(newSecondaryImages);

    // Log after update for debugging (will show in next render)
    console.log("✨ Swap complete! State updated.");
    console.log("📍 New main image URL set to:", secondaryImage.url);
    console.log("📍 Secondary at index", index, "set to:", mainImage);

    // Verify the URLs are correct
    if (secondaryImage.url.includes("minio")) {
      console.log("✅ Secondary URL is an S3/MinIO URL (processed image)");
    }
    if (mainImage.includes("blob:")) {
      console.warn("⚠️ Main image being moved to secondary is a blob URL");
    }
    console.groupEnd();
  };

  // Alternative: Process image using Python API (requires Python with rembg)
  const processImagePython = async (
    file: Blob,
    removeBackground: boolean = false,
    optimizeForWeb: boolean = true,
  ): Promise<Blob> => {
    try {
      console.group("🖼️ PROCESS IMAGE REQUEST");
      console.log(
        "📁 Input file size:",
        `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      );
      console.log("📝 File type:", file.type);
      console.log("⚙️ Processing parameters:", {
        removeBackground,
        optimizeForWeb,
        width: 1080,
        height: 1080,
        quality: optimizeForWeb ? 85 : 95,
      });

      const formData = new FormData();
      formData.append("file", file, "image.jpg");
      formData.append("remove_background", removeBackground.toString());
      formData.append("crop", "true");
      formData.append("white_background", "false");
      formData.append("width", "1080");
      formData.append("height", "1080");
      formData.append("quality", optimizeForWeb ? "85" : "95");

      console.log("🎯 API endpoint:", REMOTE_PROCESS_URL);
      console.log("🔑 API Key configured:", !!REMOTE_API_KEY);
      const startTime = performance.now();
      console.log("📤 Sending POST request...");

      const response = await fetch(REMOTE_PROCESS_URL, {
        method: "POST",
        headers: {
          "x-api-key": REMOTE_API_KEY,
        },
        body: formData,
      });

      const elapsedTime = performance.now() - startTime;
      console.log(
        "📥 Response received in:",
        `${(elapsedTime / 1000).toFixed(2)}s`,
      );
      console.log("📊 Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { rawResponse: errorText };
        }
        console.error("❌ API Error Response:", errorData);
        console.warn("⚠️ Remote API processing failed - returning original");
        console.groupEnd();
        return file;
      }

      const responseData = await response.json();
      console.log("📊 Response data:", responseData);

      const imageUrl = `${REMOTE_API_BASE}${responseData.url}`;
      console.log("🔗 Processing image URL:", imageUrl);
      console.log("📥 Downloading processed image...");

      const downloadStart = performance.now();
      const blob = await fetch(imageUrl).then((r) => r.blob());
      const downloadTime = performance.now() - downloadStart;

      console.log("✅ Processing successful!");
      console.log("📊 File size reduction:", {
        before: `${(file.size / 1024).toFixed(2)}KB`,
        after: `${(blob.size / 1024).toFixed(2)}KB`,
        reduction: `${((1 - blob.size / file.size) * 100).toFixed(1)}%`,
      });
      console.log("⏱️ Download time:", `${(downloadTime / 1000).toFixed(2)}s`);
      console.log(
        "⏱️ Total processing time:",
        `${((elapsedTime + downloadTime) / 1000).toFixed(2)}s`,
      );
      console.groupEnd();

      return blob;
    } catch (error) {
      console.error("❌ ERROR during image processing:", error);
      if (error instanceof Error) {
        console.log("📋 Error message:", error.message);
        console.log("📍 Error stack:", error.stack);
      }
      console.groupEnd();
      return file;
    }
  };

  const getUploadUrlForFile = async (file: File): Promise<string> => {
    return await new Promise<string>((resolve, reject) => {
      retrieveNewURL(file, (_file, url) => {
        try {
          const parsed = JSON.parse(url);
          resolve(parsed.url);
        } catch (error) {
          console.error("❌ Error parsing MinIO response:", error);
          reject(error);
        }
      }).catch((error) => {
        console.error("❌ Error getting MinIO URL:", error);
        reject(error);
      });
    });
  };

  const processExistingImage = async ({
    imageUrl,
    onPreview,
    onSuccess,
    secondaryIndex,
  }: {
    imageUrl: string;
    onPreview: (previewUrl: string) => void;
    onSuccess: (finalUrl: string) => void;
    secondaryIndex?: number;
  }) => {
    if (
      !imageUrl ||
      imageUrl === "/images/product-placeholder-minimalist.jpg" ||
      imageUrl.startsWith("blob:")
    ) {
      toast({
        title: "No disponible",
        description: "Esta imagen todavía no se puede reprocesar.",
        variant: "destructive",
      });
      return;
    }

    const originalUrl = imageUrl;
    const isSecondary = typeof secondaryIndex === "number";

    try {
      setIsProcessing(true);

      if (isSecondary) {
        setUploadingSecondaryIndices((prev) => [...prev, secondaryIndex]);
      }

      console.group("♻️ REPROCESS EXISTING IMAGE");
      console.log("🔗 Original image URL:", originalUrl);
      console.log("📋 Is secondary:", isSecondary, "Index:", secondaryIndex);

      const originalResponse = await fetch(originalUrl);
      if (!originalResponse.ok) {
        throw new Error(
          `Failed to download original image: ${originalResponse.statusText}`,
        );
      }

      const originalBlob = await originalResponse.blob();
      console.log("✅ Original downloaded, size:", originalBlob.size);

      // Create unique filename with timestamp so we get a new URL
      const originalFileName =
        extractImageName(originalUrl).split("?")[0] || "image.png";
      const fileNameWithoutExt = originalFileName.substring(
        0,
        originalFileName.lastIndexOf("."),
      );
      const uniqueSuffix = `_processed_${Date.now()}`;
      const fileName = `${fileNameWithoutExt}${uniqueSuffix}.webp`;
      const fileType = "image/webp";
      const file = new File([originalBlob], fileName, { type: fileType });
      console.log("📄 Original file:", originalFileName);
      console.log("📄 New file with unique name:", fileName, "Type:", fileType);

      console.log("⚙️ Processing image through API...");
      const processedBlob = await processImagePython(file, true, true);
      console.log("✅ Image processed, new size:", processedBlob.size);

      const previewUrl = URL.createObjectURL(processedBlob);
      console.log("🎨 Preview blob URL created:", previewUrl);
      console.log("📤 Calling onPreview callback with blob URL...");
      onPreview(previewUrl);
      console.log("✅ onPreview callback executed");

      const uploadUrl = await getUploadUrlForFile(file);
      console.log("✅ Got MinIO URL:", uploadUrl);

      console.log("📤 Uploading processed image...");
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: processedBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }
      console.log("✅ Upload successful");

      const cleanUrl = uploadUrl.split("?")[0];
      console.log("🔗 Clean final URL:", cleanUrl);
      console.log("📤 Calling onSuccess callback with final URL...");
      onSuccess(cleanUrl);
      console.log("✅ onSuccess callback executed");

      console.log("🗑️ Deleting original image...");
      const deleted = await deleteImageFromMinio(originalUrl, { silent: true });
      if (!deleted) {
        console.warn("⚠️ Could not delete original image");
        toast({
          title: "Procesada con aviso",
          description:
            "La nueva imagen se guardó, pero no se pudo borrar la original.",
          variant: "destructive",
        });
      } else {
        console.log("✅ Original image deleted successfully");
        toast({
          title: "Imagen reprocesada",
          description: "La imagen fue reprocesada y la original eliminada.",
        });
      }

      console.log("✅ Reprocess complete. Final URL:", cleanUrl);
      console.groupEnd();
    } catch (error) {
      console.error("❌ Error reprocessing current image:", error);
      if (error instanceof Error) {
        console.error("📋 Error details:", error.message);
        console.error("📍 Stack:", error.stack);
      }
      console.groupEnd();
      toast({
        title: "Error",
        description: "No se pudo reprocesar la imagen actual.",
        variant: "destructive",
      });
    } finally {
      if (isSecondary) {
        setUploadingSecondaryIndices((prev) =>
          prev.filter((i) => i !== secondaryIndex),
        );
      }
      setIsProcessing(false);
    }
  };

  const reprocessMainImage = async () => {
    console.log("🖱️ Reprocess main image button clicked");
    console.log("📋 Current mainImage:", mainImage);
    await processExistingImage({
      imageUrl: mainImage,
      onPreview: (previewUrl) => {
        console.log("👀 Setting main image preview to blob URL:", previewUrl);
        setMainImage(previewUrl);
      },
      onSuccess: (finalUrl) => {
        console.log("🖼️ Setting main image final URL to:", finalUrl);
        setMainImage(finalUrl);
      },
    });
  };

  const reprocessSecondaryImage = async (index: number) => {
    console.log("🖱️ Reprocess secondary image button clicked, index:", index);
    const targetImage = secondaryImages[index]?.url;
    console.log("📋 Current secondary image URL:", targetImage);
    if (!targetImage) {
      toast({
        title: "Error",
        description: "No se encontró la imagen para reprocesar.",
        variant: "destructive",
      });
      return;
    }

    await processExistingImage({
      imageUrl: targetImage,
      secondaryIndex: index,
      onPreview: (previewUrl) => {
        console.log(
          "👀 Setting secondary image preview at index",
          index,
          "to blob URL:",
          previewUrl,
        );
        setSecondaryImages((prev: any[]) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], url: previewUrl };
          console.log("📝 Secondary images after preview update:", updated);
          return updated;
        });
      },
      onSuccess: (finalUrl) => {
        console.log(
          "🖼️ Setting secondary image final URL at index",
          index,
          "to:",
          finalUrl,
        );
        setSecondaryImages((prev: any[]) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], url: finalUrl };
          console.log("📝 Secondary images after final URL update:", updated);
          return updated;
        });
      },
    });
  };

  // generate a pre-signed URL for use in uploading that file:
  async function retrieveNewURL(
    file: File,
    cb: {
      (file: any, url: string): void;
      (file: any, url: any): void;
      (arg0: any, arg1: string): void;
    },
  ) {
    const endpoint = `/api/minio/`;
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Access-Control-Allow-Origin": "*",
          Name: file.name,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to get MinIO URL: ${response.statusText}`);
      }
      const url = await response.text();
      console.log("✅ Got MinIO URL:", url);
      cb(file, url);
    } catch (e) {
      console.error("❌ Error in retrieveNewURL:", e);
      throw e;
    }
  }

  // ***************** main images //
  const upload = async (e: any) => {
    let files = e?.target.files;
    let section = e?.target.id;
    if (files) {
      for (var i = 0; i < files?.length; i++) {
        var file = files[i];

        try {
          setIsProcessing(true);

          // Process image before preview (uses remote API)
          const processedBlob = await processImagePython(file, true, true);

          // Create preview URL from processed image
          const previewUrl = URL.createObjectURL(processedBlob);
          console.log("📸 Main image preview created:", previewUrl);

          if (section === "selectorMain") {
            setMainImage(previewUrl);
          }

          // Retrieve a URL from our server and then upload the processed image
          const uploadUrl = await new Promise<string>((resolve, reject) => {
            retrieveNewURL(file, (file, url) => {
              try {
                const parsed = JSON.parse(url);
                resolve(parsed.url);
              } catch (error) {
                console.error("❌ Error parsing MinIO response:", error);
                reject(error);
              }
            }).catch((error) => {
              console.error("❌ Error getting MinIO URL:", error);
              reject(error);
            });
          });

          // Upload the processed blob instead of original
          const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            body: processedBlob,
          });

          if (!uploadResponse.ok) {
            throw new Error("Upload failed: " + uploadResponse.statusText);
          }

          // Update with final S3 URL
          const cleanUrl = uploadUrl.split("?")[0];
          console.log("✅ Main image uploaded. Final URL:", cleanUrl);
          console.log("🔍 Full upload response:", {
            uploadedUrl: cleanUrl,
            status: uploadResponse.status,
          });

          if (section === "selectorMain") {
            console.log(
              "📍 Setting main image from preview URL to S3 URL:",
              cleanUrl,
            );
            setMainImage(cleanUrl);
            console.log("✨ Main image state updated to S3 URL");
          }
        } catch (error) {
          console.error("Error during upload:", error);
          toast({
            title: "Error",
            description: "Failed to process and upload image",
            variant: "destructive",
          });
          setIsProcessing(false);
        } finally {
          setIsProcessing(false);
        }
      }
    }
  };

  async function compressAndOptimizeMainImage(
    file: Blob | MediaSource,
    url: any,
    section: any,
  ) {
    const loadImage = (imageUrl: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = document.createElement("img");
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageUrl;
      });
    };

    const imageUrl = URL.createObjectURL(file);
    const img = await loadImage(imageUrl);

    // Create a canvas element
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    let width = img.width;
    let height = img.height;
    const maxDimension = 1024;

    if (width > height && width > maxDimension) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else if (height > maxDimension) {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    const quality = 0.9;
    const compressedImageData = canvas.toDataURL("image/webp", quality);

    const blobData = await fetch(compressedImageData).then((res) => res.blob());
    // Upload the compressed image
    await uploadFile(blobData, url, section);
  }

  // to upload this file to S3 at `https://minio.salvawebpro.com:9000` using the URL:
  async function uploadFile(
    blobData: Blob,
    url: any | URL | Request,
    section: string,
  ) {
    return fetch(url, {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      method: "PUT",
      body: blobData,
    })
      .then(() => {
        const newUrl = url.split("?");
        if (section === "selectorMain") {
          setMainImage(newUrl[0]);
        }
      })
      .catch((e) => {
        console.error(e);
      });
  }

  const handleMainSecondaryImagesChange = async (e: any, index: number) => {
    let files = e?.target.files;
    if (files) {
      for (var i = 0; i < files?.length; i++) {
        var file = files[i];
        try {
          setIsProcessing(true);
          // Mark this index as uploading
          setUploadingSecondaryIndices((prev) => [...prev, index]);

          // Process image before preview (uses remote API)
          const processedBlob = await processImagePython(file, true, true);

          // Create preview URL from processed image
          const previewUrl = URL.createObjectURL(processedBlob);
          console.log("📸 Secondary image preview created:", previewUrl);

          // Show preview immediately
          setSecondaryImages((prev: any[]) => {
            const updated = [...prev];
            updated[index] = { url: previewUrl };
            return updated;
          });

          // Retrieve a URL from our server and upload the processed image
          const uploadUrl = await new Promise<string>((resolve, reject) => {
            retrieveNewURL(file, (file, url) => {
              try {
                const parsed = JSON.parse(url);
                resolve(parsed.url);
              } catch (error) {
                console.error("❌ Error parsing MinIO response:", error);
                reject(error);
              }
            }).catch((error) => {
              console.error("❌ Error getting MinIO URL:", error);
              reject(error);
            });
          });

          // Upload the processed blob
          const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            body: processedBlob,
          });

          if (!uploadResponse.ok) {
            throw new Error("Upload failed: " + uploadResponse.statusText);
          }

          // Update with final URL
          const cleanUrl = uploadUrl.split("?")[0];
          console.log("✅ Secondary image uploaded. Final URL:", cleanUrl);
          console.log("🔍 Full upload response:", {
            uploadedUrl: cleanUrl,
            status: uploadResponse.status,
          });

          setSecondaryImages((prev: any[]) => {
            const updated = [...prev];
            updated[index] = { url: cleanUrl };
            console.log(
              "🔄 Updated secondary image at index",
              index,
              "with S3 URL:",
              cleanUrl,
            );
            console.log("📋 Complete secondary images array:", updated);
            return updated;
          });

          // Mark this index as done uploading
          setUploadingSecondaryIndices((prev) =>
            prev.filter((i) => i !== index),
          );
        } catch (error) {
          console.error("Error during variation image upload:", error);
          toast({
            title: "Error",
            description: "Failed to process and upload secondary image",
            variant: "destructive",
          });
          // Mark as done uploading on error
          setUploadingSecondaryIndices((prev) =>
            prev.filter((i) => i !== index),
          );
        } finally {
          setIsProcessing(false);
        }
      }
    }
  };

  async function hanldeFormSubmit(e: any) {
    e.preventDefault();

    console.log("Form submit started");
    console.log("Current state:", {
      title,
      description,
      mainImage,
      variations: variations?.[0],
      product: product?._id,
    });

    // Enhanced validation with better error handling
    if (
      !mainImage ||
      mainImage === "/images/product-placeholder-minimalist.jpg"
    ) {
      const noMainImageError = {
        mainImage: { _errors: ["Se requiere una imagen principal"] },
      };
      setValidationError(noMainImageError);
      console.log("Validation error: No main image");
      return;
    }
    if (!title || title.trim() === "") {
      const noTitleError = { title: { _errors: ["Se requiere un título"] } };
      setValidationError(noTitleError);
      console.log("Validation error: No title");
      return;
    }
    if (!description || description.trim() === "") {
      const noDescriptionError = {
        description: { _errors: ["Se requiere descripción"] },
      };
      setValidationError(noDescriptionError);
      console.log("Validation error: No description");
      return;
    }

    // Check variations array exists and has at least one item
    if (!variations || !Array.isArray(variations) || variations.length === 0) {
      const noVariationsError = {
        variations: { _errors: ["Se requiere al menos una variación"] },
      };
      setValidationError(noVariationsError);
      console.log("Validation error: No variations");
      return;
    }

    if (!variations[0]?.price || variations[0].price <= 0) {
      const noPriceError = {
        price: { _errors: ["Se requiere un precio de producto válido"] },
      };
      setValidationError(noPriceError);
      console.log("Validation error: No price");
      return;
    }

    if (!product?._id) {
      const noIdError = {
        id: { _errors: ["ID de producto no encontrado"] },
      };
      setValidationError(noIdError);
      console.log("Validation error: No product ID");
      return;
    }

    try {
      setIsSending(true);
      console.log("Starting API call...");

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("category", category || "");
      formData.append("featured", featured?.toString() || "false");
      formData.append("active", active?.toString() || "true");
      formData.append(
        "onlineAvailability",
        onlineAvailability?.toString() || "false",
      );
      formData.append("brand", brand || "");
      formData.append("grade", grade?.toString() || "0");
      formData.append("secondaryImages", JSON.stringify(secondaryImages || []));
      formData.append("gender", gender || "");
      formData.append("mainImage", mainImage);
      formData.append("variations", JSON.stringify(variations));
      formData.append("weight", weight.toString());
      formData.append("dimensions", JSON.stringify(dimensions));
      formData.append("asin", asin || "");
      formData.append("updatedAt", updatedAt);
      formData.append("_id", product._id);

      console.log("FormData prepared:", {
        title: title.trim(),
        description: description.trim(),
        mainImage,
        variations,
        _id: product._id,
      });

      const endpoint = `/api/newproduct`;
      const result = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Cookie: currentCookies,
        },
        body: formData,
      });

      console.log("API response status:", result.status);

      if (!result.ok) {
        const errorText = await result.text();
        console.error("API error response:", errorText);
        throw new Error(
          `HTTP error! status: ${result.status}, message: ${errorText}`,
        );
      }

      const responseData = await result.json();
      console.log("API response data:", responseData);

      if (responseData?.error) {
        setValidationError(responseData.error);
        console.log("Server validation error:", responseData.error);
      } else {
        setValidationError(null);
        console.log("Update successful, redirecting...");

        // Show success message
        toast({
          title: "Éxito",
          description: "Producto actualizado correctamente",
        });

        await updateRevalidateProduct();
        router.push(`/${pathname}/productos?&page=${callBack}`);
      }
    } catch (error) {
      console.error("Error during form submission:", error);
      setValidationError({
        general: {
          _errors: [
            `Error al actualizar el producto: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ],
        },
      });

      toast({
        title: "Error",
        description:
          "Hubo un problema al actualizar el producto. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }

  // Early return if product is not loaded
  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loader"></span>
        <p>Cargando producto...</p>
      </div>
    );
  }

  return (
    <main className="w-full min-h-screen bg-gradient-to-b from-background to-muted/5">
      {!isSending ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header with Status */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground font-EB_Garamond">
                  Editar Producto
                </h1>
                <p className="text-muted-foreground mt-2">
                  Última actualización: {updatedAt}
                </p>
              </div>
              {/* Status Toggles */}
              <div className="flex flex-wrap gap-4 items-center">
                <ToggleSwitch
                  label="Destacado"
                  enabled={featured}
                  setEnabled={setFeatured}
                />
                <ToggleSwitch
                  label="Activo"
                  enabled={active}
                  setEnabled={setActive}
                />
                <ToggleSwitch
                  label="En Línea"
                  enabled={onlineAvailability}
                  setEnabled={setOnlineAvailability}
                />
              </div>
            </div>
          </div>

          {/* Display general errors */}
          {validationError?.general && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg">
              {validationError.general._errors.join(", ")}
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
            {/* Left: Image Gallery */}
            <div className="lg:col-span-2">
              <Loader loading={isProcessing}>{""}</Loader>

              {/* Main Image Display */}
              <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-border overflow-hidden mb-6">
                <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden group">
                  {/* Reprocess Button */}
                  {mainImage &&
                    mainImage !==
                      "/images/product-placeholder-minimalist.jpg" && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          reprocessMainImage();
                        }}
                        className="absolute top-4 left-4 z-20 bg-amber-500/90 hover:bg-amber-500 text-white rounded-full w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg disabled:opacity-60"
                        type="button"
                        title="Reprocesar imagen actual"
                        disabled={isProcessing}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h5M20 20v-5h-5M5.64 18.36A9 9 0 103.51 9M18.36 5.64A9 9 0 0120.49 15"
                          />
                        </svg>
                      </button>
                    )}

                  {/* Remove Button */}
                  {mainImage &&
                    mainImage !==
                      "/images/product-placeholder-minimalist.jpg" && (
                      <button
                        onClick={removeMainImage}
                        className="absolute top-4 right-4 z-20 bg-destructive/90 hover:bg-destructive text-white rounded-full w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        type="button"
                        title="Eliminar imagen"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}

                  <label
                    htmlFor="selectorMain"
                    className={`w-full h-full flex flex-col items-center justify-center cursor-pointer relative ${
                      isProcessing ? "cursor-not-allowed opacity-50" : ""
                    }`}
                  >
                    <Image
                      id="blogImage"
                      alt="Imagen principal del producto"
                      src={
                        mainImage ||
                        "/images/product-placeholder-minimalist.jpg"
                      }
                      width={600}
                      height={600}
                      className="w-full h-full object-cover"
                      key={`main-img-${mainImage}`}
                      onError={(e) => {
                        console.error(
                          "❌ Error loading main image:",
                          mainImage,
                        );
                      }}
                      onLoad={() => {
                        console.log("✅ Main image loaded:", mainImage);
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-center">
                        <svg
                          className="w-12 h-12 mx-auto mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        <p className="text-sm font-semibold">Cambiar imagen</p>
                      </div>
                    </div>

                    <input
                      id="selectorMain"
                      type="file"
                      accept=".png, .jpg, .jpeg, .webp"
                      hidden
                      onChange={upload}
                      disabled={isProcessing}
                    />

                    {validationError?.mainImage && (
                      <p className="text-sm text-destructive mt-2">
                        {validationError.mainImage._errors.join(", ")}
                      </p>
                    )}
                  </label>
                </div>
              </div>

              {/* Secondary Images Gallery */}
              <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-border p-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Galería de Imágenes
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {secondaryImages?.map((image: any, index: number) => (
                    <div
                      key={`${image.url}-${index}`}
                      className="relative aspect-square bg-muted rounded-lg overflow-hidden group"
                    >
                      {/* Reprocess Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reprocessSecondaryImage(index);
                        }}
                        className="absolute top-1 left-1 z-10 bg-amber-500/90 hover:bg-amber-500 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md disabled:opacity-60"
                        type="button"
                        title="Reprocesar esta imagen"
                        disabled={isProcessing}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h5M20 20v-5h-5M5.64 18.36A9 9 0 103.51 9M18.36 5.64A9 9 0 0120.49 15"
                          />
                        </svg>
                      </button>

                      {/* Remove Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSecondaryImage(index);
                        }}
                        className="absolute top-1 right-1 z-10 bg-destructive/90 hover:bg-destructive text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        type="button"
                        title="Eliminar imagen"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>

                      {/* Change/Upload Button */}
                      <label
                        htmlFor={`selectorSecondary${index}`}
                        className="absolute bottom-1 right-1 z-10 bg-primary/90 hover:bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer"
                        title="Cambiar esta imagen"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </label>

                      {/* Clickable Image Area - Makes it main */}
                      <div
                        onClick={() => makeImageMain(index)}
                        className="w-full h-full cursor-pointer relative block overflow-hidden"
                      >
                        <Image
                          src={image.url}
                          width={200}
                          height={200}
                          alt={`Imagen ${index + 1}`}
                          className="w-full h-full object-cover"
                          key={`img-${index}-${image.url}`}
                          onError={(e) => {
                            console.error(
                              `❌ Error loading secondary image at index ${index}:`,
                              image.url,
                            );
                          }}
                          onLoad={() => {
                            console.log(
                              `✅ Secondary image loaded at index ${index}:`,
                              image.url,
                            );
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex flex-col items-center justify-center gap-1">
                          <svg
                            className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <p className="text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            Principal
                          </p>
                        </div>
                      </div>

                      {/* Hidden File Input */}
                      <input
                        id={`selectorSecondary${index}`}
                        type="file"
                        accept=".png, .jpg, .jpeg, .webp"
                        hidden
                        onChange={(e) =>
                          handleMainSecondaryImagesChange(e, index)
                        }
                        disabled={isProcessing}
                      />
                    </div>
                  ))}

                  {/* Add More Images Button */}
                  <label className="relative aspect-square bg-muted rounded-lg overflow-hidden group border-2 border-dashed border-border hover:border-primary cursor-pointer flex items-center justify-center">
                    <div className="text-center">
                      <svg
                        className="w-8 h-8 text-muted-foreground group-hover:text-primary mx-auto mb-1 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        Agregar
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".png, .jpg, .jpeg, .webp"
                      hidden
                      multiple
                      onChange={(e) =>
                        handleMainSecondaryImagesChange(
                          e,
                          secondaryImages.length,
                        )
                      }
                      disabled={isProcessing}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Right: Product Info Form */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
                <div className="mb-1">
                  <label className="block mb-2 font-semibold text-foreground">
                    Título del Producto
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Nombre del producto"
                    value={title || ""}
                    onChange={(e) => setTitle(e.target.value)}
                    name="title"
                  />
                  {validationError?.title && (
                    <p className="text-xs text-destructive mt-1">
                      {validationError.title._errors.join(", ")}
                    </p>
                  )}
                </div>

                <div className="mb-1">
                  <label className="block mb-2 font-semibold text-foreground">
                    Descripción Corta
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Descripción del producto"
                    value={description || ""}
                    onChange={(e) => setDescription(e.target.value)}
                    name="description"
                  />
                  {validationError?.description && (
                    <p className="text-xs text-destructive mt-1">
                      {validationError.description._errors.join(", ")}
                    </p>
                  )}
                </div>

                {/* Certificador & Grado */}
                <div className="border-t border-border pt-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">
                    Detalles de Certificación
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-2 text-xs font-medium text-muted-foreground">
                        Certificador
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                        placeholder="PSA, BGS, etc."
                        value={brand || ""}
                        onChange={(e) => setBrand(e.target.value)}
                        name="brand"
                      />
                      {validationError?.brand && (
                        <p className="text-xs text-destructive mt-1">
                          {validationError.brand._errors.join(", ")}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block mb-2 text-xs font-medium text-muted-foreground">
                        Grado
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                        placeholder="9.5"
                        value={grade || ""}
                        onChange={(e) => setGrade(e.target.value)}
                        name="grade"
                      />
                      {validationError?.grade && (
                        <p className="text-xs text-destructive mt-1">
                          {validationError.grade._errors.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="border-t border-border pt-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">
                    Precio
                  </h3>
                  <div>
                    <label className="block mb-2 text-xs font-medium text-muted-foreground">
                      Precio de Venta
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <input
                        type="number"
                        className="w-full pl-7 pr-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={variations?.[0]?.price || ""}
                        onChange={(e) => handlePriceChange(0, e.target.value)}
                        name="price"
                      />
                    </div>
                    {validationError?.price && (
                      <p className="text-xs text-destructive mt-1">
                        {validationError.price._errors.join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Categorización */}
                <div className="border-t border-border pt-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">
                    Categorización
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block mb-2 text-xs font-medium text-muted-foreground">
                        Género/Tema
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                        placeholder="Pokémon, NFL, etc."
                        value={gender || ""}
                        onChange={(e) => setGender(e.target.value)}
                        name="gender"
                      />
                      {validationError?.gender && (
                        <p className="text-xs text-destructive mt-1">
                          {validationError.gender._errors.join(", ")}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block mb-2 text-xs font-medium text-muted-foreground">
                        Categoría
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                        placeholder="Tarjetas, Guantes, etc."
                        value={category || ""}
                        onChange={(e) => setCategory(e.target.value)}
                        name="category"
                      />
                      {validationError?.category && (
                        <p className="text-xs text-destructive mt-1">
                          {validationError.category._errors.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Código de Barras */}
                <div className="border-t border-border pt-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">
                    Identificación
                  </h3>
                  <label className="block mb-2 text-xs font-medium text-muted-foreground">
                    Código de Barras/QR
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all uppercase text-sm"
                      placeholder="B08N5WRWNW"
                      value={asin}
                      onChange={(e) => setAsin(e.target.value.toUpperCase())}
                      name="asin"
                    />
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
                      title="Escanear código"
                    >
                      <MdQrCodeScanner size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Information */}
            <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Información de Envío
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Estos valores se usan para calcular los costos de envío
                automáticamente
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-foreground">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="0.5"
                    min="0.01"
                    value={weight}
                    onChange={(e) =>
                      setWeight(parseFloat(e.target.value) || 0.5)
                    }
                    name="weight"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-foreground">
                    Largo (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="15"
                    min="0.1"
                    value={dimensions.length}
                    onChange={(e) =>
                      setDimensions({
                        ...dimensions,
                        length: parseFloat(e.target.value) || 15,
                      })
                    }
                    name="length"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-foreground">
                    Ancho (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="15"
                    min="0.1"
                    value={dimensions.width}
                    onChange={(e) =>
                      setDimensions({
                        ...dimensions,
                        width: parseFloat(e.target.value) || 15,
                      })
                    }
                    name="width"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-foreground">
                    Alto (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="10"
                    min="0.1"
                    value={dimensions.height}
                    onChange={(e) =>
                      setDimensions({
                        ...dimensions,
                        height: parseFloat(e.target.value) || 10,
                      })
                    }
                    name="height"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Valores por defecto: 0.5 kg, 15×15×10 cm
              </p>
            </div>

            {/* Additional Variations */}
            {variations?.slice(1).length > 0 && (
              <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Variaciones Adicionales
                </h3>
                <div className="space-y-3">
                  {variations
                    ?.slice(1)
                    ?.map((variation: any, index: number) => (
                      <div
                        key={index + 1}
                        className="flex items-end gap-3 pb-3 border-b border-border last:border-b-0"
                      >
                        <div className="flex-1">
                          <label className="block mb-2 text-xs font-medium text-muted-foreground">
                            Precio - Variación {index + 2}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variation.price || ""}
                            name={`price-${index + 1}`}
                            onChange={(e) =>
                              handlePriceChange(index + 1, e.target.value)
                            }
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVariation(index + 1)}
                          className="flex-shrink-0 px-3 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors text-sm font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <button
                disabled={isSending || isProcessing}
                onClick={hanldeFormSubmit}
                className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground rounded-lg font-semibold transition-all disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                {isSending ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-primary-foreground border-r-transparent rounded-full animate-spin"></span>
                    Actualizando...
                  </div>
                ) : (
                  "Actualizar Producto"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <section className="w-full min-h-screen">
          <div className="flex flex-col items-center justify-center min-h-screen w-full">
            <span className="loader"></span>
            <h2 className="text-sm">Actualizando producto...</h2>
          </div>
        </section>
      )}

      {showScanner && (
        <BarcodeScannerModal
          onScan={(value) => {
            setAsin(value.toUpperCase());
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </main>
  );
};

export default EditVariationProduct;
