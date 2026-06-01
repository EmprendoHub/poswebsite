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
    <main className="w-full p-4 maxsm:p-2 bg-background">
      {!isSending ? (
        <div className="flex flex-col items-start gap-5 justify-start w-full">
          <section className="w-full ">
            <div className="flex flex-row maxmd:flex-col items-center justify-between">
              <h1 className="w-full text-2xl font-semibold text-foreground mb-8 font-EB_Garamond">
                Actualizar Producto
              </h1>
              {/* Availability */}
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
                  label="WWW"
                  enabled={onlineAvailability}
                  setEnabled={setOnlineAvailability}
                />
              </div>
            </div>

            {/* Display general errors */}
            {validationError?.general && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {validationError.general._errors.join(", ")}
              </div>
            )}

            <div className="flex flex-row maxmd:flex-col items-start gap-3 justify-between w-full">
              <div className="gap-y-1 flex-col flex px-2 w-full">
                {/*  Imagen principal del Producto */}
                <Loader loading={isProcessing}>{""}</Loader>
                <div
                  className={`relative aspect-video ${
                    isProcessing ? "opacity-10 " : "hover:opacity-80 "
                  } bg-background border-2 border-gray-300`}
                >
                  {/* X button to remove main image */}
                  {mainImage &&
                    mainImage !==
                      "/images/product-placeholder-minimalist.jpg" && (
                      <button
                        onClick={removeMainImage}
                        className="absolute top-2 right-2 z-30 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
                        type="button"
                      >
                        ×
                      </button>
                    )}

                  <label
                    htmlFor="selectorMain"
                    className={`${
                      isProcessing ? "cursor-not-allowed" : "cursor-pointer"
                    } `}
                  >
                    <Image
                      id="blogImage"
                      alt="blogBanner"
                      src={
                        mainImage ||
                        "/images/product-placeholder-minimalist.jpg"
                      }
                      width={1280}
                      height={1280}
                      className="w-full h-full object-cover z-20"
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
                <div className="flex flex-row gap-2 items-center justify-start w-full">
                  {secondaryImages?.map((image: any, index: number) => (
                    <div
                      key={index}
                      className={`relative aspect-video h-32 w-32 ${
                        isProcessing ? "opacity-10 " : "hover:opacity-80 "
                      } bg-background border-2 border-gray-300`}
                    >
                      {/* X button to remove secondary image */}
                      <button
                        onClick={() => removeSecondaryImage(index)}
                        className="absolute top-1 right-1 z-30 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors text-xs"
                        type="button"
                      >
                        ×
                      </button>

                      <label
                        htmlFor={`selectorSecondary${index}`}
                        className={`${
                          isProcessing ? "cursor-not-allowed" : "cursor-pointer"
                        } `}
                      >
                        <Image
                          src={image.url}
                          width={250}
                          height={250}
                          alt="producto"
                          className="w-full h-full object-cover"
                        />
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
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full flex-col flex justify-start px-2 gap-y-2">
                <div className="mb-1">
                  <label className="block mb-1  font-EB_Garamond">
                    Titulo del Producto
                  </label>
                  <input
                    type="text"
                    className="appearance-none border bg-background rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                    placeholder="Nombre de Producto"
                    value={title || ""}
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
                  <label className="block mb-1  font-EB_Garamond">
                    {" "}
                    Description Corta
                  </label>
                  <textarea
                    rows={2}
                    className="appearance-none border  bg-background rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                    placeholder="Descripción del Producto"
                    value={description || ""}
                    onChange={(e) => setDescription(e.target.value)}
                    name="description"
                  ></textarea>
                  {validationError?.description && (
                    <p className="text-sm text-red-400">
                      {validationError.description._errors.join(", ")}
                    </p>
                  )}
                </div>

                {/* Marca y genero */}
                <div className=" flex flex-col items-center gap-3">
                  <div className="flex  gap-3">
                    <div className="flex w-60 flex-col items-start">
                      <label className="block mb-1 font-EB_Garamond  text-xs">
                        Certificador
                      </label>
                      <div className="mb-1  ">
                        <input
                          type="text"
                          className="appearance-none border bg-card text-card-foreground rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                          placeholder="Cert. ej. PSA"
                          value={brand || ""}
                          onChange={(e) => setBrand(e.target.value)}
                          name="brand"
                        />
                        {validationError?.brand && (
                          <p className="text-sm text-red-400">
                            {validationError.brand._errors.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex w-20 flex-col items-start">
                      <label className="block mb-1 font-EB_Garamond  text-xs">
                        Grado
                      </label>
                      <div className="mb-1  w-full">
                        <input
                          type="number"
                          step="any" // Allows decimal values
                          className="appearance-none border bg-card text-card-foreground rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                          placeholder="Grado ej. 9.5"
                          value={grade || ""}
                          onChange={(e: any) => setGrade(e.target.value)}
                          name="grade"
                          inputMode="decimal" // Enhances mobile keyboard for decimal input
                          style={{
                            MozAppearance: "textfield", // For Firefox
                          }}
                        />
                        {validationError?.grade && (
                          <p className="text-sm text-red-400">
                            {validationError.grade._errors.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Main Variation - Removed size and image */}
                    <div className="w-full main-variation flex flex-col items-center">
                      <div className="flex flex-row items-center gap-3 w-full">
                        <div className="mb-4 w-full">
                          <label className="block mb-1 font-EB_Garamond text-xs">
                            Precio
                          </label>
                          <div className="relative">
                            <div className="col-span-2">
                              <input
                                type="number"
                                className="appearance-none border bg-input rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                                placeholder="0.00"
                                min="1"
                                value={variations?.[0]?.price || ""}
                                onChange={(e) =>
                                  handlePriceChange(0, e.target.value)
                                }
                                name="price"
                              />
                              {validationError?.price && (
                                <p className="text-sm text-red-400">
                                  {validationError.price._errors.join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Peso y Dimensiones para Cálculo de Envío */}
                      <div className="mb-4 border-t pt-4">
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
                              name="weight"
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
                              name="length"
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
                              name="width"
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
                              name="height"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Defaults: 0.5 kg, 15×15×10 cm
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Changed Gender from dropdown to input */}
                  <div className="mb-1 w-full">
                    <label className="block mb-1 font-EB_Garamond  text-xs">
                      Genero
                    </label>
                    <input
                      type="text"
                      className="appearance-none border bg-card text-card-foreground rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                      placeholder="Ej. Pokémon, NFL, Nascar, etc."
                      value={gender || ""}
                      onChange={(e) => setGender(e.target.value)}
                      name="gender"
                    />
                    {validationError?.gender && (
                      <p className="text-sm text-red-400">
                        {validationError.gender._errors.join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Changed Category from dropdown to input */}
                  <div className="mb-1 w-full">
                    <label className="block mb-1 font-EB_Garamond  text-xs">
                      Categoría
                    </label>
                    <input
                      type="text"
                      className="appearance-none border bg-card text-card-foreground rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                      placeholder="Ej. Tarjetas, Guantes, Balones, etc."
                      value={category || ""}
                      onChange={(e) => setCategory(e.target.value)}
                      name="category"
                    />
                    {validationError?.category && (
                      <p className="text-sm text-red-400">
                        {validationError.category._errors.join(", ")}
                      </p>
                    )}
                  </div>

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
                        name="asin"
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
                </div>
              </div>
            </div>

            {/* Render additional variations - Removed size and image */}
            {variations?.slice(1)?.map(
              (
                variation: {
                  color: string | number | readonly string[] | undefined;
                  price: string | number | readonly string[] | undefined;
                },
                index: number,
              ) => (
                <div
                  key={index + 1}
                  className={`w-full variation-${
                    index + 1
                  } flex maxsm:flex-col items-center`}
                >
                  <div className="relative flex flex-row items-center gap-3 maxsm:gap-1 w-full">
                    <div
                      onClick={() => removeVariation(index + 1)}
                      className="absolute top-0 -left-5 px-1 bg-red-500 text-white rounded-full cursor-pointer z-50 text-xs"
                    >
                      X
                    </div>

                    <div className="flex flex-row items-center gap-3 w-full">
                      <div className="mb-4 w-full">
                        <label className="block mb-1 font-EB_Garamond text-xs">
                          Precio
                        </label>
                        <div className="relative">
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
                  </div>
                </div>
              ),
            )}

            <button
              disabled={isSending || isProcessing}
              onClick={hanldeFormSubmit}
              className={`${
                isSending ? "cursor-wait" : ""
              } my-2 cursor-pointer px-4 py-2 text-center inline-block text-white bg-black border border-transparent rounded-xl hover:bg-slate-800 w-full disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSending ? "Actualizando..." : "Actualizar"}
            </button>
          </section>
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
