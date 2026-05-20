/**
 * Product to TikTok Template Mapper
 * Maps internal product schema to TikTok Shop template format
 */

import {
  ProductForExport,
  TikTokProductRow,
  AIOptimizedContent,
} from "@/types/tiktok";

/**
 * Maps a product to TikTok template format
 * Handles variations and creates multiple rows if needed
 */
export function mapProductToTikTok(
  product: ProductForExport,
  optimizedContent?: AIOptimizedContent
): TikTokProductRow[] {
  const rows: TikTokProductRow[] = [];

  // Determine if product has variations
  const hasVariations = product.variations && product.variations.length > 0;

  if (hasVariations) {
    // Create a row for each variation
    product.variations.forEach((variation, index) => {
      rows.push(createTikTokRow(product, optimizedContent, variation, index));
    });
  } else {
    // Create a single row for the product
    rows.push(createTikTokRow(product, optimizedContent));
  }

  return rows;
}

/**
 * Creates a single TikTok row
 */
function createTikTokRow(
  product: ProductForExport,
  optimizedContent?: AIOptimizedContent,
  variation?: ProductForExport["variations"][0],
  variationIndex?: number
): TikTokProductRow {
  // Use optimized content if available, otherwise use original
  const title = optimizedContent?.optimizedTitle || product.title;
  const description =
    optimizedContent?.optimizedDescription || product.description || "";

  // Map up to 9 images
  const images = product.images.slice(0, 9);

  // Determine variation details
  const hasColor = variation?.color;
  const hasSize = variation?.size;

  let primaryVariationName = "";
  let primaryVariationValue = "";
  let secondaryVariationName = "";
  let secondaryVariationValue = "";

  if (hasColor && hasSize) {
    primaryVariationName = "Color";
    primaryVariationValue = variation.color || "";
    secondaryVariationName = "Talla";
    secondaryVariationValue = variation.size || "";
  } else if (hasColor) {
    primaryVariationName = "Color";
    primaryVariationValue = variation.color || "";
  } else if (hasSize) {
    primaryVariationName = "Talla";
    primaryVariationValue = variation.size || "";
  }

  // Get variation image or use main product image
  const variationImage = variation?.image || images[0]?.url || "";

  // Calculate price
  const price = variation?.price || product.price || 0;

  // Calculate stock
  const stock = variation?.stock || product.stock || 0;

  // Generate SKU
  const sku = generateSKU(product, variation, variationIndex);

  // Default package dimensions (you may want to add these to your product schema)
  const packageWeight = "100"; // grams
  const packageLength = "10"; // cm
  const packageWidth = "10"; // cm
  const packageHeight = "5"; // cm

  // Default warranty and other info
  const warrantyType = "Garantía del vendedor"; // Tipo de garantía
  const countryOfOrigin = "México"; // País de origen
  const quantityPerPackage = "1"; // Cantidad por paquete
  const warrantyDuration = "30 días"; // Duración de la garantía
  const manufacturer = product.brand || ""; // Fabricantes
  const importedProduct = "No"; // Productos importados
  const userManual = ""; // Manual de usuario (URL si existe)
  const warrantyPolicy = ""; // Política de garantía (URL si existe)

  return {
    Categoría: product.category || "General",
    Marca: product.brand || "",
    "Nombre del producto": title,
    "Descripción del producto": description,
    "Imagen principal del producto": images[0]?.url || "",
    "Imagen del producto 2": images[1]?.url || "",
    "Imagen del producto 3": images[2]?.url || "",
    "Imagen del producto 4": images[3]?.url || "",
    "Imagen del producto 5": images[4]?.url || "",
    "Imagen del producto 6": images[5]?.url || "",
    "Imagen del producto 7": images[6]?.url || "",
    "Imagen del producto 8": images[7]?.url || "",
    "Imagen del producto 9": images[8]?.url || "",
    "Tipo de código identificador": "SKU", // or "UPC", "EAN", "ISBN"
    "Código identificador": sku,
    "Nombre de la variación principal": primaryVariationName,
    "Valor de la variación principal": primaryVariationValue,
    "Imagen de variación principal 1": variationImage,
    "Nombre de la variación secundaria": secondaryVariationName,
    "Valor de la variación secundaria": secondaryVariationValue,
    "Peso del paquete(g)": packageWeight,
    "Longitud del paquete(cm)": packageLength,
    "Ancho del paquete(cm)": packageWidth,
    "Altura del paquete(cm)": packageHeight,
    "Opciones de entrega": "Estándar", // or "Exprés", "Económico"
    "Precio al por menor (moneda local)": price.toString(),
    Cantidad: stock.toString(),
    "SKU de vendedor": sku,
    "Cantidad mínima de ventas": "1",
    "Tabla de tallas": "", // Optional: link to size chart
    "Tipo de garantía": warrantyType,
    "País de origen": countryOfOrigin,
    "Cantidad por paquete": quantityPerPackage,
    "Duración de la garantía": warrantyDuration,
    Fabricantes: manufacturer,
    "Productos importados": importedProduct,
    "Manual de usuario": userManual,
    "Política de garantía": warrantyPolicy,
  };
}

/**
 * Generates a unique SKU for the product/variation
 */
function generateSKU(
  product: ProductForExport,
  variation?: ProductForExport["variations"][0],
  index?: number
): string {
  let sku = product.slug
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 10);

  if (variation) {
    if (variation.color) {
      sku += `-${variation.color.substring(0, 3).toUpperCase()}`;
    }
    if (variation.size) {
      sku += `-${variation.size.toUpperCase()}`;
    }
    if (typeof index === "number") {
      sku += `-V${index + 1}`;
    }
  }

  return sku;
}

/**
 * Batch map multiple products to TikTok format
 */
export function mapProductsBatchToTikTok(
  products: ProductForExport[],
  optimizedContents?: AIOptimizedContent[]
): TikTokProductRow[] {
  const allRows: TikTokProductRow[] = [];

  products.forEach((product, index) => {
    const optimizedContent = optimizedContents?.[index];
    const productRows = mapProductToTikTok(product, optimizedContent);
    allRows.push(...productRows);
  });

  return allRows;
}
