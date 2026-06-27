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
        throw new Error("Failed to delete image from MinIO");
      }

      console.log("Image deleted from MinIO:", imageUrl);
      return true;
    } catch (error) {
      console.error("Error deleting image from MinIO:", error);
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
    const secondaryImage = secondaryImages[index];
    if (secondaryImage?.url) {
      // Create new secondary images array with the swap
      const newSecondaryImages = [...secondaryImages];
      // Put current main image in the secondary position
      newSecondaryImages[index] = { url: mainImage };
      // Update state
      setMainImage(secondaryImage.url);
      setSecondaryImages(newSecondaryImages);
    }
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
    fetch(endpoint, {
      method: "PUT",
      headers: {
        "Access-Control-Allow-Origin": "*",
        Name: file.name,
      },
    })
      .then((response) => {
        response.text().then((url) => {
          cb(file, url);
        });
      })
      .catch((e) => {
        console.error(e);
      });
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

          // Retrieve a URL from our server and process the image
          await new Promise<void>((resolve, reject) => {
            retrieveNewURL(file, async (file, url) => {
              try {
                const parsed = JSON.parse(url);
                url = parsed.url;

                await compressAndOptimizeMainImage(file, url, section);
                resolve();
              } catch (error) {
                reject(error);
              }
            });
          });
          setIsProcessing(false);
        } catch (error) {
          console.error("Error during upload:", error);
          setIsProcessing(false);
          // Handle the error appropriately, maybe show a user-friendly message
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
          // Retrieve a URL from our server and process the image
          await new Promise<void>((resolve, reject) => {
            retrieveNewURL(file, async (file, url) => {
              try {
                const parsed = JSON.parse(url);
                url = parsed.url;
                console.log("file, url", file, url, index);
                await compressAndOptimizeSecondaryImage(file, url, index);
                resolve();
              } catch (error) {
                reject(error);
              }
            });
          });
        } catch (error) {
          console.error("Error during variation image upload:", error);
          // Handle the error appropriately, maybe show a user-friendly message
        }
      }
    }
  };

  async function compressAndOptimizeSecondaryImage(
    file: Blob | MediaSource,
    url: string,
    index: number,
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

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const quality = 0.9;
    const compressedImageData = canvas.toDataURL("image/webp", quality);
    const blobData = await fetch(compressedImageData).then((res) => res.blob());

    await uploadSecondaryFiles(blobData, url, index);
  }

  async function uploadSecondaryFiles(
    blobData: Blob,
    url: any | URL | Request,
    index: number,
  ) {
    return fetch(url, {
      method: "PUT",
      body: blobData,
    })
      .then(() => {
        const newUrl = url?.split("?");
        setSecondaryImages((prev: any[]) => {
          const updated = [...prev];
          if (updated[index]) {
            updated[index] = { ...updated[index], url: newUrl[0] };
          }
          return updated;
        });
      })
      .catch((e) => {
        console.error(e);
      });
  }

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
                      key={index}
                      className="relative aspect-square bg-muted rounded-lg overflow-hidden group"
                    >
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
