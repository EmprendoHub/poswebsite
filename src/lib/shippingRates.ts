// Sistema de tarifas de envío basadas en peso y dimensiones con bin packing 3D
// Tarifas predeterminadas para México

/**
 * SHIPPING BOXES CONFIGURATION
 * These are the available boxes we can pack items into
 * Order matters: algorithm tries smaller boxes first
 */
export interface ShippingBox {
  id: string;
  label: string;
  dimensions: {
    length: number; // en cm
    width: number; // en cm
    height: number; // en cm
  };
  maxWeight: number; // en kg
  price: number; // en MXN
}

export const SHIPPING_BOXES: ShippingBox[] = [
  {
    id: "box-small",
    label: "Pequeña - 13 × 13 × 15 cm",
    dimensions: { length: 13, width: 13, height: 15 },
    maxWeight: 1,
    price: 199,
  },

  {
    id: "box-medium-large",
    label: "Mediana-Grande - 40 × 30 × 20 cm",
    dimensions: { length: 40, width: 30, height: 20 },
    maxWeight: 3,
    price: 300,
  },
  {
    id: "box-large",
    label: "Grande - 45 × 30 × 30 cm",
    dimensions: { length: 45, width: 30, height: 30 },
    maxWeight: 5,
    price: 400,
  },
  {
    id: "box-xl",
    label: "Extra Grande - 47 × 31 × 35 cm",
    dimensions: { length: 47, width: 31, height: 35 },
    maxWeight: 10,
    price: 500,
  },
  {
    id: "box-xxl",
    label: "2XL - 70 × 60 × 40 cm",
    dimensions: { length: 70, width: 60, height: 40 },
    maxWeight: 15,
    price: 600,
  },
];

/**
 * TRADING CARD IDENTIFIERS
 * Used to detect trading cards by their dimensions
 */
export const TRADING_CARD_DIMENSIONS = [
  {
    name: "Graduadas",
    dimensions: { length: 9, width: 1, height: 14 },
    weight: 0.08, // kg
  },
  {
    name: "Sobres",
    dimensions: { length: 9, width: 1, height: 14 },
    weight: 0.02, // kg
  },
];

export interface ShippingRate {
  maxWeight: number;
  maxDimensions: {
    length: number;
    width: number;
    height: number;
  };
  price: number;
  label: string;
}

// Backward compatibility: expose SHIPPING_RATES as array of ShippingRate
export const SHIPPING_RATES: ShippingRate[] = SHIPPING_BOXES.map((box) => ({
  maxWeight: box.maxWeight,
  maxDimensions: box.dimensions,
  price: box.price,
  label: box.label,
}));

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

/**
 * Represents an item that cannot be shipped and requires pick-up
 */
export interface UnshippableItem {
  productId: string;
  variationId?: string;
  title: string;
  quantity: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  reason: string;
  availableStores: Array<{
    storeId: string;
    storeName: string;
    address: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    quantity: number;
  }>;
}

/**
 * Extended shipping calculation result including unshippable items
 */
export interface ShippingCalculationResult {
  shippableQuotes: ShippingQuote[];
  unshippableItems: UnshippableItem[];
  hasUnshippableItems: boolean;
}

/**
 * Detecta si un item es una tarjeta comercial basado en dimensiones
 */
export function isTradingCard(item: CartItem): boolean {
  const dims = item.dimensions || {
    length: item.length || 0,
    width: item.width || 0,
    height: item.height || 0,
  };

  // Comparar con tolerancia de ±1cm
  const isCard = TRADING_CARD_DIMENSIONS.some((card) => {
    const tolerance = 1;
    const match =
      Math.abs(dims.length - card.dimensions.length) <= tolerance &&
      Math.abs(dims.width - card.dimensions.width) <= tolerance &&
      Math.abs(dims.height - card.dimensions.height) <= tolerance;

    return match;
  });

  if (!isCard && (dims.length > 0 || dims.width > 0 || dims.height > 0)) {
    console.log(
      `⚪ Regular Item: "${item.title || item.name}" | Dims: ${dims.length}×${dims.width}×${dims.height}cm | Weight: ${item.weight}kg | Qty: ${item.quantity}`,
    );
  }

  return isCard;
}

