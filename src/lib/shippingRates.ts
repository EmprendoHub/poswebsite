// Sistema de tarifas de envío basadas en peso y dimensiones
// Tarifas predeterminadas para México

export interface ShippingRate {
  maxWeight: number; // en kg
  maxDimensions: {
    length: number; // en cm
    width: number; // en cm
    height: number; // en cm
  };
  price: number; // en MXN
  label: string;
}

export const SHIPPING_RATES: ShippingRate[] = [
  {
    maxWeight: 1,
    maxDimensions: { length: 30, width: 25, height: 15 },
    price: 199,
    label: "1 kg - 30 × 25 × 15 cm",
  },
  {
    maxWeight: 2,
    maxDimensions: { length: 40, width: 30, height: 15 },
    price: 270,
    label: "2 kg - 40 × 30 × 15 cm",
  },
  {
    maxWeight: 5,
    maxDimensions: { length: 50, width: 40, height: 20 },
    price: 500,
    label: "5 kg - 50 × 40 × 20 cm",
  },
  {
    maxWeight: 10,
    maxDimensions: { length: 60, width: 50, height: 30 },
    price: 500,
    label: "10 kg - 60 × 50 × 30 cm",
  },
  {
    maxWeight: 15,
    maxDimensions: { length: 70, width: 60, height: 40 },
    price: 900,
    label: "15 kg - 70 × 60 × 40 cm",
  },
  {
    maxWeight: 20,
    maxDimensions: { length: 80, width: 70, height: 50 },
    price: 900,
    label: "20 kg - 80 × 70 × 50 cm",
  },
];

export interface CartItem {
  weight?: number; // en kg
  length?: number; // en cm
  width?: number; // en cm
  height?: number; // en cm
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  quantity: number;
  price: number;
  title?: string;
  name?: string;
}

export interface ShippingQuote {
  id: string;
  carrier: string;
  service: string;
  serviceName: string;
  price: number;
  currency: string;
  estimatedDays: number;
  guaranteed: boolean;
  description: string;
  displayPrice: string;
  weightCategory: string;
}

function getItemDimensionsWithMargin(item: CartItem): {
  length: number;
  width: number;
  height: number;
} {
  const dimensions = item.dimensions || {
    length: item.length || 15,
    width: item.width || 15,
    height: item.height || 10,
  };

  // Margen de empaque por caja (10%)
  const packagingMargin = 1.1;

  return {
    length: Math.ceil(dimensions.length * packagingMargin),
    width: Math.ceil(dimensions.width * packagingMargin),
    height: Math.ceil(dimensions.height * packagingMargin),
  };
}

/**
 * Calcula el peso total de un grupo de productos
 */
export function calculateTotalWeight(items: CartItem[]): number {
  return items.reduce((total, item) => {
    const itemWeight = item.weight || 0.5; // peso por defecto 0.5 kg
    return total + itemWeight * item.quantity;
  }, 0);
}

/**
 * Calcula las dimensiones del paquete más grande necesario
 * Usa las dimensiones máximas de todos los productos con un pequeño margen
 * para empaque. Es más realista que sumar todas las alturas.
 */
export function calculatePackageDimensions(items: CartItem[]): {
  length: number;
  width: number;
  height: number;
} {
  let maxLength = 0;
  let maxWidth = 0;
  let maxHeight = 0;

  items.forEach((item, index) => {
    const dimensions = item.dimensions || {
      length: item.length || 15,
      width: item.width || 15,
      height: item.height || 10,
    };

    // Encontrar las dimensiones máximas en cada eje
    maxLength = Math.max(maxLength, dimensions.length);
    maxWidth = Math.max(maxWidth, dimensions.width);
    maxHeight = Math.max(maxHeight, dimensions.height);
  });

  // Agregar un pequeño margen para empaque (10% o mínimo 1 cm)
  const packagingMargin = 1.1;

  const result = {
    length: Math.ceil(maxLength * packagingMargin),
    width: Math.ceil(maxWidth * packagingMargin),
    height: Math.ceil(maxHeight * packagingMargin),
  };

  return result;
}

/**
 * Verifica si un paquete cabe dentro de las dimensiones de una tarifa
 */
function fitsInDimensions(
  packageDimensions: { length: number; width: number; height: number },
  rateDimensions: { length: number; width: number; height: number },
): boolean {
  // Ordenar dimensiones de mayor a menor para ambos
  const packageSorted = [
    packageDimensions.length,
    packageDimensions.width,
    packageDimensions.height,
  ].sort((a, b) => b - a);

  const rateSorted = [
    rateDimensions.length,
    rateDimensions.width,
    rateDimensions.height,
  ].sort((a, b) => b - a);

  // Verificar que cada dimensión del paquete sea menor o igual a la correspondiente en la tarifa
  return packageSorted.every((dim, index) => dim <= rateSorted[index]);
}

/**
 * Encuentra la tarifa de envío adecuada basándose en peso y dimensiones.
 * Si el producto no cabe en ninguna caja estándar (dimensiones grandes pero peso
 * normal, como pósters o figuras largas), se usa solo el peso para determinar
 * la tarifa — el empaque se adapta al producto.
 */
