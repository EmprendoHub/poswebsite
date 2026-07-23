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
import PriceVerificationModal from "@/components/modals/PriceVerificationModal";
import PriceCheckerModal from "@/components/modals/PriceCheckerModal";
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
  const [removeBackground, setRemoveBackground] = useState(true);
  const [updatePrice, setUpdatePrice] = useState(product?.updatePrice ?? false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState(
    product?.discountPercentage || 0,
  );
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

  // Product Details (Brands, Genders, Categories)
  const [brands, setBrands] = useState<{ _id: string; catTitle: string }[]>([]);
  const [genders, setGenders] = useState<{ _id: string; catTitle: string }[]>(
    [],
  );
  const [categories, setCategories] = useState<
    { _id: string; catTitle: string }[]
  >([]);

  const [mainImage, setMainImage] = useState(product?.images[0]?.url || "");
  const [uploadingSecondaryIndices, setUploadingSecondaryIndices] = useState<
    number[]
  >([]);
  const [processingImageType, setProcessingImageType] = useState<
    "main" | "secondary" | null
  >(null);
  const [processingImageIndex, setProcessingImageIndex] = useState<
    number | null
  >(null);

  const [variations, setVariations] = useState(product?.variations);
  const [secondaryImages, setSecondaryImages] = useState(
    product?.images?.slice(1) || [],
  );

  // Local state for price input (to prevent immediate state updates)
  const [priceInputValue, setPriceInputValue] = useState<string>(
    variations?.[0]?.price?.toString() || "",
  );

  // Price verification state
  const [showPriceVerification, setShowPriceVerification] = useState(false);
  const [pendingPriceChange, setPendingPriceChange] = useState<{
    variationIndex: number;
    oldPrice: number;
    newPrice: number;
  } | null>(null);
  const [priceChangeAuthorizedBy, setPriceChangeAuthorizedBy] = useState<
    string | null
  >(null);

  // Price checker modal state
  const [showPriceCheckerModal, setShowPriceCheckerModal] = useState(false);
  const [priceChangeAuthorizedUserId, setPriceChangeAuthorizedUserId] =
    useState<string | null>(null);
  const [authorizedPriceChange, setAuthorizedPriceChange] = useState<{
    oldPrice: number;
    newPrice: number;
  } | null>(null);

  // Sync price input when price change is cancelled or modal closes
  useEffect(() => {
    if (!showPriceVerification && variations?.[0]?.price !== undefined) {
      setPriceInputValue(variations[0].price.toString());
    }
  }, [showPriceVerification, variations]);

  // Fetch ProductDetails for brands, genders, categories
  useEffect(() => {
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
  }, []);

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
    const numPrice = parseFloat(newPrice);
    if (isNaN(numPrice) || numPrice < 0) return;

    const oldPrice = variations[index]?.price;

    console.log("🏷️ Price Change Triggered:", {
      index,
      oldPrice,
      newPrice: numPrice,
      isDifferent: oldPrice !== numPrice,
      hasOldPrice: !!oldPrice,
      oldPriceGtZero: oldPrice > 0,
    });

    // If price changed and there was a previous price, show verification modal
    if (
      oldPrice !== undefined &&
      oldPrice !== null &&
      oldPrice > 0 &&
      oldPrice !== numPrice
    ) {
      console.log("✅ Showing price verification modal");
      setPendingPriceChange({
        variationIndex: index,
        oldPrice,
        newPrice: numPrice,
      });
      setShowPriceVerification(true);
    } else {
      // If no previous price (new variation) or same price, just update
      console.log("📝 Updating price without verification");
      const newVariations = [...variations];
      newVariations[index].price = numPrice;
      setVariations(newVariations);
    }
  };

  const handlePriceVerificationAuthorized = (
    userName: string,
    userId: string,
  ) => {
    if (!pendingPriceChange) return;

    setPriceChangeAuthorizedBy(userName);
    setPriceChangeAuthorizedUserId(userId);
    // Store the old and new prices for later use during form submission
    setAuthorizedPriceChange({
      oldPrice: pendingPriceChange.oldPrice,
      newPrice: pendingPriceChange.newPrice,
    });
    const newVariations = [...variations];
    newVariations[pendingPriceChange.variationIndex].price =
      pendingPriceChange.newPrice;
    setVariations(newVariations);

    setShowPriceVerification(false);
    setPendingPriceChange(null);

    toast({
      title: "Cambio de precio autorizado",
      description: "El precio ha sido actualizado correctamente.",
    });
  };

  const handlePriceSelected = (selectedPrice: number) => {
    // Update the price input value and trigger price change
    setPriceInputValue(selectedPrice.toString());

    // Close the modal
    setShowPriceCheckerModal(false);

    // Trigger the price change handler
    handlePriceChange(0, selectedPrice.toString());

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
      const response = await fetch("/api/minio/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Cookie: currentCookies,
        },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to delete image: ${response.status} ${response.statusText}`,
        );
      }

      return true;
    } catch (error) {
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
      toast({
        title: "Error",
        description: "No image data found at this position",
        variant: "destructive",
      });
      console.groupEnd();
      return;
    }

    if (!secondaryImage.url) {
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
        console.error("❌ Image processing failed:", errorData);
        return file;
      }

      const responseData = await response.json();

      const imageUrl = `${REMOTE_API_BASE}${responseData.url}`;

      const downloadStart = performance.now();
      const blob = await fetch(imageUrl).then((r) => r.blob());
      const downloadTime = performance.now() - downloadStart;

      return blob;
    } catch (error) {
      console.error("❌ ERROR during image processing:", error);

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

      // Set processing state
      if (isSecondary) {
        setProcessingImageType("secondary");
        setProcessingImageIndex(secondaryIndex);
      } else {
        setProcessingImageType("main");
        setProcessingImageIndex(null);
      }

      const originalResponse = await fetch(originalUrl);
      if (!originalResponse.ok) {
        throw new Error(
          `Failed to download original image: ${originalResponse.statusText}`,
        );
      }

      const originalBlob = await originalResponse.blob();

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

      const processedBlob = await processImagePython(
        file,
        removeBackground,
        true,
      );

      const previewUrl = URL.createObjectURL(processedBlob);
      onPreview(previewUrl);

      const uploadUrl = await getUploadUrlForFile(file);

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: processedBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const cleanUrl = uploadUrl.split("?")[0];
      onSuccess(cleanUrl);
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
        toast({
          title: "Imagen reprocesada",
          description: "La imagen fue reprocesada y la original eliminada.",
        });
      }
    } catch (error) {
      console.error("❌ Error reprocessing current image:", error);
      if (error instanceof Error) {
        console.error("📋 Error details:", error.message);
        console.error("📍 Stack:", error.stack);
      }
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
      setProcessingImageType(null);
      setProcessingImageIndex(null);
      setIsProcessing(false);
    }
  };

  const reprocessMainImage = async () => {
    if (isProcessing || processingImageType) return;
    await processExistingImage({
      imageUrl: mainImage,
      onPreview: (previewUrl) => {
        setMainImage(previewUrl);
      },
      onSuccess: (finalUrl) => {
        setMainImage(finalUrl);
      },
    });
  };

  const reprocessSecondaryImage = async (index: number) => {
    if (isProcessing || processingImageType) return;

    const targetImage = secondaryImages[index]?.url;

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
        setSecondaryImages((prev: any[]) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], url: previewUrl };
          return updated;
        });
      },
      onSuccess: (finalUrl) => {
        setSecondaryImages((prev: any[]) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], url: finalUrl };
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
          const processedBlob = await processImagePython(
            file,
            removeBackground,
            true,
          );

          // Create preview URL from processed image
          const previewUrl = URL.createObjectURL(processedBlob);

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

          setSecondaryImages((prev: any[]) => {
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

  async function handleGeneratePaymentLink() {
    try {
      setGeneratingLink(true);

      if (!product?._id || !variations?.[0]?._id) {
        toast({
          title: "Error",
          description:
            "No se pueden generar el enlace. Guarda el producto primero.",
          variant: "destructive",
        });
        return;
      }

      console.log("🔗 [Generate Link] Creating payment link token...");

      const response = await fetch("/api/auth-token/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product._id,
          variationId: variations[0]._id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate token: ${response.statusText}`);
      }

      const data = await response.json();

      // Copy link to clipboard
      navigator.clipboard.writeText(data.paymentLink);

      toast({
        title: "Enlace generado",
        description: "El enlace de pago se ha copiado al portapapeles",
      });

      // Optionally show the link in a modal or log it
      console.log("✅ [Generate Link] Payment link generated:", {
        link: data.paymentLink,
        expiresAt: data.expiresAt,
      });

      // Also create alert to show the link
      alert(
        `Enlace de pago generado:\n\n${data.paymentLink}\n\nExpira: ${new Date(data.expiresAt).toLocaleString()}\n\n(Ya está copiado al portapapeles)`,
      );
    } catch (error) {
      console.error("❌ [Generate Link] Error:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el enlace de pago",
        variant: "destructive",
      });
    } finally {
      setGeneratingLink(false);
    }
  }

  async function hanldeFormSubmit(e: any) {
    e.preventDefault();

    // Enhanced validation with better error handling
    if (
      !mainImage ||
      mainImage === "/images/product-placeholder-minimalist.jpg"
    ) {
      const noMainImageError = {
        mainImage: { _errors: ["Se requiere una imagen principal"] },
      };
      setValidationError(noMainImageError);
      return;
    }
    if (!title || title.trim() === "") {
      const noTitleError = { title: { _errors: ["Se requiere un título"] } };
      setValidationError(noTitleError);
      return;
    }
    if (!description || description.trim() === "") {
      const noDescriptionError = {
        description: { _errors: ["Se requiere descripción"] },
      };
      setValidationError(noDescriptionError);
      return;
    }

    // Check variations array exists and has at least one item
    if (!variations || !Array.isArray(variations) || variations.length === 0) {
      const noVariationsError = {
        variations: { _errors: ["Se requiere al menos una variación"] },
      };
      setValidationError(noVariationsError);
      return;
    }

    if (!variations[0]?.price || variations[0].price <= 0) {
      const noPriceError = {
        price: { _errors: ["Se requiere un precio de producto válido"] },
      };
      setValidationError(noPriceError);
      return;
    }

    if (!product?._id) {
      const noIdError = {
        id: { _errors: ["ID de producto no encontrado"] },
      };
      setValidationError(noIdError);
      return;
    }

    try {
      setIsSending(true);

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
      formData.append("updatePrice", updatePrice?.toString() || "false");
      formData.append(
        "discountPercentage",
        discountPercentage?.toString() || "0",
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

      const endpoint = `/api/newproduct`;
      const result = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Cookie: currentCookies,
        },
        body: formData,
      });

      if (!result.ok) {
        const errorText = await result.text();
        console.error("API error response:", errorText);
        throw new Error(
          `HTTP error! status: ${result.status}, message: ${errorText}`,
        );
      }

      const responseData = await result.json();

      if (responseData?.error) {
        setValidationError(responseData.error);
      } else {
        setValidationError(null);

        // Log price changes to price tracker
        try {
          console.log("💰 Price Tracker Check:", {
            authorizedPriceChange,
            priceChangeAuthorizedBy,
            priceChangeAuthorizedUserId,
            hasVariations: !!product?.variations,
          });

          // If price was authorized during this session, use the stored values
          if (authorizedPriceChange && priceChangeAuthorizedBy) {
            console.log("✅ Logging authorized price change to tracker");
            await fetch("/api/price-tracker", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: product._id,
                productTitle: title,
                price: authorizedPriceChange.newPrice,
                label: "actualización de precio",
                category: category,
                brand: brand,
                authorizedBy: priceChangeAuthorizedBy,
                authorizedUserId: priceChangeAuthorizedUserId,
              }),
            });
            // Reset after logging
            setAuthorizedPriceChange(null);
            setPriceChangeAuthorizedBy(null);
            setPriceChangeAuthorizedUserId(null);
          } else {
            // Otherwise check if price changed naturally (without authorization modal)
            const oldPrice = product?.variations?.[0]?.price;
            const newPrice = variations?.[0]?.price;

            if (oldPrice !== newPrice && !product?.variations) {
              console.log("✅ Logging initial price for new product");
              await fetch("/api/price-tracker", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  productId: product._id,
                  productTitle: title,
                  price: newPrice,
                  label: "precio inicial",
                  category: category,
                  brand: brand,
                }),
              });
            } else {
              console.log("❌ Price change not logged - no authorization");
            }
          }
        } catch (priceTrackerError) {
          console.error("Error logging price change:", priceTrackerError);
          // Don't fail the update if price tracking fails
        }

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

  // Check if product brand requires a quote
  const isQuoteRequiredBrand = () => {
    const quoteBrands = [
      "PSA",
      "Beckett",
      "CGC",
      "AGS",
      "Icons",
      "GMA",
      "SGC",
      "BGS",
    ];
    return quoteBrands.some((b) => brand?.toLowerCase() === b.toLowerCase());
  };

  return (
    <main className="w-full min-h-screen bg-gradient-to-b from-background to-muted/5">
      {!isSending ? (
        <div className="w-full  bg-gradient-to-b from-background to-muted/5">
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
                  <ToggleSwitch
                    label="Actualizar Precio"
                    enabled={updatePrice}
                    setEnabled={setUpdatePrice}
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
                {/* Image Processing Options */}
                <div className="mb-6 flex items-center justify-between bg-white dark:bg-card rounded-xl shadow-sm border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <svg
                        className="w-5 h-5 text-amber-600 dark:text-amber-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Procesamiento de Imágenes
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Controla cómo se procesan las imágenes al subirlas
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    label="Remover Fondo"
                    enabled={removeBackground}
                    setEnabled={setRemoveBackground}
                  />
                </div>

                {/* Main Image Display */}
                <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-border overflow-hidden mb-6">
                  <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden group">
                    {/* Dimming overlay when processing ANY image */}
                    {processingImageType && (
                      <div className="absolute inset-0 bg-black/30 z-15 pointer-events-none"></div>
                    )}

                    {/* Processing Overlay */}
                    {processingImageType === "main" && (
                      <div className="absolute inset-0 bg-black/60 z-30 flex flex-col items-center justify-center backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 border-4 border-white border-t-amber-500 rounded-full animate-spin"></div>
                          <p className="text-white font-semibold text-center px-4">
                            Removiendo fondo y optimizando
                            <br />
                            por favor espera...
                          </p>
                        </div>
                      </div>
                    )}

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
                          disabled={
                            isProcessing || processingImageType !== null
                          }
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
                          className="absolute top-4 right-4 z-20 bg-destructive/90 hover:bg-destructive text-white rounded-full w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg disabled:opacity-60"
                          type="button"
                          title="Eliminar imagen"
                          disabled={
                            isProcessing || processingImageType !== null
                          }
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
                          <p className="text-sm font-semibold">
                            Cambiar imagen
                          </p>
                        </div>
                      </div>

                      <input
                        id="selectorMain"
                        type="file"
                        accept=".png, .jpg, .jpeg, .webp"
                        hidden
                        onChange={upload}
                        disabled={isProcessing || processingImageType !== null}
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
                        {/* Dimming overlay when processing ANY image (not this one) */}
                        {processingImageType &&
                          !(
                            processingImageType === "secondary" &&
                            processingImageIndex === index
                          ) && (
                            <div className="absolute inset-0 bg-black/30 z-15 pointer-events-none"></div>
                          )}

                        {/* Processing Overlay */}
                        {processingImageType === "secondary" &&
                          processingImageIndex === index && (
                            <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-2 border-white border-t-amber-500 rounded-full animate-spin"></div>
                                <p className="text-white font-semibold text-center px-2 text-xs leading-tight">
                                  Procesando
                                  <br />
                                  imagen...
                                </p>
                              </div>
                            </div>
                          )}

                        {/* Reprocess Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            reprocessSecondaryImage(index);
                          }}
                          className="absolute top-1 left-1 z-10 bg-amber-500/90 hover:bg-amber-500 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md disabled:opacity-60"
                          type="button"
                          title="Reprocesar esta imagen"
                          disabled={
                            isProcessing || processingImageType !== null
                          }
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
                          className="absolute top-1 right-1 z-10 bg-destructive/90 hover:bg-destructive text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md disabled:opacity-60"
                          type="button"
                          title="Eliminar imagen"
                          disabled={
                            isProcessing || processingImageType !== null
                          }
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
                          className="absolute bottom-1 right-1 z-10 bg-primary/90 hover:bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer disabled:opacity-60"
                          title="Cambiar esta imagen"
                          style={{
                            opacity:
                              isProcessing || processingImageType
                                ? 0.6
                                : undefined,
                            pointerEvents:
                              isProcessing || processingImageType
                                ? "none"
                                : "auto",
                            cursor:
                              isProcessing || processingImageType
                                ? "not-allowed"
                                : "pointer",
                          }}
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
                          onClick={() =>
                            !isProcessing &&
                            !processingImageType &&
                            makeImageMain(index)
                          }
                          className="w-full h-full cursor-pointer relative block overflow-hidden"
                          style={{
                            opacity:
                              isProcessing || processingImageType ? 0.7 : 1,
                            pointerEvents:
                              isProcessing || processingImageType
                                ? "none"
                                : "auto",
                          }}
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
                          disabled={
                            isProcessing || processingImageType !== null
                          }
                        />
                      </div>
                    ))}

                    {/* Add More Images Button */}
                    <label
                      className="relative aspect-square bg-muted rounded-lg overflow-hidden group border-2 border-dashed border-border hover:border-primary cursor-pointer flex items-center justify-center"
                      style={{
                        opacity: isProcessing || processingImageType ? 0.6 : 1,
                        pointerEvents:
                          isProcessing || processingImageType ? "none" : "auto",
                        cursor:
                          isProcessing || processingImageType
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
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
                        disabled={isProcessing || processingImageType !== null}
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
                        <select
                          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                          value={brand || ""}
                          onChange={(e) => setBrand(e.target.value)}
                          name="brand"
                        >
                          <option value="">Seleccionar certificador...</option>
                          {brands.map((b) => (
                            <option key={b._id} value={b.catTitle}>
                              {b.catTitle}
                            </option>
                          ))}
                        </select>
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
                      <label className="block mb-3 text-sm font-semibold text-foreground">
                        Precio de Venta
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-amber-500">
                          $
                        </span>
                        <input
                          type="number"
                          className="w-full pl-9 pr-4 py-3 border-2 border-border rounded-xl bg-gradient-to-br from-amber-50/50 to-background text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all hover:border-amber-300/50"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          value={priceInputValue}
                          onChange={(e) => {
                            console.log(
                              "📝 Price input changed:",
                              e.target.value,
                            );
                            setPriceInputValue(e.target.value);
                          }}
                          onBlur={(e) => {
                            const newPriceStr = e.target.value;
                            console.log(
                              "🔵 onBlur fired with value:",
                              newPriceStr,
                            );
                            handlePriceChange(0, newPriceStr);
                          }}
                          name="price"
                        />
                      </div>
                      {validationError?.price && (
                        <p className="text-xs text-destructive mt-1">
                          {validationError.price._errors.join(", ")}
                        </p>
                      )}
                    </div>

                    {/* Check Prices Button */}
                    {updatePrice && (
                      <button
                        type="button"
                        onClick={() => setShowPriceCheckerModal(true)}
                        className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
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

                    {/* Discount Percentage */}
                    <div className="mt-4">
                      <label className="block mb-3 text-sm font-semibold text-foreground">
                        Descuento (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          className="w-full px-4 py-3 border-2 border-border rounded-xl bg-gradient-to-br from-green-50/50 to-background text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all hover:border-green-300/50"
                          placeholder="0"
                          min="0"
                          max="100"
                          step="0.01"
                          value={discountPercentage}
                          onChange={(e) =>
                            setDiscountPercentage(
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          name="discountPercentage"
                        />
                      </div>
                      {variations?.[0]?.price && discountPercentage > 0 && (
                        <p className="text-xs text-green-600 mt-2">
                          Precio original: ${variations[0].price.toFixed(2)} |
                          Con descuento: $
                          {(
                            variations[0].price *
                            (1 - discountPercentage / 100)
                          ).toFixed(2)}
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
                        <select
                          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                          value={gender || ""}
                          onChange={(e) => setGender(e.target.value)}
                          name="gender"
                        >
                          <option value="">Seleccionar género...</option>
                          {genders.map((g) => (
                            <option key={g._id} value={g.catTitle}>
                              {g.catTitle}
                            </option>
                          ))}
                        </select>
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
                        <select
                          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                          value={category || ""}
                          onChange={(e) => setCategory(e.target.value)}
                          name="category"
                        >
                          <option value="">Seleccionar categoría...</option>
                          {categories.map((c) => (
                            <option key={c._id} value={c.catTitle}>
                              {c.catTitle}
                            </option>
                          ))}
                        </select>
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
                            <label className="block mb-2 text-sm font-semibold text-foreground">
                              Precio - Variación {index + 2}
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-amber-500">
                                $
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={variation.price || ""}
                                name={`price-${index + 1}`}
                                onChange={(e) => {
                                  const newVariations = [...variations];
                                  newVariations[index + 1].price =
                                    parseFloat(e.target.value) || 0;
                                  setVariations(newVariations);
                                }}
                                onBlur={(e) =>
                                  handlePriceChange(index + 1, e.target.value)
                                }
                                className="w-full pl-8 pr-3 py-2.5 border-2 border-border rounded-lg bg-gradient-to-br from-amber-50/30 to-background text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all hover:border-amber-300/50"
                              />
                            </div>
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
            </div>
            {/* Shipping Information */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-950/10 rounded-xl shadow-sm border border-blue-200 dark:border-blue-900/50 p-6 w-full mt-8">
              <div className="flex items-start gap-3 mb-5">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Información de Envío
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Usados para calcular automáticamente los costos de envío
                  </p>
                </div>
              </div>

              {/* Shipping Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                {/* Weight */}
                <div className="bg-white dark:bg-background rounded-lg p-4 border border-blue-100 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
                  <label className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      Peso
                    </span>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                      kg
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-lg font-medium"
                      placeholder="0.5"
                      min="0.01"
                      value={weight}
                      onChange={(e) =>
                        setWeight(parseFloat(e.target.value) || 0.5)
                      }
                      name="weight"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Por defecto: 0.5 kg
                  </p>
                </div>

                {/* Length */}
                <div className="bg-white dark:bg-background rounded-lg p-4 border border-blue-100 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
                  <label className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      Largo
                    </span>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                      cm
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-lg font-medium"
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
                  <p className="text-xs text-muted-foreground mt-2">
                    Por defecto: 15 cm
                  </p>
                </div>

                {/* Width */}
                <div className="bg-white dark:bg-background rounded-lg p-4 border border-blue-100 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
                  <label className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      Ancho
                    </span>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                      cm
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-lg font-medium"
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
                  <p className="text-xs text-muted-foreground mt-2">
                    Por defecto: 15 cm
                  </p>
                </div>

                {/* Height */}
                <div className="bg-white dark:bg-background rounded-lg p-4 border border-blue-100 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
                  <label className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      Alto
                    </span>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                      cm
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-lg font-medium"
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
                  <p className="text-xs text-muted-foreground mt-2">
                    Por defecto: 10 cm
                  </p>
                </div>
              </div>

              {/* Summary Info */}
              <div className="mt-5 p-4 bg-white dark:bg-background rounded-lg border border-blue-100 dark:border-blue-900/30">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    Dimensiones totales:
                  </span>
                  <span className="font-semibold text-foreground">
                    {dimensions.length}L × {dimensions.width}W ×{" "}
                    {dimensions.height}H cm · {weight} kg
                  </span>
                </div>
              </div>
            </div>
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

              {isQuoteRequiredBrand() && (
                <button
                  type="button"
                  disabled={
                    generatingLink || !product?._id || !variations?.[0]?._id
                  }
                  onClick={handleGeneratePaymentLink}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-green-600/50 disabled:to-green-700/50 text-white rounded-lg font-semibold transition-all disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                >
                  {generatingLink ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin"></span>
                      Generando...
                    </>
                  ) : (
                    <>
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
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                      Generar Enlace de Pago
                    </>
                  )}
                </button>
              )}
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

      {/* Price Verification Modal */}
      <PriceVerificationModal
        isOpen={showPriceVerification}
        newPrice={pendingPriceChange?.newPrice || 0}
        oldPrice={pendingPriceChange?.oldPrice}
        onAuthorized={handlePriceVerificationAuthorized}
        onCancel={() => {
          setShowPriceVerification(false);
          setPendingPriceChange(null);
        }}
      />

      {/* Price Checker Modal */}
      <PriceCheckerModal
        isOpen={showPriceCheckerModal}
        onClose={() => setShowPriceCheckerModal(false)}
        productTitle={title || ""}
        asin={asin || ""}
        currentPrice={variations?.[0]?.price || 0}
        onPriceSelected={handlePriceSelected}
        onCardDetailsUpdate={handleCardDetailsUpdate}
        brand={brand || ""}
        grade={grade || 0}
        productImage={mainImage || ""}
      />
    </main>
  );
};

export default EditVariationProduct;