/**
 * Dimensiones normalizadas para comparación
 */
function normalizedDimensions(item: CartItem): {
  length: number;
  width: number;
  height: number;
} {
  return (
    item.dimensions || {
      length: item.length || 15,
      width: item.width || 15,
      height: item.height || 10,
    }
  );
}

/**
 * Verifica si un item cabe en una caja
 * Intenta todas las orientaciones posibles del item en la caja
 */
function fitsInBox(
  itemDims: { length: number; width: number; height: number },
  boxDims: { length: number; width: number; height: number },
): boolean {
  // Crear array de todas las orientaciones posibles del item (6 permutaciones)
  const itemOrientations = [
    [itemDims.length, itemDims.width, itemDims.height],
    [itemDims.length, itemDims.height, itemDims.width],
    [itemDims.width, itemDims.length, itemDims.height],
    [itemDims.width, itemDims.height, itemDims.length],
    [itemDims.height, itemDims.length, itemDims.width],
    [itemDims.height, itemDims.width, itemDims.length],
  ];

  // Crear array de todas las orientaciones posibles de la caja
  const boxOrientations = [
    [boxDims.length, boxDims.width, boxDims.height],
    [boxDims.length, boxDims.height, boxDims.width],
    [boxDims.width, boxDims.length, boxDims.height],
    [boxDims.width, boxDims.height, boxDims.length],
    [boxDims.height, boxDims.length, boxDims.width],
    [boxDims.height, boxDims.width, boxDims.length],
  ];

  // Verificar si alguna orientación del item cabe en alguna orientación de la caja
  return itemOrientations.some((itemOrientation) =>
    boxOrientations.some(
      (boxOrientation) =>
        itemOrientation[0] <= boxOrientation[0] &&
        itemOrientation[1] <= boxOrientation[1] &&
        itemOrientation[2] <= boxOrientation[2],
    ),
  );
}

/**
 * Calculate how many units of an item can fit in a box
 * Tries all orientations and finds the maximum quantity that can be stacked
 */
function calculateItemsPerBox(
  itemDims: { length: number; width: number; height: number },
  boxDims: { length: number; width: number; height: number },
): number {
  // All possible orientations of the item [length, width, height]
  const itemOrientations = [
    { l: itemDims.length, w: itemDims.width, h: itemDims.height },
    { l: itemDims.length, w: itemDims.height, h: itemDims.width },
    { l: itemDims.width, w: itemDims.length, h: itemDims.height },
    { l: itemDims.width, w: itemDims.height, h: itemDims.length },
    { l: itemDims.height, w: itemDims.length, h: itemDims.width },
    { l: itemDims.height, w: itemDims.width, h: itemDims.length },
  ];

  // All possible orientations of the box [length, width, height]
  const boxOrientations = [
    { l: boxDims.length, w: boxDims.width, h: boxDims.height },
    { l: boxDims.length, w: boxDims.height, h: boxDims.width },
    { l: boxDims.width, w: boxDims.length, h: boxDims.height },
    { l: boxDims.width, w: boxDims.height, h: boxDims.length },
    { l: boxDims.height, w: boxDims.length, h: boxDims.width },
    { l: boxDims.height, w: boxDims.width, h: boxDims.length },
  ];

  let maxItems = 0;

  // Try each item orientation against each box orientation
  for (const itemOr of itemOrientations) {
    for (const boxOr of boxOrientations) {
      // Calculate how many items fit along each dimension
      // We allow items to be stacked in the height dimension
      const itemsAlongLength = Math.floor(boxOr.l / itemOr.l);
      const itemsAlongWidth = Math.floor(boxOr.w / itemOr.w);
      const itemsAlongHeight = Math.floor(boxOr.h / itemOr.h);

      // Total items that can fit in this orientation
      const itemsInThisOrientation =
        itemsAlongLength * itemsAlongWidth * itemsAlongHeight;

      maxItems = Math.max(maxItems, itemsInThisOrientation);
    }
  }

  return maxItems;
}

/**
 * 3D BIN PACKING ALGORITHM
 * Empaca items en cajas disponibles de forma óptima
 * Retorna lista de cajas necesarias con items asignados
 */
