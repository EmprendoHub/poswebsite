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
    label: "Pequeña - 13 × 13 × 13 cm",
    dimensions: { length: 13, width: 13, height: 13 },
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

    if (match) {
      console.log(
        `✅ Trading Card Detected: "${item.title || item.name}" | Type: ${card.name} | Dims: ${dims.length}×${dims.width}×${dims.height}cm (match: ${card.dimensions.length}×${card.dimensions.width}×${card.dimensions.height}cm)`,
      );
    }
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
  console.group(
    "🎁 BIN PACKING ALGORITHM START - Packing cart items into boxes",
  );
  console.log(
    `Total cart items: ${items.length} | Total units: ${items.reduce((sum, i) => sum + i.quantity, 0)}`,
  );
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

  console.log(
    `📊 Expanded to ${expandedItems.length} individual units for packing`,
  );

  // Ordenar items: trading cards primero, luego por tamaño descendente
  expandedItems.sort((a, b) => {
    if (a.isTradingCard !== b.isTradingCard) {
      return a.isTradingCard ? -1 : 1;
    }
    const sizeA = a.dims.length * a.dims.width * a.dims.height;
    const sizeB = b.dims.length * b.dims.width * b.dims.height;
    return sizeB - sizeA;
  });

  console.log(
    `🔀 Sort order: Trading cards first (${expandedItems.filter((i) => i.isTradingCard).length} units), then by descending size`,
  );

  // First Fit Decreasing (FFD) bin packing
  console.log(`\n📦 FFD Packing Process:\n`);
  for (let idx = 0; idx < expandedItems.length; idx++) {
    const packItem = expandedItems[idx];
    let placed = false;
    const itemName =
      packItem.original.title || packItem.original.name || "Item";
    const itemType = packItem.isTradingCard ? "🃏 Card" : "📦 Regular";
    const itemSize = `${packItem.dims.length}×${packItem.dims.width}×${packItem.dims.height}cm`;

    console.log(
      `\n  [${idx + 1}/${expandedItems.length}] ${itemType} "${itemName}" | ${itemSize} | ${packItem.weight}kg`,
    );

    // Intentar colocar en una caja existente
    for (let boxIdx = 0; boxIdx < packedBoxes.length; boxIdx++) {
      const packedBox = packedBoxes[boxIdx];
      const potentialWeight = packedBox.totalWeight + packItem.weight;

      // Verificar peso
      if (potentialWeight > packedBox.box.maxWeight) {
        console.log(
          `    ❌ Box ${boxIdx + 1} (${packedBox.box.label}): WEIGHT EXCEEDED (${packedBox.totalWeight}kg + ${packItem.weight}kg > ${packedBox.box.maxWeight}kg limit)`,
        );
        continue;
      }

      // Verificar si el item cabe dimensionalmente
      if (fitsInBox(packItem.dims, packedBox.box.dimensions)) {
        // Encontrar o crear entrada para este item
        const existingEntry = packedBox.items.find(
          (i) => i.item === packItem.original,
        );
        if (existingEntry) {
          existingEntry.quantity++;
        } else {
          packedBox.items.push({
            item: packItem.original,
            quantity: 1,
          });
        }
        packedBox.totalWeight = potentialWeight;
        console.log(
          `    ✅ Box ${boxIdx + 1} (${packedBox.box.label}): PLACED | New weight: ${potentialWeight.toFixed(2)}kg`,
        );
        placed = true;
        break;
      } else {
        console.log(
          `    ❌ Box ${boxIdx + 1} (${packedBox.box.label}): DIMENSIONS DON'T FIT (${itemSize} vs ${packedBox.box.dimensions.length}×${packedBox.box.dimensions.width}×${packedBox.box.dimensions.height}cm)`,
        );
      }
    }

    // Si no cabe en ninguna existente, crear nueva caja
    if (!placed) {
      console.log(`    🆕 Need new box...`);
      // Encontrar la caja más pequeña que quepa
      for (const box of SHIPPING_BOXES) {
        if (
          packItem.weight <= box.maxWeight &&
          fitsInBox(packItem.dims, box.dimensions)
        ) {
          packedBoxes.push({
            box,
            items: [{ item: packItem.original, quantity: 1 }],
            totalWeight: packItem.weight,
            usedSpace: 10, // estimado
          });
          console.log(
            `    ✅ NEW BOX: ${box.label} | Price: $${box.price} MXN`,
          );
          placed = true;
          break;
        }
      }
    }

    // Si sigue sin encajar, necesita cotización especial
    if (!placed) {
      console.log(
        `    ⚠️  SPECIAL SHIPPING REQUIRED: Item doesn't fit in any standard box`,
      );
      console.groupEnd();
      return []; // Señal de que necesita cotización especial
    }
  }

  console.log(`\n✨ Packing Summary:`);
  const totalBoxes = packedBoxes.length;
  const totalBoxCost = packedBoxes.reduce((sum, pb) => sum + pb.box.price, 0);
  const totalWeight = packedBoxes.reduce((sum, pb) => sum + pb.totalWeight, 0);
  console.log(
    `  📦 Total boxes: ${totalBoxes} | Total cost: $${totalBoxCost} MXN | Total weight: ${totalWeight.toFixed(2)}kg`,
  );
  packedBoxes.forEach((pb, idx) => {
    const itemsList = pb.items
      .map((i) => `${i.item.title || i.item.name}×${i.quantity}`)
      .join(", ");
    console.log(
      `    Box ${idx + 1}: ${pb.box.label} | $${pb.box.price} | Items: [${itemsList}] | Weight: ${pb.totalWeight.toFixed(2)}kg`,
    );
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
  console.log(
    `Input: ${items.length} items | Total units: ${items.reduce((sum, i) => sum + i.quantity, 0)}`,
  );

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

  console.log(`\n🔍 Item Classification:`);
  console.log(`  Shippable: ${shippableItems.length} items`);
  console.log(`  Unshippable (Pick-up only): ${unshippableItems.length} items`);

  if (unshippableItems.length > 0) {
    console.log(`  Unshippable item details:`);
    unshippableItems.forEach((item) => {
      const dims = normalizedDimensions(item);
      console.log(
        `    - ${item.title || item.name} (${dims.length}×${dims.width}×${dims.height}cm)`,
      );
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
        console.log(`\n📍 Fetching store inventory for: ${itemName}`);

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

          console.log(
            `  ✓ Found in ${availableStores.length} store(s) with stock`,
          );
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
    console.log(`\n📦 Packing shippable items...`);
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

      console.log(
        `\n✅ Packing successful: ${boxCount} box(es) | Total weight: ${totalWeight.toFixed(2)}kg | Base cost: $${basePrice} MXN`,
      );

      const expressPrice = Math.round(basePrice * 1.5);
      const sameDayPrice = Math.round(basePrice * 2);

      console.log(`\n💵 Pricing Tiers:`);
      console.log(`  Standard: $${basePrice} MXN`);
      console.log(`  Express (1.5x): $${expressPrice} MXN`);
      console.log(`  Same-Day (2x): $${sameDayPrice} MXN`);

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
  } else {
    console.log(`\n⚠️  No shippable items - all require pick-up`);
  }

  console.log(`\n📤 Final Result:`);
  console.log(`  Shipping quotes: ${shippableQuotes.length}`);
  console.log(`  Pick-up items: ${unshippableWithStores.length}`);
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
  console.log(
    `Input: ${items.length} items | Total units: ${items.reduce((sum, i) => sum + i.quantity, 0)}`,
  );

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

  console.log(
    `\n✅ Packing successful: ${boxCount} box(es) | Total weight: ${totalWeight.toFixed(2)}kg | Base cost: $${basePrice} MXN`,
  );

  const expressPrice = Math.round(basePrice * 1.5);
  const sameDayPrice = Math.round(basePrice * 2);

  console.log(`\n💵 Pricing Tiers:`);
  console.log(`  Standard: $${basePrice} MXN`);
  console.log(`  Express (1.5x): $${expressPrice} MXN`);
  console.log(`  Same-Day (2x): $${sameDayPrice} MXN`);

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

  console.log(`\n📤 Generated quotes: Standard | Express | Same-Day`);
  console.groupEnd();

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
