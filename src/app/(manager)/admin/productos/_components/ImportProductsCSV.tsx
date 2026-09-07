"use client";
import React, { useCallback, useState } from "react";
import Papa from "papaparse";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  FaCheckCircle,
  FaFileUpload,
  FaCloudUploadAlt,
  FaImages,
  FaToggleOn,
  FaToggleOff,
} from "react-icons/fa";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CsvProduct {
  asin: string;
  title: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  linea: string;
  gender: string;
  brand: string;
  images: string;
  mainCategory: string;
  subCategory: string;
  attributes: string;
}

interface ImportResult {
  rowIndex: number;
  asin: string;
  title: string;
  status: "success" | "error" | "pending" | "skipped";
  message: string;
  productId?: string;
  imagesUploaded?: number;
  totalImages?: number;
  isActive?: boolean;
}

interface PreviewItem {
  rowIndex: number;
  asin: string;
  title: string;
  totalImages: number;
  exists: boolean;
  existingId?: string;
  existingTitle?: string;
  existingImages?: number; // Number of images in existing product
  alternatives?: Array<{ _id: string; title: string }>;
  selected?: boolean; // New: track if user selected this row for import
}

// ── Column aliases ─────────────────────────────────────────────────────────────
const COL_MAP: Record<string, keyof CsvProduct> = {
  asin: "asin",
  title: "title",
  título: "title",
  description: "description",
  descripción: "description",
  price: "price",
  precio: "price",
  stock: "stock",
  existencia: "stock",
  category: "category",
  categoría: "category",
  linea: "linea",
  línea: "linea",
  gender: "gender",
  género: "gender",
  brand: "brand",
  marca: "brand",
  images: "images",
  imágenes: "images",
  maincategory: "mainCategory",
  "categoría principal": "mainCategory",
  subcategory: "subCategory",
  subcategoría: "subCategory",
  attributes: "attributes",
  atributos: "attributes",
};

function normalizeKey(raw: string): keyof CsvProduct | null {
  return COL_MAP[raw.trim().toLowerCase()] ?? null;
}