export function findShippingRate(
  totalWeight: number,
  dimensions: { length: number; width: number; height: number },
): ShippingRate | null {
  const largestRate = SHIPPING_RATES[SHIPPING_RATES.length - 1];

  console.log(
    `🔍 findShippingRate → weight: ${totalWeight} kg, dimensions:`,
    dimensions,
  );

  // Si el peso supera el máximo, requiere cotización especial
  if (totalWeight > largestRate.maxWeight) {
    return null;
  }

  // Primero intentar con peso Y dimensiones (caja estándar)
  for (const rate of SHIPPING_RATES) {
    const fits = fitsInDimensions(dimensions, rate.maxDimensions);

    if (totalWeight <= rate.maxWeight && fits) {
      return rate;
    }
  }

  // Las dimensiones del producto exceden todas las cajas estándar (ej. 83×14×105 cm).
  // Se usa la tarifa más cara (embalaje especial/sobredimensionado),
  // independientemente del peso.

  return largestRate;
}

/**
 * Calcula las cotizaciones de envío basadas en los items del carrito
 */
export function calculateShippingQuotes(items: CartItem[]): ShippingQuote[] {
  let basePrice = 0;
  const perBoxLabels: string[] = [];

  for (const item of items) {
    const unitWeight = item.weight || 0.5;
    const unitDimensions = getItemDimensionsWithMargin(item);
    console.log(
      `  📦 Item: "${item.title || item.name || "Producto"}" | qty: ${item.quantity} | raw weight: ${item.weight} | raw dims: L${item.dimensions?.length ?? item.length} W${item.dimensions?.width ?? item.width} H${item.dimensions?.height ?? item.height}`,
    );

    for (let i = 0; i < item.quantity; i++) {
      const rate = findShippingRate(unitWeight, unitDimensions);

      if (!rate) {
        // Si alguna caja requiere cotización especial, se devuelve opción personalizada
        const totalWeight = calculateTotalWeight(items);

        return [
          {
            id: "custom-shipping",
            carrier: "Envío Especial",
            service: "custom",
            serviceName: "Envío Personalizado",
            price: 0,
            currency: "MXN",
            estimatedDays: 7,
            guaranteed: false,
            description:
              "Tu pedido requiere envío personalizado. Te contactaremos para coordinar.",
            displayPrice: "Por cotizar",
            weightCategory: `${totalWeight.toFixed(2)} kg - Requiere cotización especial`,
          },
        ];
      }

      basePrice += rate.price;
      perBoxLabels.push(rate.label);
    }
  }

  if (basePrice <= 0) {
    const totalWeight = calculateTotalWeight(items);

    // Si el paquete es demasiado grande, retornar una opción especial
    return [
      {
        id: "custom-shipping",
        carrier: "Envío Especial",
        service: "custom",
        serviceName: "Envío Personalizado",
        price: 0,
        currency: "MXN",
        estimatedDays: 7,
        guaranteed: false,
        description:
          "Tu pedido requiere envío personalizado. Te contactaremos para coordinar.",
        displayPrice: "Por cotizar",
        weightCategory: `${totalWeight.toFixed(2)} kg - Requiere cotización especial`,
      },
    ];
  }

  const expressPrice = Math.round(basePrice * 1.5);
  const sameDayPrice = Math.round(basePrice * 2);
  const boxCount = perBoxLabels.length;
  const weightCategory = boxCount > 1 ? `${boxCount} cajas` : "1 caja";

  const quotes: ShippingQuote[] = [
    {
      id: "standard",
      carrier: "Envío ",
      service: "standard",
      serviceName: "Envío ",
      price: basePrice,
      currency: "MXN",
      estimatedDays: 3,
      guaranteed: false,
      description: `Envío  - Entrega en 2-3 días hábiles (${weightCategory})`,
      displayPrice: `$${basePrice.toFixed(2)} MXN`,
      weightCategory,
    },
    {
      id: "express",
      carrier: "Envío Express",
      service: "express",
      serviceName: "Envío Express",
      price: expressPrice, // 50% más caro
      currency: "MXN",
      estimatedDays: 2,
      guaranteed: true,
      description: `Envío Express - Entrega en 1-2 días hábiles (${weightCategory})`,
      displayPrice: `$${expressPrice.toFixed(2)} MXN`,
      weightCategory,
    },
    {
      id: "same-day",
      carrier: "Envío Mismo Día",
      service: "same-day",
      serviceName: "Envío Mismo Día (CDMX)",
      price: sameDayPrice, // doble de precio
      currency: "MXN",
      estimatedDays: 0,
      guaranteed: true,
      description: `Envío Mismo Día - Solo CDMX (${weightCategory})`,
      displayPrice: `$${sameDayPrice.toFixed(2)} MXN`,
      weightCategory,
    },
  ];

  return quotes;
}

/**
 * Obtiene información detallada del cálculo de envío (para debugging)
 */
export function getShippingCalculationDetails(items: CartItem[]) {
  const totalWeight = calculateTotalWeight(items);
  const dimensions = calculatePackageDimensions(items);
  const selectedRate = findShippingRate(totalWeight, dimensions);

  return {
    totalWeight,
    dimensions,
    selectedRate,
    itemsBreakdown: items.map((item) => ({
      name: item.title || item.name || "Producto",
      quantity: item.quantity,
      weight: item.weight || 0.5,
      totalWeight: (item.weight || 0.5) * item.quantity,
      dimensions: item.dimensions || {
        length: item.length || 15,
        width: item.width || 15,
        height: item.height || 10,
      },
    })),
  };
}
