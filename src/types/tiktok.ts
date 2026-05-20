/**
 * TikTok Shop Product Export Types
 * These types represent the TikTok Shop template structure
 */

export interface TikTokProductRow {
  // Column 1
  Categoría: string;
  // Column 2
  Marca: string;
  // Column 3
  "Nombre del producto": string;
  // Column 4
  "Descripción del producto": string;
  // Column 5
  "Imagen principal del producto": string;
  // Column 6
  "Imagen del producto 2": string;
  // Column 7
  "Imagen del producto 3": string;
  // Column 8
  "Imagen del producto 4": string;
  // Column 9
  "Imagen del producto 5": string;
  // Column 10
  "Imagen del producto 6": string;
  // Column 11
  "Imagen del producto 7": string;
  // Column 12
  "Imagen del producto 8": string;
  // Column 13
  "Imagen del producto 9": string;
  // Column 14
  "Tipo de código identificador": string;
  // Column 15
  "Código identificador": string;
  // Column 16
  "Nombre de la variación principal": string;
  // Column 17
  "Valor de la variación principal": string;
  // Column 18
  "Imagen de variación principal 1": string;
  // Column 19
  "Nombre de la variación secundaria": string;
  // Column 20
  "Valor de la variación secundaria": string;
  // Column 21
  "Peso del paquete(g)": string;
  // Column 22
  "Longitud del paquete(cm)": string;
  // Column 23
  "Ancho del paquete(cm)": string;
  // Column 24
  "Altura del paquete(cm)": string;
  // Column 25
  "Opciones de entrega": string;
  // Column 26
  "Precio al por menor (moneda local)": string;
  // Column 27
  Cantidad: string;
  // Column 28
  "SKU de vendedor": string;
  // Column 29
  "Cantidad mínima de ventas": string;
  // Column 30
  "Tabla de tallas": string;
  // Column 31
  "Tipo de garantía": string;
  // Column 32
  "País de origen": string;
  // Column 33
  "Cantidad por paquete": string;
  // Column 34
  "Duración de la garantía": string;
  // Column 35
  Fabricantes: string;
  // Column 36
  "Productos importados": string;
  // Column 37
  "Manual de usuario": string;
  // Column 38
  "Política de garantía": string;
}

export interface AIOptimizedContent {
  optimizedTitle: string;
  optimizedDescription: string;
}

export interface ProductForExport {
  _id: string;
  title: string;
  description: string;
  images: Array<{ url: string; color?: string }>;
  category: string;
  brand?: string;
  linea?: string;
  modelo?: string;
  variations: Array<{
    title?: string;
    stock: number;
    color?: string;
    size?: string;
    price: number;
    cost?: number;
    image?: string;
  }>;
  stock: number;
  price: number;
  slug: string;
  gender?: string;
}

export interface ExportTikTokResult {
  success: boolean;
  fileName?: string;
  fileData?: string; // base64 encoded
  error?: string;
  productsProcessed?: number;
}
