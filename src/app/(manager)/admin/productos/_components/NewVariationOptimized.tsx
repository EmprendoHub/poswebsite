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
import { MdQrCodeScanner } from "react-icons/md";

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
    length: 15,
    width: 15,
    height: 10,
  });
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [asin, setAsin] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [createdAt, setCreatedAt] = useState(
    cstDateTimeClient().toLocaleString(),
  );
  const [validationError, setValidationError] =
    useState<ValidationError | null>(null);
  const [mainImage, setMainImage] = useState(
    "/images/product-placeholder-minimalist.jpg",
  );
  const [secondaryImages, setSecondaryImages] = useState<{ url: string }[]>([]);

  // Inventory section
  const [stores, setStores] = useState<{ _id: string; name: string }[]>([]);
  const [inventoryStoreId, setInventoryStoreId] = useState("");
  const [initialCost, setInitialCost] = useState<number | "">("");
  const [initialStock, setInitialStock] = useState<number | "">("");

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStores(data);
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
                console.log("file, url", file, url);
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

  // *******main images**********  //
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
    formData.append("brand", brand);
    formData.append("grade", grade.toString());
    formData.append("gender", gender);
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
      if (response.status === 409) {
        setValidationError({
          response: { _errors: ["Este Titulo de producto ya esta en uso"] },
        });
      }
      setIsSending(false);
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
                  label="WWW"
                  enabled={onlineAvailability}
                  setEnabled={setOnlineAvailability}
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
                {/* Secondary images */}
                <div className="flex flex-row gap-2 items-center justify-start w-full mt-2">
                  {secondaryImages.map((image, index) => (
                    <div
                      key={index}
                      className="relative aspect-video h-32 w-32 hover:opacity-80 bg-background border-2 border-gray-300"
                    >
                      <label
                        htmlFor={`selectorSecondary${index}`}
                        className="cursor-pointer"
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
                      <input
                        type="text"
                        className="appearance-none border bg-card text-card-foreground rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                        placeholder="Cert. ej. PSA"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                      />
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
                      Defaults: 0.5 kg, 15×15×10 cm
                    </p>
                  </div>

                  {/* Gender */}
                  <div className="mb-1 w-full">
                    <label className="block mb-1 font-EB_Garamond text-xs">
                      Género
                    </label>
                    <input
                      type="text"
                      className="appearance-none border bg-card text-card-foreground rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                      placeholder="Ej. Pokémon, NFL, Nascar, etc."
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    />
                  </div>

                  {/* Category */}
                  <div className="mb-1 w-full">
                    <label className="block mb-1 font-EB_Garamond text-xs">
                      Categoría
                    </label>
                    <input
                      type="text"
                      className="appearance-none border bg-card text-card-foreground rounded-xl py-2 px-3 border-gray-300 focus:outline-none focus:border-gray-400 w-full"
                      placeholder="Ej. Tarjetas, Guantes, Balones, etc."
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
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
    </main>
  );
};

export default NewVariationOptimized;