// ── Component ──────────────────────────────────────────────────────────────────
const ImportProductsCSV = () => {
  // CSV
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvProduct[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(
    null,
  );
  const [importProgress, setImportProgress] = useState(0);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedAlternatives, setSelectedAlternatives] = useState<
    Record<number, string>
  >({}); // rowIndex -> productId mapping for alternative selections
  const [expandedAlternatives, setExpandedAlternatives] = useState<
    Record<number, boolean>
  >({}); // Track which rows show alternatives
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({}); // Track which rows are selected for import
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>(
    {},
  ); // Track custom search queries per row
  const [searchingRows, setSearchingRows] = useState<Record<number, boolean>>(
    {},
  ); // Track which rows are searching
  const [expandedSearch, setExpandedSearch] = useState<Record<number, boolean>>(
    {},
  ); // Track which rows have search expanded

  // Settings
  const [activateOnline, setActivateOnline] = useState(true);
  const [uploadImages, setUploadImages] = useState(true);
  const [basePath, setBasePath] = useState("");
  const [matchType, setMatchType] = useState<"asin" | "title">("asin");

  // ── CSV parse ──────────────────────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    setParseError(null);
    setImportResults(null);
    setImportProgress(0);
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      encoding: "UTF-8",
      complete: (result) => {
        const raw = result.data as Record<string, string>[];
        if (!raw.length) {
          setParseError("El archivo está vacío o no tiene filas de datos.");
          return;
        }

        const mapped: CsvProduct[] = raw.map((r) => {
          const row: Partial<CsvProduct> = {
            asin: "",
            title: "",
            description: "",
            price: "",
            stock: "",
            category: "",
            linea: "",
            gender: "",
            brand: "",
            images: "",
            mainCategory: "",
            subCategory: "",
            attributes: "",
            images: "",
          };

          for (const [rawKey, val] of Object.entries(r)) {
            const canonical = normalizeKey(rawKey);
            if (canonical) row[canonical] = (val ?? "").trim();
          }

          return row as CsvProduct;
        });

        setRows(mapped);
        toast(`${mapped.length} productos cargados correctamente`);
      },
      error: (err) => setParseError(`Error al leer el archivo: ${err.message}`),
    });
  }, []);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) parseFile(accepted[0]);
    },
    [parseFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "text/plain": [".txt", ".csv"] },
    maxFiles: 1,
  });

  // ── Upload images to Minio ────────────────────────────────────────────────
  const uploadImageToMinio = async (
    imagePath: string,
    productIndex: number,
  ): Promise<string | null> => {
    try {
      // Handle both absolute paths and relative paths
      let normalizedPath: string;

      // If path contains full /mnt/3TB path, extract from cleaned_images onwards
      if (imagePath.includes("/mnt/3TB/")) {
        const match = imagePath.match(/cleaned_images\/(.+)/);
        normalizedPath = match ? match[1] : imagePath;
      } else {
        // Extract from cleaned_images onwards for relative paths
        const match = imagePath.match(/cleaned_images\/.+/);
        normalizedPath = match
          ? match[0].replace("cleaned_images/", "")
          : imagePath;
      }

      // Fetch the image file - send relative path from cleaned_images
      const imageResponse = await fetch(
        `/api/images/${encodeURIComponent(normalizedPath)}`,
      );

      if (!imageResponse.ok) {
        console.warn(`Could not fetch image: ${normalizedPath}`);
        return null;
      }

      const blob = await imageResponse.blob();
      const originalFileName = normalizedPath.split("/").pop() || "image.png";

      // Create unique filename with product index for better organization
      const timestamp = Date.now();
      const fileName = `product_${productIndex}_${timestamp}_${originalFileName}`;

      // Create FormData to send to Minio
      const formData = new FormData();
      formData.append("file", blob, fileName);

      // Upload to Minio via /api/minio
      const minioResponse = await fetch("/api/minio", {
        method: "POST",
        body: formData,
      });

      if (!minioResponse.ok) {
        console.warn(`Minio upload failed for ${fileName}`);
        return null;
      }

      const minioData = await minioResponse.json();
      if (minioData.images && minioData.images.length > 0) {
        return minioData.images[0].url;
      }

      return null;
    } catch (err) {
      console.error("Error uploading image to Minio:", err);
      return null;
    }
  };

  // ── Custom search for better matches ────────────────────────────────────────
  const searchForBetterMatch = async (
    rowIndex: number,
    searchQuery: string,
  ) => {
    if (!searchQuery.trim()) return;

    setSearchingRows({ ...searchingRows, [rowIndex]: true });
    try {
      const response = await fetch(
        `/api/products/search-by-title?title=${encodeURIComponent(searchQuery)}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.found && data.product) {
          // Update preview items with new search results
          setPreviewItems(
            previewItems.map((item) =>
              item.rowIndex === rowIndex
                ? {
                    ...item,
                    exists: true,
                    existingId: data.product._id,
                    existingTitle: data.product.title,
                    alternatives: data.alternatives || [],
                  }
                : item,
            ),
          );
          toast(`✅ Encontrado: ${data.product.title}`);
        } else {
          toast("❌ No se encontraron resultados para esta búsqueda");
        }
      }
    } catch (err) {
      toast("Error al buscar productos");
      console.error("Search error:", err);
    } finally {
      setSearchingRows({ ...searchingRows, [rowIndex]: false });
    }
  };

  // ── Check for existing products and show preview ────────────────────────────
  const showProductPreview = async () => {
    if (!rows.length) {
      toast("No hay productos para previsualizarse");
      return;
    }

    setPreviewLoading(true);
    try {
      const preview: PreviewItem[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const imagePaths = row.images
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);

        // Check if product exists based on selected match type
        let exists = false;
        let existingId: string | undefined;
        let existingTitle: string | undefined;
        let existingImages: number | undefined;
        let alternatives: Array<{ _id: string; title: string }> | undefined;

        // Match by ASIN or Title
        if (matchType === "asin") {
          // Match by ASIN using dedicated search endpoint
          if (row.asin.trim()) {
            try {
              const asinResponse = await fetch(
                `/api/products/search-by-asin?asin=${encodeURIComponent(row.asin)}`,
              );
              if (asinResponse.ok) {
                const asinData = await asinResponse.json();
                if (asinData.found && asinData.product) {
                  exists = true;
                  existingId = asinData.product._id;
                  existingTitle = asinData.product.title;
                  existingImages = asinData.product.images?.length || 0;
                }
              }
            } catch (err) {
              console.warn("Error checking ASIN:", row.asin, err);
            }
          }
        } else if (matchType === "title") {
          // Match by Title using fuzzy search endpoint
          if (row.title.trim()) {
            try {
              const titleResponse = await fetch(
                `/api/products/search-by-title?title=${encodeURIComponent(row.title)}`,
              );
              if (titleResponse.ok) {
                const titleData = await titleResponse.json();
                if (titleData.found && titleData.product) {
                  exists = true;
                  existingId = titleData.product._id;
                  existingTitle = titleData.product.title;
                  existingImages = titleData.product.images?.length || 0;
                  // Store alternatives for user selection
                  if (
                    titleData.alternatives &&
                    titleData.alternatives.length > 0
                  ) {
                    alternatives = titleData.alternatives;
                  }
                }
              }
            } catch (err) {
              console.warn("Error checking Title:", row.title, err);
            }
          }
        }

        preview.push({
          rowIndex: i,
          asin: row.asin,
          title: row.title,
          totalImages: imagePaths.length,
          exists,
          existingId,
          existingTitle,
          existingImages,
          alternatives,
        });
      }

      setPreviewItems(preview);
      setShowPreview(true);
      const existingCount = preview.filter((p) => p.exists).length;
      const newCount = preview.length - existingCount;
      toast(`📋 ${newCount} nuevos · 🔄 ${existingCount} productos existentes`);
    } catch (err) {
      toast("Error al generar la previsualización");
      console.error("Preview error:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // ── Import products ────────────────────────────────────────────────────────
  const importProducts = async () => {
    if (!rows.length) {
      toast("No hay productos para importar");
      return;
    }

    setImporting(true);
    setImportResults([]);
    setImportProgress(0);

    const results: ImportResult[] = [];
    const selectedRowsArray = Object.keys(selectedRows)
      .filter((key) => selectedRows[Number(key)])
      .map(Number);

    // If no rows selected, show all matched products by default
    const rowsToImport =
      selectedRowsArray.length > 0
        ? selectedRowsArray
        : rows.map((_, i) => i).filter((i) => previewItems[i]?.exists);

    if (rowsToImport.length === 0) {
      toast("⚠️ No hay productos seleccionados para importar");
      setImporting(false);
      return;
    }

    for (const i of rowsToImport) {
      const row = rows[i];
      const result: ImportResult = {
        rowIndex: i,
        asin: row.asin,
        title: row.title,
        status: "pending",
        message: "Procesando...",
        imagesUploaded: 0,
        totalImages: 0,
      };

      try {
        // First, check if product already exists based on selected match type
        let existingProduct = null;

        if (matchType === "asin") {
          // Match by ASIN
          if (row.asin.trim()) {
            try {
              const existsResponse = await fetch(
                `/api/products/search-by-asin?asin=${encodeURIComponent(row.asin)}`,
              );
              if (existsResponse.ok) {
                const existsData = await existsResponse.json();
                if (existsData.found && existsData.product) {
                  existingProduct = existsData.product;
                }
              }
            } catch (err) {
              console.warn("Error checking ASIN during import:", err);
            }
          }
        } else if (matchType === "title") {
          // Match by Title using fuzzy search
          if (row.title.trim()) {
            try {
              // Check if user selected an alternative for this row
              const selectedProductId = selectedAlternatives[i];
              if (selectedProductId) {
                // Use user-selected alternative
                try {
                  const selectedResponse = await fetch(
                    `/api/product/${selectedProductId}`,
                  );
                  if (selectedResponse.ok) {
                    const selectedData = await selectedResponse.json();
                    // Extract product from response if wrapped
                    existingProduct = selectedData.product || selectedData;
                  }
                } catch (err) {
                  console.warn("Error fetching selected product:", err);
                }
              } else {
                // Use fuzzy title search
                const existsResponse = await fetch(
                  `/api/products/search-by-title?title=${encodeURIComponent(row.title)}`,
                );
                if (existsResponse.ok) {
                  const existsData = await existsResponse.json();
                  if (existsData.found && existsData.product) {
                    existingProduct = existsData.product;
                  }
                }
              }
            } catch (err) {
              console.warn("Error checking Title during import:", err);
            }
          }
        }

        // If product doesn't exist, skip it (only update existing products)
        if (!existingProduct) {
          result.status = "skipped";
          result.message = `Producto no encontrado - Se requiere una coincidencia válida`;
          results.push(result);
          setImportResults([...results]);
          setImportProgress(
            ((rowsToImport.indexOf(i) + 1) / rowsToImport.length) * 100,
          );
          continue;
        }

        // Ensure product has valid _id
        if (!existingProduct._id) {
          console.error("Product missing _id:", existingProduct);
          result.status = "error";
          result.message = `Producto no tiene ID válido`;
          results.push(result);
          setImportResults([...results]);
          setImportProgress(
            ((rowsToImport.indexOf(i) + 1) / rowsToImport.length) * 100,
          );
          continue;
        }

        // Parse images from comma-separated paths
        let uploadedImages: string[] = [];
        let totalImages = 0;

        if (uploadImages && row.images.trim()) {
          const imagePaths = row.images
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
          totalImages = imagePaths.length;

          for (const imagePath of imagePaths) {
            const uploadedUrl = await uploadImageToMinio(imagePath, i);
            if (uploadedUrl) {
              uploadedImages.push(uploadedUrl);
            }
          }

          result.imagesUploaded = uploadedImages.length;
          result.totalImages = totalImages;
        }

        // Update existing product with new images and taxonomy
        try {
          // Prepare updated images array - replace existing images with new ones
          const updatedImages = uploadedImages.map((url) => ({ url }));

          // Ensure productId is a string
          const productId = String(existingProduct._id);

          // Build update payload with new taxonomy fields
          const updatePayload: any = {
            images: updatedImages,
            active: activateOnline,
            availability: { online: activateOnline },
          };

          // Add new taxonomy fields if provided
          if (row.mainCategory?.trim()) {
            updatePayload.mainCategory = row.mainCategory.trim();
          }
          if (row.subCategory?.trim()) {
            updatePayload.subCategory = row.subCategory.trim();
          }
          if (row.attributes?.trim()) {
            // Support comma-separated attribute IDs
            updatePayload.attributes = row.attributes
              .split(",")
              .map((a) => a.trim())
              .filter(Boolean);
          }

          // Use direct MongoDB update via a simple fetch to update the product
          const updateResponse = await fetch(`/api/product/${productId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatePayload),
          });

          if (!updateResponse.ok) {
            const error = await updateResponse.json();
            result.status = "error";
            result.message = error.message || "Error al actualizar producto";
          } else {
            result.status = "success";
            result.productId = existingProduct._id;
            result.message = `Producto actualizado ${uploadedImages.length > 0 ? `con ${uploadedImages.length} imagen(es)` : "sin cambios"}`;
            result.isActive = activateOnline;
          }
        } catch (fetchErr) {
          result.status = "error";
          result.message =
            fetchErr instanceof Error
              ? fetchErr.message
              : "Error actualizando producto";
        }
      } catch (err) {
        result.status = "error";
        result.message =
          err instanceof Error ? err.message : "Error desconocido";
      }

      results.push(result);
      setImportResults([...results]);
      setImportProgress(
        ((rowsToImport.indexOf(i) + 1) / rowsToImport.length) * 100,
      );
    }

    setImporting(false);
    const successCount = results.filter((r) => r.status === "success").length;
    const errorCount = results.filter((r) => r.status === "error").length;
    toast(`✅ ${successCount} importados · ❌ ${errorCount} errores`);
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const successCount =
    importResults?.filter((r) => r.status === "success").length ?? 0;
  const errorCount =
    importResults?.filter((r) => r.status === "error").length ?? 0;
  const totalProcessed = importResults?.length ?? 0;

  return (
    <div className="p-5 maxsm:p-2 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold font-EB_Garamond mb-1">
        Importar Productos desde CSV
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Sube un archivo CSV con columnas:{" "}
        <code className="text-xs bg-muted px-1 rounded">
          ASIN · Title · Description · Price · Stock · Category · Linea · Gender
          · Brand · Images
        </code>
        . Las imágenes se subirán automáticamente a Minio.
      </p>

      {/* ── Settings ───────────────────────────────────────────────────── */}
      <div className="mb-6 p-4 rounded-xl border bg-muted/30">
        {/* Base Path Input */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-foreground block mb-2">
            📂 Ruta Base de Imágenes (Opcional)
          </label>
          <input
            type="text"
            value={basePath}
            onChange={(e) => setBasePath(e.target.value)}
            placeholder="Ejemplo: 2026/Junio/CARROS"
            className="w-full px-3 py-2 rounded-lg border border-muted-foreground/20 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Ruta adicional que se antepone a los archivos CSV. Útil si las
            imágenes están en subdirectorios específicos.
          </p>
        </div>

        {/* Match Type Selector */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-foreground block mb-2">
            🔍 Coincidir productos por:
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="matchType"
                value="asin"
                checked={matchType === "asin"}
                onChange={(e) =>
                  setMatchType(e.target.value as "asin" | "title")
                }
                className="cursor-pointer"
              />
              <span className="text-sm">ASIN</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="matchType"
                value="title"
                checked={matchType === "title"}
                onChange={(e) =>
                  setMatchType(e.target.value as "asin" | "title")
                }
                className="cursor-pointer"
              />
              <span className="text-sm">Título del Producto</span>
            </label>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-4">
          {/* Upload Images Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setUploadImages(!uploadImages)}
              className="focus:outline-none"
            >
              {uploadImages ? (
                <FaToggleOn size={28} className="text-green-500" />
              ) : (
                <FaToggleOff size={28} className="text-muted-foreground" />
              )}
            </button>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Subir imágenes a Minio
              </p>
              <p className="text-xs text-muted-foreground">
                {uploadImages ? "Activo - Las imágenes se subirán" : "Inactivo"}
              </p>
            </div>
          </div>

          {/* Activate Online Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActivateOnline(!activateOnline)}
              className="focus:outline-none"
            >
              {activateOnline ? (
                <FaToggleOn size={28} className="text-green-500" />
              ) : (
                <FaToggleOff size={28} className="text-muted-foreground" />
              )}
            </button>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Activar en línea
              </p>
              <p className="text-xs text-muted-foreground">
                {activateOnline
                  ? "Los productos estarán disponibles en la tienda"
                  : "Inactivos"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Drop zone ───────────────────────────────────────────────────── */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-5 ${
          isDragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
            : "border-gray-300 hover:border-blue-400 hover:bg-muted/20"
        }`}
      >
        <input {...getInputProps()} />
        <FaFileUpload className="mx-auto text-3xl text-muted-foreground mb-2" />
        {fileName ? (
          <p className="font-medium">
            📄 {fileName}{" "}
            <span className="text-muted-foreground text-sm">
              — {rows.length} productos
            </span>
          </p>
        ) : (
          <p className="text-muted-foreground">
            Arrastra tu archivo CSV aquí, o{" "}
            <span className="text-blue-500 underline">
              haz clic para seleccionar
            </span>
          </p>
        )}
      </div>

      {parseError && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {parseError}
        </div>
      )}

      {/* ── Import Button / Preview Button ────────────────────────────── */}
      {rows.length > 0 && !importResults && !showPreview && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={showProductPreview}
            disabled={previewLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-muted text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            {previewLoading ? "Verificando..." : "📋 Ver Previsualización"}
          </button>
        </div>
      )}

      {/* ── Preview Table ──────────────────────────────────────────────── */}
      {showPreview && !importResults && (
        <div className="mb-6 p-4 rounded-lg border bg-muted/30">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              📋 Previsualización de Importación
            </h3>
            <button
              onClick={() => setShowPreview(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ✕ Cerrar
            </button>
          </div>

          {/* Preview Stats */}
          {previewItems.length > 0 && (
            <div className="flex gap-4 mb-4 p-3 rounded-lg bg-background/50">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Productos con Coincidencia
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {previewItems.filter((p) => p.exists).length}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Seleccionados para Importar
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {Object.values(selectedRows).filter(Boolean).length ||
                    previewItems.filter((p) => p.exists).length}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Sin Coincidencia
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {previewItems.filter((p) => !p.exists).length}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Total de Imágenes
                </p>
                <p className="text-2xl font-bold">
                  {previewItems.reduce((sum, p) => sum + p.totalImages, 0)}
                </p>
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={
                        previewItems.length > 0 &&
                        previewItems.every((p) => selectedRows[p.rowIndex])
                      }
                      onChange={(e) => {
                        const newSelected: Record<number, boolean> = {};
                        if (e.target.checked) {
                          previewItems.forEach((p) => {
                            newSelected[p.rowIndex] = true;
                          });
                        }
                        setSelectedRows(newSelected);
                      }}
                      title="Seleccionar todos"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">ASIN</th>
                  <th className="px-4 py-3 text-left">Producto</th>
                  <th className="px-4 py-3 text-center">Imágenes</th>
                  <th className="px-4 py-3 text-center">Imágenes Existentes</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-left">Nota</th>
                </tr>
              </thead>
              <tbody>
                {previewItems.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <tr
                      className={`border-t ${
                        item.exists ? "bg-yellow-50 dark:bg-yellow-950/20" : ""
                      } hover:bg-muted/20`}
                    >
                      <td className="px-4 py-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={selectedRows[item.rowIndex] || false}
                          onChange={(e) =>
                            setSelectedRows({
                              ...selectedRows,
                              [item.rowIndex]: e.target.checked,
                            })
                          }
                          disabled={!item.exists}
                          title={!item.exists ? "No hay coincidencia" : ""}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {item.asin || "—"}
                      </td>
                      <td className="px-4 py-3 font-medium  max-w-xs">
                        {item.title}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                          <FaImages size={12} />
                          {item.totalImages}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.exists ? (
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                              (item.existingImages ?? 0) > 0
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            <FaImages size={12} />
                            {item.existingImages ?? 0}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.exists ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-1 rounded">
                            🔄 Existente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded">
                            ✨ Nuevo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between gap-1">
                          <span>
                            {item.exists && item.existingTitle
                              ? `Coincide con: ${item.existingTitle}`
                              : "No hay coincidencia"}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                setExpandedSearch({
                                  ...expandedSearch,
                                  [item.rowIndex]:
                                    !expandedSearch[item.rowIndex],
                                })
                              }
                              className="text-green-600 hover:text-green-700 text-xs whitespace-nowrap font-medium"
                              title="Buscar un producto diferente"
                            >
                              🔍
                            </button>
                            {(item.alternatives &&
                              item.alternatives.length > 0) ||
                            item.exists ? (
                              <button
                                onClick={() =>
                                  setExpandedAlternatives({
                                    ...expandedAlternatives,
                                    [item.rowIndex]:
                                      !expandedAlternatives[item.rowIndex],
                                  })
                                }
                                className="text-blue-600 hover:text-blue-700 text-xs whitespace-nowrap font-medium"
                              >
                                {expandedAlternatives[item.rowIndex]
                                  ? "▼"
                                  : "▶"}{" "}
                                {(item.alternatives?.length || 0) +
                                  (item.exists ? 1 : 0)}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {/* Individual search row */}
                    {expandedSearch[item.rowIndex] && (
                      <tr className="border-t bg-green-50 dark:bg-green-950/10">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="text-xs space-y-2">
                            <p className="font-semibold text-muted-foreground">
                              🔍 Buscar un producto diferente para esta fila:
                            </p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Escribe el nombre del producto a buscar..."
                                value={searchQueries[item.rowIndex] || ""}
                                onChange={(e) =>
                                  setSearchQueries({
                                    ...searchQueries,
                                    [item.rowIndex]: e.target.value,
                                  })
                                }
                                className="flex-1 px-3 py-2 rounded border border-muted-foreground/30 text-xs"
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Enter" &&
                                    searchQueries[item.rowIndex]
                                  ) {
                                    searchForBetterMatch(
                                      item.rowIndex,
                                      searchQueries[item.rowIndex],
                                    );
                                  }
                                }}
                              />
                              <button
                                onClick={() =>
                                  searchForBetterMatch(
                                    item.rowIndex,
                                    searchQueries[item.rowIndex] || "",
                                  )
                                }
                                disabled={
                                  searchingRows[item.rowIndex] ||
                                  !searchQueries[item.rowIndex]
                                }
                                className="bg-green-600 hover:bg-green-700 disabled:bg-muted text-white px-4 py-2 rounded text-xs font-medium transition-colors"
                              >
                                {searchingRows[item.rowIndex]
                                  ? "Buscando..."
                                  : "Buscar"}
                              </button>
                              <button
                                onClick={() =>
                                  setExpandedSearch({
                                    ...expandedSearch,
                                    [item.rowIndex]: false,
                                  })
                                }
                                className="bg-muted hover:bg-muted/80 text-foreground px-3 py-2 rounded text-xs font-medium transition-colors"
                              >
                                ✕ Cerrar
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {expandedAlternatives[item.rowIndex] &&
                      item.alternatives &&
                      item.alternatives.length > 0 && (
                        <tr className="border-t bg-blue-50 dark:bg-blue-950/10">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="text-xs space-y-3">
                              {/* Primary match */}
                              <div className="p-2 rounded bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`alternative-${item.rowIndex}`}
                                    value={item.existingId || ""}
                                    checked={
                                      selectedAlternatives[item.rowIndex] ===
                                      item.existingId
                                    }
                                    onChange={() => {
                                      if (item.existingId) {
                                        setSelectedAlternatives({
                                          ...selectedAlternatives,
                                          [item.rowIndex]: item.existingId,
                                        });
                                      }
                                    }}
                                  />
                                  <span className="font-semibold text-blue-700 dark:text-blue-300 flex-1">
                                    ✓ {item.existingTitle} (Mejor coincidencia)
                                  </span>
                                </label>
                              </div>

                              {/* Alternative matches */}
                              <div className="space-y-1">
                                <p className="font-semibold text-muted-foreground">
                                  Otras opciones:
                                </p>
                                {item.alternatives.map((alt) => (
                                  <label
                                    key={alt._id}
                                    className="flex items-center gap-2 p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 cursor-pointer"
                                  >
                                    <input
                                      type="radio"
                                      name={`alternative-${item.rowIndex}`}
                                      value={alt._id}
                                      checked={
                                        selectedAlternatives[item.rowIndex] ===
                                        alt._id
                                      }
                                      onChange={(e) =>
                                        setSelectedAlternatives({
                                          ...selectedAlternatives,
                                          [item.rowIndex]: e.target.value,
                                        })
                                      }
                                    />
                                    <span className="flex-1">{alt.title}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={importProducts}
              disabled={importing}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-muted text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              <FaCloudUploadAlt size={16} />
              {importing ? "Importando..." : "✅ Proceder a Importar"}
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              ← Volver
            </button>
          </div>
        </div>
      )}

      {/* ── Progress Bar ────────────────────────────────────────────────── */}
      {importing && (
        <div className="mb-6 p-4 rounded-lg border bg-muted/30">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold">
              Progreso: {Math.round(importProgress)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {totalProcessed} de {rows.length}
            </p>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Results Summary ────────────────────────────────────────────── */}
      {importResults && (
        <div className="p-4 rounded-lg border bg-muted/30 mb-6">
          <div className="flex gap-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Exitosos
              </p>
              <p className="text-2xl font-bold text-green-600">
                {successCount}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Errores
              </p>
              <p className="text-2xl font-bold text-red-600">{errorCount}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Total
              </p>
              <p className="text-2xl font-bold">{totalProcessed}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Results Table ──────────────────────────────────────────────── */}
      {importResults && importResults.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 text-left">ASIN</th>
                <th className="px-4 py-3 text-left">Producto</th>
                <th className="px-4 py-3 text-center">Imágenes</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-left">Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {importResults.map((result, idx) => (
                <tr
                  key={idx}
                  className="border-t border-muted hover:bg-muted/20"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    {result.asin || "—"}
                  </td>
                  <td className="px-4 py-3 font-medium truncate">
                    {result.title}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {result.imagesUploaded !== undefined ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                        <FaImages size={12} />
                        {result.imagesUploaded}/{result.totalImages}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {result.status === "success" && (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded">
                        <FaCheckCircle size={12} />
                        Éxito
                      </span>
                    )}
                    {result.status === "error" && (
                      <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded">
                        ✕ Error
                      </span>
                    )}
                    {result.status === "skipped" && (
                      <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-1 rounded">
                        ⊘ Omitido
                      </span>
                    )}
                    {result.status === "pending" && (
                      <span className="text-xs text-muted-foreground animate-pulse">
                        Procesando…
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {result.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ImportProductsCSV;
