"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { cstDateTimeClient } from "@/backend/helpers";
import { updateRevalidateProduct } from "@/app/_actions";
import { usePathname, useRouter } from "next/navigation";
import ToggleSwitch from "@/components/layouts/ToggleSwitch";
import { toast } from "@/components/ui/use-toast";
import { ValidationError } from "@/types";
import { Loader } from "@/components/loader";
import BarcodeScannerModal from "@/components/modals/BarcodeScannerModal";
import PriceCheckerModal from "@/components/modals/PriceCheckerModal";
import ASINConflictModal from "@/components/modals/ASINConflictModal";
import { MdQrCodeScanner } from "react-icons/md";
import { log } from "console";

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

const NewVariationOptimized = ({
  currentCookies,
}: {
  currentCookies: string;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [title, setTitle] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [brand, setBrand] = useState("");
  const [grade, setGrade] = useState(0);
  const [onlineAvailability, setOnlineAvailability] = useState(false);
  const [active, setActive] = useState(true);
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState(0.5);
  const [dimensions, setDimensions] = useState({
    length: 9,
    width: 1,
    height: 14,
  });
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [asin, setAsin] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [updatePrice, setUpdatePrice] = useState(false);
  const [removeBackground, setRemoveBackground] = useState(true);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [showPriceCheckerModal, setShowPriceCheckerModal] = useState(false);
  const [showASINConflictModal, setShowASINConflictModal] = useState(false);
  const [conflictingProduct, setConflictingProduct] = useState<any>(null);
  const [createdAt, setCreatedAt] = useState(
    cstDateTimeClient().toLocaleString(),
  );
  const [validationError, setValidationError] =
    useState<ValidationError | null>(null);
  const [mainImage, setMainImage] = useState(
    "/images/product-placeholder-minimalist.jpg",
  );
  const [secondaryImages, setSecondaryImages] = useState<{ url: string }[]>([]);
  const [uploadingSecondaryIndices, setUploadingSecondaryIndices] = useState<
    number[]
  >([]);

  // Inventory section
  const [stores, setStores] = useState<{ _id: string; name: string }[]>([]);
  const [inventoryStoreId, setInventoryStoreId] = useState("");
  const [initialCost, setInitialCost] = useState<number | "">("");
  const [initialStock, setInitialStock] = useState<number | "">("");

  // Product Details (Brands, Genders, Categories) — legacy, kept for backward compatibility
  const [brands, setBrands] = useState<{ _id: string; catTitle: string }[]>([]);
  const [genders, setGenders] = useState<{ _id: string; catTitle: string }[]>(
    [],
  );
  const [categories, setCategories] = useState<
    { _id: string; catTitle: string }[]
  >([]);

  // New taxonomy (Main Category / Subcategory / Attributes)
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [attributeIds, setAttributeIds] = useState<string[]>([]);
  const [mainCategories, setMainCategories] = useState<
    { _id: string; name: string }[]
  >([]);
  const [subCategories, setSubCategories] = useState<
    { _id: string; name: string; parent: string }[]
  >([]);
  const [attributeOptions, setAttributeOptions] = useState<
    { _id: string; name: string }[]
  >([]);

  useEffect(() => {
    // Fetch stores
    fetch("/api/stores")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStores(data);
      })
      .catch(() => {});

    // Fetch ProductDetails for brands, genders, categories
    Promise.all([
      fetch("/api/product-details?catType=brand").then((r) => r.json()),
      fetch("/api/product-details?catType=gender").then((r) => r.json()),
      fetch("/api/product-details?catType=category").then((r) => r.json()),
    ])
      .then(([brandsData, gendersData, categoriesData]) => {
        if (brandsData?.details && Array.isArray(brandsData.details))
          setBrands(brandsData.details);
        if (gendersData?.details && Array.isArray(gendersData.details))
          setGenders(gendersData.details);
        if (categoriesData?.details && Array.isArray(categoriesData.details))
          setCategories(categoriesData.details);
      })
      .catch(() => {});

    // Fetch new taxonomy (Main Category / Subcategory / Attributes)
    Promise.all([
      fetch("/api/categories?kind=main").then((r) => r.json()),
      fetch("/api/categories?kind=sub").then((r) => r.json()),
      fetch("/api/categories?kind=attribute").then((r) => r.json()),
    ])
      .then(([mainData, subData, attrData]) => {
        setMainCategories(mainData?.categories ?? []);
        setSubCategories(subData?.categories ?? []);
        setAttributeOptions(attrData?.categories ?? []);
      })
      .catch(() => {});
  }, []);

  const [variations, setVariations] = useState([
    { color: "", colorHex: "", colorHexTwo: "", colorHexThree: "", price: 0 },
  ]);

  const addVariation = () => {
    setVariations((prev) => [
      ...prev,
      {
        color: "",
        colorHex: "",
        colorHexTwo: "",
        colorHexThree: "",
        price: prev[0].price,
      },
    ]);
  };

  const removeVariation = (indexToRemove: number) => {
    setVariations((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handlePriceChange = (index: number, newPrice: string | number) => {
    const newVariations: any = [...variations];
    newVariations[index].price = newPrice;
    setVariations(newVariations);
  };

  const handlePriceSelected = (selectedPrice: number) => {
    // Update the price in variations
    handlePriceChange(0, selectedPrice);

    // Close the modal
    setShowPriceCheckerModal(false);

    toast({
      title: "Precio seleccionado",
      description: `El precio se ha actualizado a $${selectedPrice.toFixed(2)}`,
    });
  };

  const handleCardDetailsUpdate = (cardName: string) => {
    // Update the product title
    setTitle(cardName);

    toast({
      title: "Título actualizado",
      description: `El título del producto se ha actualizado a: ${cardName}`,
    });
  };

  // Function to delete image from MinIO
  const deleteImageFromMinio = async (imageUrl: string) => {
    try {
      const response = await fetch("/api/minio/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Cookie: currentCookies,
        },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        const responseText = await response.text();
        console.error("❌ Response body:", responseText);
        throw new Error(
          `Failed to delete image: ${response.status} ${response.statusText}`,
        );
      }

      return true;
    } catch (error) {
      console.error("❌ ERROR deleting image:", error);
      console.groupEnd();
      toast({
        title: "Error",
        description: "No se pudo eliminar la imagen",
        variant: "destructive",
      });
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
    // Check if this image is still uploading
    if (uploadingSecondaryIndices.includes(index)) {
      console.warn("⏳ Image is still uploading, please wait...");
      toast({
        title: "Espera",
        description:
          "La imagen aún se está subiendo. Por favor espera a que termine.",
        variant: "destructive",
      });
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
      return;
    }

    if (!secondaryImage.url) {
      console.error("❌ No URL found in secondary image:", secondaryImage);
      toast({
        title: "Error",
        description: "Image URL is missing",
        variant: "destructive",
      });
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
      return;
    }

    // Create new secondary images array with the swap
    const newSecondaryImages = [...secondaryImages];
    // Put current main image in the secondary position
    newSecondaryImages[index] = { url: mainImage };

    // Update state
    setMainImage(secondaryImage.url);
    setSecondaryImages(newSecondaryImages);
  };

  // Advanced Image Processing Functions (based on Python script logic)

  // Load image from blob and return canvas
  const loadImageToCanvas = (file: Blob): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement("img");
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) reject(new Error("Failed to get canvas context"));
          ctx?.drawImage(img, 0, 0);
          resolve(canvas);
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  // Crop image to content (remove empty transparent space)
  const cropToContent = (imageData: ImageData): ImageData => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Find non-empty rows and columns (alpha channel > 0)
    const nonEmptyRows: number[] = [];
    const nonEmptyColumns: number[] = [];

    for (let i = 0; i < height; i++) {
      let rowHasContent = false;
      for (let j = 0; j < width; j++) {
        const alpha = data[(i * width + j) * 4 + 3];
        if (alpha > 0) {
          rowHasContent = true;
          if (!nonEmptyColumns.includes(j)) nonEmptyColumns.push(j);
        }
      }
      if (rowHasContent) nonEmptyRows.push(i);
    }

    if (nonEmptyRows.length === 0 || nonEmptyColumns.length === 0) {
      return imageData; // No content detected
    }

    const minRow = Math.max(0, Math.min(...nonEmptyRows) - 200);
    const maxRow = Math.min(height, Math.max(...nonEmptyRows) + 200);
    const minCol = Math.max(0, Math.min(...nonEmptyColumns) - 50);
    const maxCol = Math.min(width, Math.max(...nonEmptyColumns) + 50);

    const cropWidth = maxCol - minCol;
    const cropHeight = Math.max(400, maxRow - minRow);

    const croppedData = new ImageData(cropWidth, cropHeight);
    for (let i = 0; i < cropHeight; i++) {
      for (let j = 0; j < cropWidth; j++) {
        const srcIdx = ((minRow + i) * width + (minCol + j)) * 4;
        const dstIdx = (i * cropWidth + j) * 4;
        croppedData.data[dstIdx] = data[srcIdx];
        croppedData.data[dstIdx + 1] = data[srcIdx + 1];
        croppedData.data[dstIdx + 2] = data[srcIdx + 2];
        croppedData.data[dstIdx + 3] = data[srcIdx + 3];
      }
    }
    return croppedData;
  };

  // Resize and add padding to create square image (1080x1080)
  const resizeAndPad = (
    canvas: HTMLCanvasElement,
    desiredSize: number = 1080,
    addWhiteBg: boolean = false,
  ): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
      const img = document.createElement("img");
      img.onload = () => {
        const ratio = Math.min(
          desiredSize / img.width,
          desiredSize / img.height,
        );
        const newWidth = Math.round(img.width * ratio);
        const newHeight = Math.round(img.height * ratio);

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) return;

        tempCtx.drawImage(img, 0, 0, newWidth, newHeight);

        // Create final canvas with padding
        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = desiredSize;
        finalCanvas.height = desiredSize;
        const finalCtx = finalCanvas.getContext("2d");
        if (!finalCtx) return;

        // Draw background
        if (addWhiteBg) {
          finalCtx.fillStyle = "white";
          finalCtx.fillRect(0, 0, desiredSize, desiredSize);
        } else {
          finalCtx.clearRect(0, 0, desiredSize, desiredSize);
        }

        // Draw resized image centered
        const offsetX = (desiredSize - newWidth) / 2;
        const offsetY = (desiredSize - newHeight) / 2;
        finalCtx.drawImage(tempCanvas, offsetX, offsetY);

        resolve(finalCanvas);
      };
      img.src = canvas.toDataURL("image/png");
    });
  };

  // Alternative: Process image using Python API (requires Python with rembg)
  const processImagePython = async (
    file: Blob,
    removeBackground: boolean = false,
    optimizeForWeb: boolean = true,
  ): Promise<Blob> => {
    try {
      const formData = new FormData();
      formData.append("file", file, "image.jpg");
      formData.append("remove_background", removeBackground.toString());
      formData.append("crop", "true");
      formData.append("white_background", "false");
      formData.append("width", "1080");
      formData.append("height", "1080");
      formData.append("quality", optimizeForWeb ? "85" : "95");

      const startTime = performance.now();

      const response = await fetch(REMOTE_PROCESS_URL, {
        method: "POST",
        headers: {
          "x-api-key": REMOTE_API_KEY,
        },
        body: formData,
      });

      const elapsedTime = performance.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { rawResponse: errorText };
        }
        console.error("❌ API Error Response:", errorData);
        console.warn(
          "⚠️ Remote API processing failed - Falling back to browser processing",
        );
        // Fall back to browser processing
        return await processImageOptimized(
          file,
          removeBackground,
          optimizeForWeb,
        );
      }

      const responseData = await response.json();

      const imageUrl = `${REMOTE_API_BASE}${responseData.url}`;

      const downloadStart = performance.now();
      const blob = await fetch(imageUrl).then((r) => r.blob());
      const downloadTime = performance.now() - downloadStart;

      return blob;
    } catch (error) {
      console.error("❌ ERROR during image processing:", error);
      if (error instanceof Error) {
      }
      console.warn("⚠️ Using browser processing as fallback");
      // Fall back to browser processing
      return await processImageOptimized(
        file,
        removeBackground,
        optimizeForWeb,
      );
    }
  };

  // Remove background using browser-based color detection (no third-party service)
  const removeBackgroundBrowser = (imageData: ImageData): ImageData => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Detect dominant background color by sampling image edges
    const edgeSamples: { r: number; g: number; b: number; count: number }[] =
      [];

    // Sample top, bottom, left, right edges
    const sampleSize = 20;

    // Top edge
    for (let x = 0; x < width; x += Math.ceil(width / sampleSize)) {
      for (let y = 0; y < Math.min(sampleSize, height); y++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        edgeSamples.push({ r, g, b, count: 1 });
      }
    }

    // Bottom edge
    for (let x = 0; x < width; x += Math.ceil(width / sampleSize)) {
      for (let y = Math.max(0, height - sampleSize); y < height; y++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        edgeSamples.push({ r, g, b, count: 1 });
      }
    }

    // Left edge
    for (let y = 0; y < height; y += Math.ceil(height / sampleSize)) {
      for (let x = 0; x < Math.min(sampleSize, width); x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        edgeSamples.push({ r, g, b, count: 1 });
      }
    }

    // Right edge
    for (let y = 0; y < height; y += Math.ceil(height / sampleSize)) {
      for (let x = Math.max(0, width - sampleSize); x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        edgeSamples.push({ r, g, b, count: 1 });
      }
    }

    // Find most common edge color (likely background)
    const colorMap = new Map<
      string,
      { r: number; g: number; b: number; count: number }
    >();
    edgeSamples.forEach((sample) => {
      const key = `${sample.r},${sample.g},${sample.b}`;
      if (colorMap.has(key)) {
        const existing = colorMap.get(key)!;
        existing.count++;
      } else {
        colorMap.set(key, { ...sample });
      }
    });

    let bgColor = { r: 255, g: 255, b: 255, count: 0 };
    colorMap.forEach((color) => {
      if (color.count > bgColor.count) {
        bgColor = color;
      }
    });

    // Threshold for color similarity (0-255)
    const colorThreshold = 30;

    // Process each pixel
    const processedData = new ImageData(width, height);
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Calculate color distance from background color
      const distance = Math.sqrt(
        Math.pow(r - bgColor.r, 2) +
          Math.pow(g - bgColor.g, 2) +
          Math.pow(b - bgColor.b, 2),
      );

      // If color is similar to background, make transparent
      if (distance < colorThreshold) {
        processedData.data[i] = r;
        processedData.data[i + 1] = g;
        processedData.data[i + 2] = b;
        processedData.data[i + 3] = 0; // Transparent
      } else {
        // Keep foreground pixel
        processedData.data[i] = r;
        processedData.data[i + 1] = g;
        processedData.data[i + 2] = b;
        processedData.data[i + 3] = a; // Original alpha
      }
    }

    return processedData;
  };

  // Canvas to Blob
  const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, "image/png");
    });
  };

  // Complete image optimization pipeline
  const processImageOptimized = async (
    file: Blob,
    removeBackground: boolean = false,
    optimizeForWeb: boolean = true,
  ): Promise<Blob> => {
    try {
      // Step 1: Load image to canvas
      const canvas = await loadImageToCanvas(file);

      // Step 2: Get image data
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get canvas context");

      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Step 3: Remove background (optional, browser-based)
      if (removeBackground) {
        imageData = removeBackgroundBrowser(imageData);
      }

      // Step 4: Crop to content
      const croppedImageData = cropToContent(imageData);

      // Step 5: Create canvas from cropped data
      const croppedCanvas = document.createElement("canvas");
      croppedCanvas.width = croppedImageData.width;
      croppedCanvas.height = croppedImageData.height;
      const croppedCtx = croppedCanvas.getContext("2d");
      if (!croppedCtx) throw new Error("Failed to get canvas context");

      croppedCtx.putImageData(croppedImageData, 0, 0);

      // Step 6: Resize and add padding
      const paddedCanvas = await resizeAndPad(croppedCanvas, 1080, false);

      // Step 7: Convert to blob with optimization
      let finalBlob = await canvasToBlob(paddedCanvas);

      // Step 8: Further compression if needed
      if (optimizeForWeb && finalBlob.size > 500000) {
        // If over 500KB, use WebP compression
        finalBlob = await new Promise((resolve) => {
          const img = document.createElement("img");
          img.onload = async () => {
            const compCanvas = document.createElement("canvas");
            compCanvas.width = 1080;
            compCanvas.height = 1080;
            const compCtx = compCanvas.getContext("2d");
            if (compCtx) {
              compCtx.drawImage(img, 0, 0);
              compCanvas.toBlob(
                (blob) => {
                  resolve(blob || finalBlob);
                },
                "image/webp",
                0.85,
              );
            } else {
              resolve(finalBlob);
            }
          };
          img.src = paddedCanvas.toDataURL("image/png");
        });
      }

      return finalBlob;
    } catch (error) {
      console.error("Error in image optimization:", error);
      // Return original if processing fails
      return file;
    }
  };

  const handleMainSecondaryImagesChange = async (e: any, index: number) => {
    let files = e?.target.files;
    if (files) {
      for (var i = 0; i < files?.length; i++) {
        var file = files[i];
        try {
          setIsProcessing(true);
          // Mark this index as uploading
          setUploadingSecondaryIndices((prev) => [...prev, index]);

          // Process image before preview (uses remote API with browser fallback)
          const processedBlob = await processImagePython(
            file,
            removeBackground,
            true,
          );

          // Create preview URL from processed image
          const previewUrl = URL.createObjectURL(processedBlob);

          // Show preview immediately
          setSecondaryImages((prev) => {
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

          setSecondaryImages((prev) => {
            const updated = [...prev];
            updated[index] = { url: cleanUrl };
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

  async function compressAndOptimizeSecondaryImage(
    file: Blob | MediaSource,
    url: string,
    index: number,
  ) {
    // Create an HTML Image element
    const img = document.createElement("img");

    // Load the file into the Image element
    img.src = URL.createObjectURL(file);

    // Wait for the image to load
    img.onload = async () => {
      // Create a canvas element
      const canvas = document.createElement("canvas");
      const ctx: any = canvas.getContext("2d");

      // Set the canvas dimensions to the image dimensions
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the image onto the canvas
      ctx.drawImage(img, 0, 0);

      // Compress and set quality (adjust quality value as needed)
      const quality = 0.9; // Adjust quality value as needed
      const compressedImageData = canvas.toDataURL("image/webp", quality);

      // Convert base64 data URL to Blob
      const blobData = await fetch(compressedImageData).then((res) =>
        res.blob(),
      );

      // Upload the compressed image
      uploadSecondaryFiles(blobData, url, index);
    };
  }

  async function uploadSecondaryFiles(
    blobData: Blob,
    url: any | URL | Request,
    index: number,
  ) {
    fetch(url, {
      method: "PUT",
      body: blobData,
    })
      .then(() => {
        const newUrl = url?.split("?");
        const newSecondaryImages = [...secondaryImages];
        newSecondaryImages[index].url = newUrl[0];
        setSecondaryImages(newSecondaryImages);
      })
      .catch((e) => {
        console.error(e);
      });
  }
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
      cb(file, url);
    } catch (e) {
      console.error("❌ Error in retrieveNewURL:", e);
      throw e;
    }
  }

  // *******main images**********  //
  const upload = async (e: any) => {
    let files = e?.target.files;
    let section = e?.target.id;
    if (files) {
      for (var i = 0; i < files?.length; i++) {
        var file = files[i];

        try {
          setIsProcessing(true);

          // Process image before preview (uses remote API with browser fallback)
          const processedBlob = await processImagePython(
            file,
            removeBackground,
            true,
          );

          // Create preview URL from processed image
          const previewUrl = URL.createObjectURL(processedBlob);

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

          if (section === "selectorMain") {
            setMainImage(cleanUrl);
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
    const maxDimension = 1080;

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
    uploadFile(blobData, url, section);
  }

  // to upload this file to S3 at `https://minio.salvawebpro.com:9000` using the URL:
  async function uploadFile(
    blobData: Blob,
    url: any | URL | Request,
    section: string,
  ) {
    fetch(url, {
      method: "PUT",
      body: blobData,
    })
      .then(async () => {
        // If multiple files are uploaded, append upload status on the next line.
        // document.querySelector(
        //   '#status'
        // ).innerHTML += `<br>Uploaded ${file.name}.`;
        const newUrl = url.split("?");
        const imageUrl = newUrl[0];

        // Call the new API route to generate SEO content
        // const seoResponse = await fetch("/api/textextractor", {
        //   method: "POST",
        //   headers: {
        //     "Content-Type": "application/json",
        //   },
        //   body: JSON.stringify({ imageText }),
        // });

        // if (!seoResponse.ok) {
        //   setIsProcessing(false);

        //   throw new Error("Failed to generate SEO content");
        // }

        // const { title, description } = await seoResponse.json();
        // setDescription(description);
        // setTitle(title);

        if (section === "selectorMain") {
          setMainImage(newUrl[0]);
        }
        setIsProcessing(false);
      })
      .catch((e) => {
        console.error(e);
      });
  }

  async function hanldeFormSubmit(e: any) {
    e.preventDefault();
    if (
      !mainImage ||
      mainImage === "/images/product-placeholder-minimalist.jpg"
    ) {
      setValidationError({
        mainImage: { _errors: ["Se requiere una imagen "] },
      });
      return;
    }
    if (!title) {
      setValidationError({ title: { _errors: ["Se requiere un titulo "] } });
      return;
    }
    if (!description) {
      setValidationError({
        description: { _errors: ["Se requiere descripción "] },
      });
      return;
    }
    if (!variations[0].price) {
      setValidationError({
        price: { _errors: ["Se requiere un precio de producto "] },
      });
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("featured", featured.toString());
    formData.append("active", active.toString());
    formData.append("onlineAvailability", onlineAvailability.toString());
    formData.append("updatePrice", updatePrice.toString());
    formData.append("discountPercentage", discountPercentage.toString());
    formData.append("brand", brand);
    formData.append("grade", grade.toString());
    formData.append("gender", gender);
    formData.append("mainCategory", mainCategoryId);
    formData.append("subCategory", subCategoryId);
    formData.append("attributes", JSON.stringify(attributeIds));
    formData.append("weight", weight.toString());
    formData.append("dimensions", JSON.stringify(dimensions));
    formData.append("mainImage", mainImage);
    formData.append("variations", JSON.stringify(variations));
    formData.append("secondaryImages", JSON.stringify(secondaryImages));
    formData.append("asin", asin);
    formData.append("createdAt", createdAt);
    if (inventoryStoreId) formData.append("inventoryStoreId", inventoryStoreId);
    if (initialCost !== "")
      formData.append("initialCost", initialCost.toString());
    if (initialStock !== "")
      formData.append("initialStock", initialStock.toString());

    const endpoint = `/api/newproduct`;
    setIsSending(true);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Cookie: currentCookies },
      body: formData,
    });

    if (!response?.ok) {
      const errorData = await response.json();

      if (response.status === 409 && errorData.status === "asin_exists") {
        // ASIN conflict - show modal with existing product
        setConflictingProduct(errorData.existingProduct);
        setShowASINConflictModal(true);
        setIsSending(false);
      } else if (response.status === 409) {
        // Title conflict
        setValidationError({
          response: { _errors: ["Este Titulo de producto ya esta en uso"] },
        });
        setIsSending(false);
      } else {
        setValidationError({
          response: {
            _errors: [errorData.error || "Error al crear el producto"],
          },
        });
        setIsSending(false);
      }
    } else {
      setValidationError(null);
      await updateRevalidateProduct();
      if (pathname.includes("admin")) router.push("/admin/productos");
    }
  }

  return (
    <main className="w-full p-4 maxsm:p-2 bg-background">
      {!isSending ? (
        <div className="flex flex-col items-start gap-5 justify-start w-full">
          <section className="w-full">
            <div className="flex flex-row maxmd:flex-col items-center justify-between">
              <h1 className="w-full text-2xl font-semibold text-foreground mb-8 font-EB_Garamond">
                Nuevo Producto
              </h1>
              {/* Toggles */}
              <div className="mb-4 w-full flex flex-row gap-4 items-center uppercase">
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
                <ToggleSwitch
                  label="Actualizar Precio"
                  enabled={updatePrice}
                  setEnabled={setUpdatePrice}
                />
                <ToggleSwitch
                  label="Remover Fondo"
                  enabled={removeBackground}
                  setEnabled={setRemoveBackground}
                />
              </div>
            </div>

            {validationError?.general && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {(validationError.general as any)._errors.join(", ")}
              </div>
            )}

            <div className="flex flex-row maxmd:flex-col items-start gap-3 justify-between w-full">
              {/* Images column */}
              <div className="gap-y-1 flex-col flex px-2 w-full">
                <Loader loading={isProcessing}>{""}</Loader>
                <div
                  className={`relative aspect-video ${isProcessing ? "opacity-10" : "hover:opacity-80"} bg-background border-2 border-gray-300`}
                >
                  <label
                    htmlFor="selectorMain"
                    className={
                      isProcessing ? "cursor-not-allowed" : "cursor-pointer"
                    }
                  >
                    <Image
                      id="blogImage"
                      alt="blogBanner"
                      src={mainImage}
                      width={1280}
                      height={1280}
                      className="w-full h-full object-contain z-20"
                      key={`main-img-${mainImage}`}
                      onError={(e) => {
                        console.error(
                          "❌ Error loading main image:",
                          mainImage,
                        );
                      }}
                    />
                    <input
                      id="selectorMain"
                      type="file"
                      accept=".png, .jpg, .jpeg, .webp"
                      hidden
                      onChange={upload}
                      disabled={isProcessing}
                    />
                    {validationError?.mainImage && (
                      <p className="text-sm text-red-400">
                        {validationError.mainImage._errors.join(", ")}
                      </p>
                    )}
                  </label>
                </div>
                {/* Secondary images */}
                <div className="flex flex-row gap-2 items-center justify-start w-full mt-2">
                  {secondaryImages.map((image, index) => (
                    <div
                      key={`${image.url}-${index}`}
                      className="relative aspect-video h-32 w-32 bg-background border-2 border-gray-300 rounded overflow-hidden group"
                    >
                      {/* Remove Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSecondaryImage(index);
                        }}
                        className="absolute top-1 right-1 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        type="button"
                        title="Eliminar imagen"
                      >
                        <svg
                          className="w-3 h-3"
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

                      {/* Promote to Main Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          makeImageMain(index);
                        }}
                        className="absolute bottom-1 right-1 z-10 bg-primary hover:bg-primary/90 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        type="button"
                        title="Hacer imagen principal"
                      >
                        <svg
                          className="w-3 h-3"
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
                      </button>

                      <label
                        htmlFor={`selectorSecondary${index}`}
                        className="cursor-pointer w-full h-full flex items-center justify-center"
                      >
                        <Image
                          src={image.url}
                          width={250}
                          height={250}
                          alt="producto"
                          className="w-full h-full object-cover"
                          key={`img-${index}-${image.url}`}
                          onError={(e) => {
                            console.error(
                              `❌ Error loading secondary image at index ${index}:`,
                              image.url,
                            );
                          }}
                        />
                        <input
                          id={`selectorSecondary${index}`}
                          type="file"
                          accept=".png, .jpg, .jpeg, .webp"
                          hidden
                          onChange={(e) =>
                            handleMainSecondaryImagesChange(e, index)
                          }
                        />
                      </label>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setSecondaryImages((prev) => [
                        ...prev,
                        { url: "/images/product-placeholder-minimalist.jpg" },
                      ])
                    }
                    className="h-32 w-32 border-2 border-dashed border-gray-300 flex items-center justify-center text-muted-foreground text-2xl hover:border-primary transition-colors rounded"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Fields column */}
              <div className="w-full flex-col flex justify-start px-2 gap-y-2">
                <div className="mb-1">
                  <p className="text-red-700">
                    {validationError?.response?._errors.join(", ")}
                  </p>
                  <label className="block mb-1 font-EB_Garamond">
                    Titulo del Producto
                  </label>
                  <input
                    type="text"
                    className="appearance-none border bg-background rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                    placeholder="Nombre de Producto"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    name="title"
                  />
                  {validationError?.title && (
                    <p className="text-sm text-red-400">
                      {validationError.title._errors.join(", ")}
                    </p>
                  )}
                </div>

                <div className="mb-1">
                  <label className="block mb-1 font-EB_Garamond">
                    Descripción Corta
                  </label>
                  <textarea
                    rows={2}
                    className="appearance-none border bg-background rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                    placeholder="Descripción del Producto"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  {validationError?.description && (
                    <p className="text-sm text-red-400">
                      {validationError.description._errors.join(", ")}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-3">
                    {/* Certificador */}
                    <div className="flex w-60 flex-col items-start">
                      <label className="block mb-1 font-EB_Garamond text-xs">
                        Certificador
                      </label>
                      <select
                        className="appearance-none border bg-card text-card-foreground rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                      >
                        <option value="">Seleccionar certificador...</option>
                        {brands.map((b) => (
                          <option key={b._id} value={b.catTitle}>
                            {b.catTitle}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Grado */}
                    <div className="flex w-20 flex-col items-start">
                      <label className="block mb-1 font-EB_Garamond text-xs">
                        Grado
                      </label>
                      <input
                        type="number"
                        step="any"
                        className="appearance-none border bg-card text-card-foreground rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                        placeholder="9.5"
                        value={grade}
                        onChange={(e: any) => setGrade(e.target.value)}
                        inputMode="decimal"
                        style={{ MozAppearance: "textfield" }}
                      />
                    </div>
                    {/* Price */}
                    <div className="flex flex-col items-start w-full">
                      <label className="block mb-1 font-EB_Garamond text-xs">
                        Precio
                      </label>
                      <input
                        type="number"
                        className="appearance-none border bg-input rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                        placeholder="0.00"
                        min="1"
                        value={variations[0].price || ""}
                        onChange={(e) => handlePriceChange(0, e.target.value)}
                      />
                      {validationError?.price && (
                        <p className="text-sm text-red-400">
                          {validationError.price._errors.join(", ")}
                        </p>
                      )}

                      {/* Check Prices Button */}
                      {updatePrice && (
                        <button
                          type="button"
                          onClick={() => setShowPriceCheckerModal(true)}
                          className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
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
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                          Verificar Precios del Mercado
                        </button>
                      )}
                    </div>

                    {/* Discount Percentage */}
                    <div className="flex flex-col items-start w-full">
                      <label className="block mb-1 font-EB_Garamond text-xs">
                        Descuento (%)
                      </label>
                      <input
                        type="number"
                        className="appearance-none border bg-input rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.01"
                        value={discountPercentage}
                        onChange={(e) =>
                          setDiscountPercentage(parseFloat(e.target.value) || 0)
                        }
                      />
                      {variations[0].price && discountPercentage > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Precio original: ${variations[0].price.toFixed(2)} |
                          Precio con descuento: $
                          {(
                            variations[0].price *
                            (1 - discountPercentage / 100)
                          ).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Shipping */}
                  <div className="mb-4 border-t pt-4 w-full">
                    <label className="block mb-1 font-EB_Garamond text-xs font-semibold">
                      Información de Envío
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Para cálculo automático de costos de envío
                    </p>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block mb-1 font-EB_Garamond text-xs">
                          Peso (kg)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="appearance-none border bg-input rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                          placeholder="0.5"
                          min="0.01"
                          value={weight}
                          onChange={(e) =>
                            setWeight(parseFloat(e.target.value) || 0.5)
                          }
                        />
                      </div>
                      <div>
                        <label className="block mb-1 font-EB_Garamond text-xs">
                          Largo (cm)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          className="appearance-none border bg-input rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                          placeholder="15"
                          min="0.1"
                          value={dimensions.length}
                          onChange={(e) =>
                            setDimensions({
                              ...dimensions,
                              length: parseFloat(e.target.value) || 15,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block mb-1 font-EB_Garamond text-xs">
                          Ancho (cm)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          className="appearance-none border bg-input rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                          placeholder="15"
                          min="0.1"
                          value={dimensions.width}
                          onChange={(e) =>
                            setDimensions({
                              ...dimensions,
                              width: parseFloat(e.target.value) || 15,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block mb-1 font-EB_Garamond text-xs">
                          Alto (cm)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          className="appearance-none border bg-input rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                          placeholder="10"
                          min="0.1"
                          value={dimensions.height}
                          onChange={(e) =>
                            setDimensions({
                              ...dimensions,
                              height: parseFloat(e.target.value) || 10,
                            })
                          }
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Defaults: 0.5 kg, 9×1×14 cm
                    </p>
                  </div>

                  {/* New taxonomy: Main Category / Subcategory / Attributes */}
                  <div className="mb-1 w-full">
                    <label className="block mb-1 font-EB_Garamond text-xs">
                      Categoría Principal
                    </label>
                    <select
                      className="appearance-none border bg-card text-card-foreground rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                      value={mainCategoryId}
                      onChange={(e) => {
                        setMainCategoryId(e.target.value);
                        setSubCategoryId("");
                      }}
                    >
                      <option value="">Seleccionar categoría principal...</option>
                      {mainCategories.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-1 w-full">
                    <label className="block mb-1 font-EB_Garamond text-xs">
                      Subcategoría
                    </label>
                    <select
                      className="appearance-none border bg-card text-card-foreground rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full disabled:opacity-50"
                      value={subCategoryId}
                      onChange={(e) => setSubCategoryId(e.target.value)}
                      disabled={!mainCategoryId}
                    >
                      <option value="">Seleccionar subcategoría...</option>
                      {subCategories
                        .filter((s) => s.parent === mainCategoryId)
                        .map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="mb-1 w-full">
                    <label className="block mb-1 font-EB_Garamond text-xs">
                      Atributos
                    </label>
                    <select
                      multiple
                      className="appearance-none border bg-card text-card-foreground rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full h-24"
                      value={attributeIds}
                      onChange={(e) =>
                        setAttributeIds(
                          Array.from(e.target.selectedOptions, (o) => o.value),
                        )
                      }
                    >
                      {attributeOptions.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Gender (legacy) */}
                  {/* <div className="mb-1 w-full">
                    <label className="block mb-1 font-EB_Garamond text-xs">
                      Género (legado)
                    </label>
                    <select
                      className="appearance-none border bg-card text-card-foreground rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="">Seleccionar género...</option>
                      {genders.map((g) => (
                        <option key={g._id} value={g.catTitle}>
                          {g.catTitle}
                        </option>
                      ))}
                    </select>
                  </div> */}

                  {/* Category (legacy) */}
                  {/* <div className="mb-1 w-full">
                    <label className="block mb-1 font-EB_Garamond text-xs">
                      Categoría (legado)
                    </label>
                    <select
                      className="appearance-none border bg-card text-card-foreground rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">Seleccionar categoría...</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c.catTitle}>
                          {c.catTitle}
                        </option>
                      ))}
                    </select>
                  </div> */}

                  {/* ASIN */}
                  <div className="mb-1 w-full">
                    <label className="block mb-1 font-EB_Garamond text-xs">
                      Codigo de Barras/QR
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="appearance-none border bg-card text-card-foreground rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full uppercase"
                        placeholder="Ej. B08N5WRWNW"
                        value={asin}
                        onChange={(e) => setAsin(e.target.value.toUpperCase())}
                      />
                      <button
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="flex-shrink-0 flex items-center gap-1 px-3 py-2 bg-muted hover:bg-primary hover:text-primary-foreground rounded-xl transition-colors text-sm"
                        title="Escanear código"
                      >
                        <MdQrCodeScanner size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Inventario Inicial */}
                  <div className="mb-1 w-full border-t pt-4">
                    <label className="block mb-2 font-EB_Garamond text-xs font-semibold">
                      Inventario Inicial (opcional)
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Asigna stock a una sucursal y registra una orden de
                      trabajo automáticamente.
                    </p>
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block mb-1 font-EB_Garamond text-xs">
                          Sucursal
                        </label>
                        <select
                          className="appearance-none border bg-card text-card-foreground rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                          value={inventoryStoreId}
                          onChange={(e) => setInventoryStoreId(e.target.value)}
                        >
                          <option value="">— Sin asignar —</option>
                          {stores.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {inventoryStoreId && (
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="block mb-1 font-EB_Garamond text-xs">
                              Costo unitario ($)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="appearance-none border bg-input rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                              placeholder="0.00"
                              value={initialCost}
                              onChange={(e) =>
                                setInitialCost(
                                  e.target.value === ""
                                    ? ""
                                    : parseFloat(e.target.value),
                                )
                              }
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block mb-1 font-EB_Garamond text-xs">
                              Cantidad
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              className="appearance-none border bg-input rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                              placeholder="1"
                              value={initialStock}
                              onChange={(e) =>
                                setInitialStock(
                                  e.target.value === ""
                                    ? ""
                                    : parseInt(e.target.value),
                                )
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional variations */}
            {variations.slice(1).map((variation, index) => (
              <div
                key={index + 1}
                className="w-full flex maxsm:flex-col items-center"
              >
                <div className="relative flex flex-row items-center gap-3 w-full">
                  <div
                    onClick={() => removeVariation(index + 1)}
                    className="absolute top-0 -left-5 px-1 bg-red-500 text-white rounded-full cursor-pointer z-50 text-xs"
                  >
                    X
                  </div>
                  <div className="mb-4 w-full">
                    <label className="block mb-1 font-EB_Garamond text-xs">
                      Precio
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={variation.price || ""}
                      name={`price-${index + 1}`}
                      onChange={(e) =>
                        handlePriceChange(index + 1, e.target.value)
                      }
                      className="appearance-none border bg-input rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              disabled={isSending || isProcessing}
              onClick={hanldeFormSubmit}
              className={`${isSending ? "cursor-wait" : ""} my-2 cursor-pointer px-4 py-2 text-center inline-block text-white bg-black border border-transparent rounded-xl hover:bg-slate-800 w-full disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSending ? "Creando..." : "Crear Producto"}
            </button>
          </section>
        </div>
      ) : (
        <section className="w-full min-h-screen">
          <div className="flex flex-col items-center justify-center min-h-screen w-full">
            <span className="loader"></span>
            <h2 className="text-sm">Creando producto...</h2>
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

      {/* Price Checker Modal */}
      <PriceCheckerModal
        isOpen={showPriceCheckerModal}
        onClose={() => setShowPriceCheckerModal(false)}
        productTitle={title || ""}
        asin={asin || ""}
        currentPrice={variations?.[0]?.price || 0}
        onPriceSelected={handlePriceSelected}
        onCardDetailsUpdate={handleCardDetailsUpdate}
      />

      {/* ASIN Conflict Modal */}
      <ASINConflictModal
        isOpen={showASINConflictModal}
        existingProduct={conflictingProduct}
        onClose={() => {
          setShowASINConflictModal(false);
          setConflictingProduct(null);
        }}
        onViewProduct={() => {
          router.push(`/admin/productos/${conflictingProduct?.slug}`);
        }}
      />
    </main>
  );
};

export default NewVariationOptimized;