interface PackedBox {
  box: ShippingBox;
  items: Array<{ item: CartItem; quantity: number }>;
  totalWeight: number;
  usedSpace: number; // estimado en porcentaje
}

export function packItemsIntoBoxes(items: CartItem[]): PackedBox[] {
  const packedBoxes: PackedBox[] = [];

  // Expandir items a lista individual considerando cantidad
  interface PackItem {
    original: CartItem;
    dims: { length: number; width: number; height: number };
    weight: number;
    isTradingCard: boolean;
  }

  const expandedItems: PackItem[] = [];
  for (const item of items) {
    const isCard = isTradingCard(item);
    const dims = normalizedDimensions(item);
    const weight = item.weight || 0.5;

    for (let q = 0; q < item.quantity; q++) {
      expandedItems.push({
        original: item,
        dims,
        weight,
        isTradingCard: isCard,
      });
    }
  }

  // Ordenar items: trading cards primero, luego por tamaño descendente
  expandedItems.sort((a, b) => {
    if (a.isTradingCard !== b.isTradingCard) {
      return a.isTradingCard ? -1 : 1;
    }
    const sizeA = a.dims.length * a.dims.width * a.dims.height;
    const sizeB = b.dims.length * b.dims.width * b.dims.height;
    return sizeB - sizeA;
  });

  // First Fit Decreasing (FFD) bin packing
  for (let idx = 0; idx < expandedItems.length; idx++) {
    const packItem = expandedItems[idx];
    let placed = false;
    const itemName =
      packItem.original.title || packItem.original.name || "Item";
    const itemType = packItem.isTradingCard ? "🃏 Card" : "📦 Regular";
    const itemSize = `${packItem.dims.length}×${packItem.dims.width}×${packItem.dims.height}cm`;

    // Intentar colocar en una caja existente
    for (let boxIdx = 0; boxIdx < packedBoxes.length; boxIdx++) {
      const packedBox = packedBoxes[boxIdx];
      const potentialWeight = packedBox.totalWeight + packItem.weight;

      // Verificar peso
      if (potentialWeight > packedBox.box.maxWeight) {
        continue;
      }

      // Verificar si el item cabe dimensionalmente
      if (fitsInBox(packItem.dims, packedBox.box.dimensions)) {
        // Encontrar o crear entrada para este item
        const existingEntry = packedBox.items.find(
          (i) => i.item === packItem.original,
        );

        // Get the max items of this type that can fit in the box
        const maxItemsPerBox = calculateItemsPerBox(
          packItem.dims,
          packedBox.box.dimensions,
        );

        // Calculate how many of this item type are already in the box
        const currentQuantity = existingEntry?.quantity || 0;

        // Check if we can add one more
        if (currentQuantity < maxItemsPerBox) {
          if (existingEntry) {
            existingEntry.quantity++;
          } else {
            packedBox.items.push({
              item: packItem.original,
              quantity: 1,
            });
          }
          packedBox.totalWeight = potentialWeight;

          placed = true;
          break;
        }
      }
    }

    // Si no cabe en ninguna existente, crear nueva caja
    if (!placed) {
      // Calculate total quantity of this item already packed
      let totalQtyAlreadyPacked = 0;
      let smallestFullBoxIndex = -1;
      let smallestFullBoxCapacity = 0;

      for (let i = 0; i < packedBoxes.length; i++) {
        const packedBox = packedBoxes[i];
        const hasThisItem = packedBox.items.some(
          (it) => it.item === packItem.original,
        );
        if (hasThisItem) {
          const itemEntry = packedBox.items.find(
            (it) => it.item === packItem.original,
          );
          const qty = itemEntry?.quantity || 0;
          totalQtyAlreadyPacked += qty;

          const maxItemsPerBox = calculateItemsPerBox(
            packItem.dims,
            packedBox.box.dimensions,
          );

          // Track the first full box (smallest)
          if (qty >= maxItemsPerBox && smallestFullBoxIndex === -1) {
            smallestFullBoxIndex = i;
            smallestFullBoxCapacity = maxItemsPerBox;
          }
        }
      }

      // Total quantity we need to fit: already packed + 1 new
      const totalQtyNeeded = totalQtyAlreadyPacked + 1;

      // Try to find a larger box that can fit all items at once
      let consolidationBoxFound = false;
      for (const box of SHIPPING_BOXES) {
        const maxItemsPerBox = calculateItemsPerBox(
          packItem.dims,
          box.dimensions,
        );

        // Calculate total weight if consolidating
        const totalWeightIfConsolidated =
          packItem.weight * totalQtyNeeded +
          packItem.weight * totalQtyAlreadyPacked; // current items + new item

        if (
          totalWeightIfConsolidated <= box.maxWeight &&
          maxItemsPerBox >= totalQtyNeeded &&
          fitsInBox(packItem.dims, box.dimensions)
        ) {
          // Check if this box is larger than the current full box
          if (smallestFullBoxIndex !== -1) {
            const currentFullBox = packedBoxes[smallestFullBoxIndex];
            const currentBoxVolume =
              currentFullBox.box.dimensions.length *
              currentFullBox.box.dimensions.width *
              currentFullBox.box.dimensions.height;
            const newBoxVolume =
              box.dimensions.length *
              box.dimensions.width *
              box.dimensions.height;

            if (newBoxVolume > currentBoxVolume) {
              // Remove the old full box and replace with new larger box
              const itemsFromOldBox = packedBoxes[smallestFullBoxIndex].items;
              packedBoxes.splice(smallestFullBoxIndex, 1);

              // Create new consolidated box with all items
              const consolidatedItems = itemsFromOldBox.map((item) => ({
                item: item.item,
                quantity:
                  item.item === packItem.original
                    ? totalQtyNeeded
                    : item.quantity,
              }));

              packedBoxes.push({
                box,
                items: consolidatedItems,
                totalWeight: totalWeightIfConsolidated,
                usedSpace: 10,
              });

              placed = true;
              consolidationBoxFound = true;
              break;
            }
          }
        }
      }

      // If no consolidation was possible, try to add a new box
      if (!consolidationBoxFound) {
        for (const box of SHIPPING_BOXES) {
          if (
            packItem.weight <= box.maxWeight &&
            fitsInBox(packItem.dims, box.dimensions)
          ) {
            const maxItemsPerBox = calculateItemsPerBox(
              packItem.dims,
              box.dimensions,
            );
            packedBoxes.push({
              box,
              items: [{ item: packItem.original, quantity: 1 }],
              totalWeight: packItem.weight,
              usedSpace: 10,
            });

            placed = true;
            break;
          }
        }
      }
    }

    // Si sigue sin encajar, necesita cotización especial
    if (!placed) {
      console.groupEnd();
      return []; // Señal de que necesita cotización especial
    }
  }

  const totalBoxes = packedBoxes.length;
  const totalBoxCost = packedBoxes.reduce((sum, pb) => sum + pb.box.price, 0);
  const totalWeight = packedBoxes.reduce((sum, pb) => sum + pb.totalWeight, 0);

  packedBoxes.forEach((pb, idx) => {
    const itemsList = pb.items
      .map((i) => `${i.item.title || i.item.name}×${i.quantity}`)
      .join(", ");
  });
  console.groupEnd();

  return packedBoxes;
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
 * Detecta items que no caben en ninguna caja de envío
 * Retorna items que requieren pick-up en lugar de envío
 */
export function detectUnshippableItems(items: CartItem[]): CartItem[] {
  const largestBox = SHIPPING_BOXES[SHIPPING_BOXES.length - 1]; // Get 2XL box (largest)
  const unshippable: CartItem[] = [];

  for (const item of items) {
    const dims = normalizedDimensions(item);

    // Verificar si el item cabe en la caja más grande
    if (!fitsInBox(dims, largestBox.dimensions)) {
      console.warn(
        `⚠️  UNSHIPPABLE: Item "${item.title || item.name}" (${dims.length}×${dims.width}×${dims.height}cm) doesn't fit in largest box (${largestBox.label})`,
      );
      unshippable.push(item);
    }
  }

  return unshippable;
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
 * NEW: Calculates shipping with support for unshippable items
 * Returns both shipping quotes and information about pick-up only items
 */
export async function calculateShippingQuotesWithPickup(
  items: CartItem[],
): Promise<ShippingCalculationResult> {
  console.group("💰 SHIPPING QUOTES CALCULATION WITH PICKUP SUPPORT");

  // Step 1: Detect items that don't fit in any box
  const unshippableItems = detectUnshippableItems(items);

  // Step 2: Create a set of unshippable item indices for accurate filtering
  const unshippableIndices = new Set<number>();
  items.forEach((item, idx) => {
    if (
      unshippableItems.some(
        (u) =>
          u.name === item.name ||
          u.name === item.title ||
          u.title === item.title ||
          u.title === item.name,
      )
    ) {
      unshippableIndices.add(idx);
    }
  });

  const shippableItems = items.filter((_, idx) => !unshippableIndices.has(idx));

  if (unshippableItems.length > 0) {
    unshippableItems.forEach((item) => {
      const dims = normalizedDimensions(item);
    });
  }

  // Step 3: Process unshippable items to get store info
  const unshippableWithStores: UnshippableItem[] = [];
  if (unshippableItems.length > 0) {
    // Import here to avoid circular dependencies
    try {
      const StoreInventory =
        await import("@/backend/models/StoreInventory").then((m) => m.default);

      for (const item of unshippableItems) {
        const itemName = item.title || item.name || "Unknown Product";

        // Find stores with this product - use product name or ID as variationId
        try {
          const inventoryRecords = await StoreInventory.aggregate([
            {
              $match: {
                $or: [{ variationId: item.name }, { variationId: item.title }],
                quantity: { $gt: 0 },
              },
            },
            {
              $lookup: {
                from: "stores",
                localField: "store",
                foreignField: "_id",
                as: "storeInfo",
              },
            },
            { $unwind: "$storeInfo" },
          ]);

          const availableStores = inventoryRecords.map((record: any) => ({
            storeId: record.store.toString(),
            storeName: record.storeInfo.name || "Unknown Store",
            address: record.storeInfo.address || null,
            city: record.storeInfo.city || null,
            state: record.storeInfo.state || null,
            phone: record.storeInfo.phone || null,
            quantity: record.quantity || 0,
          }));

          const dims = normalizedDimensions(item);
          unshippableWithStores.push({
            productId: item.name || "unknown",
            variationId: item.name || undefined,
            title: itemName,
            quantity: item.quantity,
            dimensions: dims,
            reason: `No cabe en nuestra caja más grande (2XL: 70×60×40cm)`,
            availableStores,
          });
        } catch (queryError) {
          console.warn(
            `  ⚠️  Error querying store inventory for ${itemName}:`,
            queryError,
          );
          // Add item without store info
          const dims = normalizedDimensions(item);
          unshippableWithStores.push({
            productId: item.name || "unknown",
            variationId: item.name || undefined,
            title: itemName,
            quantity: item.quantity,
            dimensions: dims,
            reason: `No cabe en nuestra caja más grande (2XL: 70×60×40cm)`,
            availableStores: [],
          });
        }
      }
    } catch (error) {
      console.error("❌ Error importing models:", error);
      // Still return unshippable items but without store info
      unshippableWithStores.push(
        ...unshippableItems.map((item) => ({
          productId: item.name || "unknown",
          variationId: item.name || undefined,
          title: item.title || item.name || "Producto",
          quantity: item.quantity,
          dimensions: normalizedDimensions(item),
          reason: `No cabe en nuestra caja más grande (2XL: 70×60×40cm)`,
          availableStores: [],
        })),
      );
    }
  }

  // Step 4: Calculate shipping for shippable items only
  let shippableQuotes: ShippingQuote[] = [];

  if (shippableItems.length > 0) {
    const packedBoxes = packItemsIntoBoxes(shippableItems);

    if (packedBoxes.length === 0) {
      const totalWeight = calculateTotalWeight(shippableItems);
      console.warn(
        `⚠️  CUSTOM SHIPPING REQUIRED: ${totalWeight.toFixed(2)}kg order doesn't fit in standard boxes`,
      );
      shippableQuotes = [
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
    } else {
      const basePrice = packedBoxes.reduce((sum, pb) => sum + pb.box.price, 0);
      const boxCount = packedBoxes.length;
      const totalWeight = calculateTotalWeight(shippableItems);
      const weightCategory = boxCount > 1 ? `${boxCount} cajas` : "1 caja";

      const expressPrice = Math.round(basePrice * 1.5);
      const sameDayPrice = Math.round(basePrice * 2);

      shippableQuotes = [
        {
          id: "standard",
          carrier: "Envío",
          service: "standard",
          serviceName: "Envío Estándar",
          price: basePrice,
          currency: "MXN",
          estimatedDays: 3,
          guaranteed: false,
          description: `Envío Estándar - Entrega en 2-3 días hábiles (${weightCategory})`,
          displayPrice: `$${basePrice.toFixed(2)} MXN`,
          weightCategory,
        },
        {
          id: "express",
          carrier: "Envío Express",
          service: "express",
          serviceName: "Envío Express",
          price: expressPrice,
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
          price: sameDayPrice,
          currency: "MXN",
          estimatedDays: 0,
          guaranteed: true,
          description: `Envío Mismo Día - Solo CDMX (${weightCategory})`,
          displayPrice: `$${sameDayPrice.toFixed(2)} MXN`,
          weightCategory,
        },
      ];
    }
  }

  console.groupEnd();

  return {
    shippableQuotes,
    unshippableItems: unshippableWithStores,
    hasUnshippableItems: unshippableWithStores.length > 0,
  };
}

/**
 * LEGACY: Kept for backward compatibility
 * Use calculateShippingQuotesWithPickup instead
 * Calcula las cotizaciones de envío basadas en bin packing 3D
 * Empaca items eficientemente en cajas disponibles
 */
export function calculateShippingQuotes(items: CartItem[]): ShippingQuote[] {
  console.group("💰 SHIPPING QUOTES CALCULATION");

  // Empacar items en cajas
  const packedBoxes = packItemsIntoBoxes(items);

  // Si el packing retorna array vacío, requiere cotización especial
  if (packedBoxes.length === 0) {
    const totalWeight = calculateTotalWeight(items);
    console.warn(
      `⚠️  CUSTOM SHIPPING REQUIRED: ${totalWeight.toFixed(2)}kg order doesn't fit in standard boxes`,
    );
    console.groupEnd();
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

  // Calcular costo base sumando precios de todas las cajas
  const basePrice = packedBoxes.reduce((sum, pb) => sum + pb.box.price, 0);
  const boxCount = packedBoxes.length;
  const totalWeight = calculateTotalWeight(items);
  const weightCategory = boxCount > 1 ? `${boxCount} cajas` : "1 caja";

  const expressPrice = Math.round(basePrice * 1.5);
  const sameDayPrice = Math.round(basePrice * 2);

  const quotes: ShippingQuote[] = [
    {
      id: "standard",
      carrier: "Envío",
      service: "standard",
      serviceName: "Envío Estándar",
      price: basePrice,
      currency: "MXN",
      estimatedDays: 3,
      guaranteed: false,
      description: `Envío Estándar - Entrega en 2-3 días hábiles (${weightCategory})`,
      displayPrice: `$${basePrice.toFixed(2)} MXN`,
      weightCategory,
    },
    {
      id: "express",
      carrier: "Envío Express",
      service: "express",
      serviceName: "Envío Express",
      price: expressPrice,
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
      price: sameDayPrice,
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
  const packedBoxes = packItemsIntoBoxes(items);

  return {
    totalWeight,
    boxCount: packedBoxes.length,
    packedBoxes: packedBoxes.map((pb) => ({
      boxLabel: pb.box.label,
      boxPrice: pb.box.price,
      totalWeight: pb.totalWeight,
      items: pb.items.map((i) => ({
        name: i.item.title || i.item.name || "Producto",
        quantity: i.quantity,
        isTradingCard: isTradingCard(i.item),
      })),
    })),
    itemsBreakdown: items.map((item) => ({
      name: item.title || item.name || "Producto",
      quantity: item.quantity,
      weight: item.weight || 0.5,
      totalWeight: (item.weight || 0.5) * item.quantity,
      isTradingCard: isTradingCard(item),
      dimensions: item.dimensions || {
        length: item.length || 15,
        width: item.width || 15,
        height: item.height || 10,
      },
    })),
  };
}
