/**
 * Excel Generation Utility for TikTok Shop Template
 * Creates Excel files using the xlsx library
 */

import * as XLSX from "xlsx";
import { TikTokProductRow } from "@/types/tiktok";

/**
 * Column headers in exact order as required by TikTok Shop template
 */
const TIKTOK_HEADERS = [
  "Categoría",
  "Marca",
  "Nombre del producto",
  "Descripción del producto",
  "Imagen principal del producto",
  "Imagen del producto 2",
  "Imagen del producto 3",
  "Imagen del producto 4",
  "Imagen del producto 5",
  "Imagen del producto 6",
  "Imagen del producto 7",
  "Imagen del producto 8",
  "Imagen del producto 9",
  "Tipo de código identificador",
  "Código identificador",
  "Nombre de la variación principal",
  "Valor de la variación principal",
  "Imagen de variación principal 1",
  "Nombre de la variación secundaria",
  "Valor de la variación secundaria",
  "Peso del paquete(g)",
  "Longitud del paquete(cm)",
  "Ancho del paquete(cm)",
  "Altura del paquete(cm)",
  "Opciones de entrega",
  "Precio al por menor (moneda local)",
  "Cantidad",
  "SKU de vendedor",
  "Cantidad mínima de ventas",
  "Tabla de tallas",
  "Tipo de garantía",
  "País de origen",
  "Cantidad por paquete",
  "Duración de la garantía",
  "Fabricantes",
  "Productos importados",
  "Manual de usuario",
  "Política de garantía",
];

/**
 * Generates an Excel file from TikTok product rows
 * @param rows - Array of TikTok product rows
 * @param fileName - Name for the Excel file (without extension)
 * @returns Buffer containing the Excel file
 */
export function generateTikTokExcel(
  rows: TikTokProductRow[],
  fileName: string = "tiktok-products"
): Buffer {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Convert rows to array format matching header order
  const dataRows = rows.map((row) => [
    row["Categoría"],
    row.Marca,
    row["Nombre del producto"],
    row["Descripción del producto"],
    row["Imagen principal del producto"],
    row["Imagen del producto 2"],
    row["Imagen del producto 3"],
    row["Imagen del producto 4"],
    row["Imagen del producto 5"],
    row["Imagen del producto 6"],
    row["Imagen del producto 7"],
    row["Imagen del producto 8"],
    row["Imagen del producto 9"],
    row["Tipo de código identificador"],
    row["Código identificador"],
    row["Nombre de la variación principal"],
    row["Valor de la variación principal"],
    row["Imagen de variación principal 1"],
    row["Nombre de la variación secundaria"],
    row["Valor de la variación secundaria"],
    row["Peso del paquete(g)"],
    row["Longitud del paquete(cm)"],
    row["Ancho del paquete(cm)"],
    row["Altura del paquete(cm)"],
    row["Opciones de entrega"],
    row["Precio al por menor (moneda local)"],
    row.Cantidad,
    row["SKU de vendedor"],
    row["Cantidad mínima de ventas"],
    row["Tabla de tallas"],
    row["Tipo de garantía"],
    row["País de origen"],
    row["Cantidad por paquete"],
    row["Duración de la garantía"],
    row.Fabricantes,
    row["Productos importados"],
    row["Manual de usuario"],
    row["Política de garantía"],
  ]);

  // Combine headers and data
  const worksheetData = [TIKTOK_HEADERS, ...dataRows];

  // Create worksheet from array
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths for better readability
  const columnWidths = [
    { wch: 20 }, // Categoría
    { wch: 15 }, // Marca
    { wch: 40 }, // Nombre del producto
    { wch: 60 }, // Descripción del producto
    { wch: 50 }, // Imagen principal
    { wch: 50 }, // Imagen 2
    { wch: 50 }, // Imagen 3
    { wch: 50 }, // Imagen 4
    { wch: 50 }, // Imagen 5
    { wch: 50 }, // Imagen 6
    { wch: 50 }, // Imagen 7
    { wch: 50 }, // Imagen 8
    { wch: 50 }, // Imagen 9
    { wch: 20 }, // Tipo código
    { wch: 20 }, // Código identificador
    { wch: 25 }, // Nombre variación principal
    { wch: 20 }, // Valor variación principal
    { wch: 50 }, // Imagen variación
    { wch: 25 }, // Nombre variación secundaria
    { wch: 20 }, // Valor variación secundaria
    { wch: 15 }, // Peso
    { wch: 15 }, // Longitud
    { wch: 15 }, // Ancho
    { wch: 15 }, // Altura
    { wch: 20 }, // Opciones entrega
    { wch: 15 }, // Precio
    { wch: 10 }, // Cantidad
    { wch: 20 }, // SKU vendedor
    { wch: 15 }, // Cantidad mínima
    { wch: 30 }, // Tabla tallas
    { wch: 20 }, // Tipo de garantía
    { wch: 15 }, // País de origen
    { wch: 15 }, // Cantidad por paquete
    { wch: 20 }, // Duración de la garantía
    { wch: 25 }, // Fabricantes
    { wch: 15 }, // Productos importados
    { wch: 30 }, // Manual de usuario
    { wch: 30 }, // Política de garantía
  ];

  worksheet["!cols"] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Productos TikTok");

  // Generate buffer
  const excelBuffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return excelBuffer;
}

/**
 * Generates an Excel file and returns as base64 string
 * Useful for client-side downloads
 */
export function generateTikTokExcelBase64(
  rows: TikTokProductRow[],
  fileName: string = "tiktok-products"
): string {
  const buffer = generateTikTokExcel(rows, fileName);
  return buffer.toString("base64");
}

/**
 * Validates TikTok product rows before generating Excel
 * Returns array of validation errors
 */
export function validateTikTokRows(rows: TikTokProductRow[]): string[] {
  const errors: string[] = [];

  if (!rows || rows.length === 0) {
    errors.push("No hay productos para exportar");
    return errors;
  }

  rows.forEach((row, index) => {
    const rowNum = index + 1;

    // Required fields validation
    if (!row["Nombre del producto"]?.trim()) {
      errors.push(`Fila ${rowNum}: Nombre del producto es requerido`);
    }

    if (!row["Categoría"]?.trim()) {
      errors.push(`Fila ${rowNum}: Categoría es requerida`);
    }

    if (!row["Imagen principal del producto"]?.trim()) {
      errors.push(`Fila ${rowNum}: Imagen principal es requerida`);
    }

    if (!row["Precio al por menor (moneda local)"]?.trim()) {
      errors.push(`Fila ${rowNum}: Precio es requerido`);
    }

    // Validate price is a number
    const price = parseFloat(row["Precio al por menor (moneda local)"]);
    if (isNaN(price) || price <= 0) {
      errors.push(`Fila ${rowNum}: Precio debe ser un número mayor a 0`);
    }

    // Validate quantity is a number
    const quantity = parseInt(row.Cantidad);
    if (isNaN(quantity) || quantity < 0) {
      errors.push(
        `Fila ${rowNum}: Cantidad debe ser un número mayor o igual a 0`
      );
    }
  });

  return errors;
}
