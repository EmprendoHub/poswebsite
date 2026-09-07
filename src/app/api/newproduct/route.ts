export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";
import StoreInventory from "@/backend/models/StoreInventory";
import WorkOrder from "@/backend/models/WorkOrder";
import { getToken } from "next-auth/jwt";
import { generateUrlSafeTitle, newCSTDate } from "@/backend/helpers";

export async function POST(request: any, res: any) {
  const token: any = await getToken({ req: request });
  if (!token) {
    // Return immediately if not authorized
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    await dbConnect();
    const payload = await request.formData();
    let {
      title,
      description,
      category,
      featured,
      active,
      onlineAvailability,
      updatePrice,
      discountPercentage,
      mainImage,
      brand,
      grade,
      gender,
      mainCategory,
      subCategory,
      attributes,
      variations,
      secondaryImages,
      createdAt,
      weight,
      dimensions,
      inventoryStoreId,
      initialCost,
      initialStock,
      asin,
    } = Object.fromEntries(payload);

    // Check if ASIN already exists
    if (asin && asin.trim() !== "") {
      const existingAsin = await Product.findOne({ ASIN: asin });
      if (existingAsin) {
        return NextResponse.json(
          {
            error: "ASIN ya existe",
            message: "Este ASIN ya está registrado en el sistema",
            status: "asin_exists",
            existingProduct: {
              _id: existingAsin._id,
              title: existingAsin.title,
              brand: existingAsin.brand,
              category: existingAsin.category,
              ASIN: existingAsin.ASIN,
              images: existingAsin.images || [],
              variations: existingAsin.variations || [],
              stock: existingAsin.stock,
              active: existingAsin.active,
              price: existingAsin.variations?.[0]?.price || 0,
              slug: existingAsin.slug,
            },
          },
          { status: 409 },
        );
      }
    }

    let slug = generateUrlSafeTitle(title);

    let slugExists = await Product.findOne({ slug });

    // Attempt to generate a new unique slug if the original one is already in use
    while (slugExists) {
      const randomNum = Math.floor(1000 + Math.random() * 9000); // Generates a four-digit number
      const newTitle = `${title} Mod-${randomNum}`;
      title = newTitle;
      slug = generateUrlSafeTitle(newTitle);
      slugExists = await Product.findOne({ slug });
    }

    const user = { _id: token?.user?._id };
    // Parse variations JSON string with reviver function to convert numeric strings to numbers
    let colors: any[] = [];
    variations = JSON.parse(variations, (key, value) => {
      if (key === "color") {
        const color = {
          value: value,
          label: value,
        };
        //check array of object to see if values exists
        const exists = colors.some(
          (c) => c.value === value || c.label === value,
        );
        if (!exists) {
          colors.push(color); // add to colors array
        }
      }
      // Check if the value is a string and represents a number
      if (!isNaN(value) && value !== "" && !Array.isArray(value)) {
        if (key != "size") {
          return Number(value); // Convert the string to a number
        }
      }
      return value; // Return unchanged for other types of values
    });

    secondaryImages = JSON.parse(secondaryImages);
    const rating = Number(grade);
    const images = [{ url: mainImage }];

    secondaryImages.forEach((img: any) => {
      if (!img.url.includes("placeholder")) {
        images.push({ url: img.url });
      }
    });

    // calculate product stock from initial inventory or default 0
    const stockQty = initialStock ? parseInt(initialStock as string) : 0;

    createdAt = newCSTDate();

    const availability = {
      online: onlineAvailability,
    };

    const isActive = active === "true" || active === true;
    const isUpdatePrice = updatePrice === "true" || updatePrice === true;

    // Parse weight and dimensions
    const productWeight = weight ? parseFloat(weight as string) : 0.5;
    const productDimensions = dimensions
      ? JSON.parse(dimensions as string)
      : { length: 15, width: 15, height: 10 };

    const newProduct = new Product({
      type: "variation",
      title,
      slug,
      description,
      featured,
      active: isActive,
      availability,
      updatePrice: isUpdatePrice,
      discountPercentage: discountPercentage
        ? parseFloat(discountPercentage as string)
        : 0,
      brand,
      rating,
      gender,
      category,
      mainCategory: mainCategory || undefined,
      subCategory: subCategory || undefined,
      attributes: attributes ? JSON.parse(attributes as string) : [],
      images,
      variations,
      stock: stockQty,
      weight: productWeight,
      dimensions: productDimensions,
      ASIN: asin || "",
      createdAt,
      user,
    });

    // Save the Product to the database
    await newProduct.save();

    // Create StoreInventory + WorkOrder if a store was specified
    if (inventoryStoreId && stockQty > 0) {
      const variationId = newProduct.variations?.[0]?._id?.toString() ?? "v0";
      const unitCost = initialCost ? parseFloat(initialCost as string) : 0;

      // Upsert inventory
      await StoreInventory.findOneAndUpdate(
        { store: inventoryStoreId, product: newProduct._id, variationId },
        { $inc: { quantity: stockQty } },
        { upsert: true, new: true },
      );

      // Create a completed work order to record the entry
      await WorkOrder.create({
        type: "new_product",
        toStore: inventoryStoreId,
        requestedBy: token?.user?._id,
        approvedBy: token?.user?._id,
        status: "completed",
        completedAt: new Date(),
        notes: `Inventario inicial al crear producto: ${title}`,
        items: [
          {
            product: newProduct._id,
            productTitle: title,
            variationId,
            quantity: stockQty,
            unitCost,
            isNewProduct: true,
          },
        ],
      });
    }

    return new Response(
      JSON.stringify({
        message: "Producto creado exitosamente",
        success: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.log(error);
    return new Response(JSON.stringify({ error: "Error al crear Producto" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(request: any, res: any) {
  const token: any = await getToken({ req: request });

  if (!token) {
    // Return immediately if not authorized
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await dbConnect();
    const payload = await request.formData();
    let {
      title,
      description,
      category,
      featured,
      active,
      onlineAvailability,
      updatePrice,
      discountPercentage,
      mainImage,
      brand,
      grade,
      gender,
      mainCategory,
      subCategory,
      attributes,
      variations,
      secondaryImages,
      updatedAt,
      _id,
      weight,
      dimensions,
      asin,
    } = Object.fromEntries(payload);

    let slug = generateUrlSafeTitle(title);
    let slugExists = await Product.findOne({
      slug: slug,
      _id: { $ne: _id },
    });

    // Attempt to generate a new unique slug if the original one is already in use
    while (slugExists) {
      const randomNum = Math.floor(1000 + Math.random() * 9000); // Generates a four-digit number
      const newTitle = `${title} Mod-${randomNum}`;
      title = newTitle;
      slug = generateUrlSafeTitle(newTitle);
      slugExists = await Product.findOne({ slug });
    }

    const user = { _id: token?.user?._id };

    // Parse variations JSON string with reviver function to convert numeric strings to numbers
    let colors: any[] = [];
    variations = JSON.parse(variations, (key, value) => {
      if (key === "color") {
        const color = {
          value: value,
          label: value,
        };
        //check array of object to see if values exists
        const exists = colors.some(
          (c) => c.value === value || c.label === value,
        );
        if (!exists) {
          colors.push(color); // add to colors array
        }
      }
      // Check if the value is a string and represents a number
      if (!isNaN(value) && value !== "" && !Array.isArray(value)) {
        if (key != "size") {
          return Number(value); // Convert the string to a number
        }
      }
      return value; // Return unchanged for other types of values
    });

    secondaryImages = JSON.parse(secondaryImages);
    const rating = Number(grade);
    const images = [{ url: mainImage }];

    secondaryImages.forEach((img: any) => {
      if (!img.url.includes("placeholder")) {
        images.push({ url: img.url });
      }
    });

    const parsedUpdatedAt = updatedAt ? new Date(updatedAt) : new Date();
    if (isNaN(parsedUpdatedAt.getTime())) {
      // fallback if the string was invalid
    }

    const availability = {
      online: onlineAvailability,
    };

    const isActive = active === "true" || active === true;
    const isUpdatePrice = updatePrice === "true" || updatePrice === true;

    // Parse weight and dimensions
    const productWeight = weight ? parseFloat(weight) : 0.5;
    const productDimensions = dimensions
      ? JSON.parse(dimensions)
      : {
          length: 15,
          width: 15,
          height: 10,
        };

    // Parse variations to get the first variation's price for the product-level price fields
    let parsedVariations = [];
    try {
      parsedVariations = Array.isArray(variations)
        ? variations
        : JSON.parse(variations);
    } catch (e) {
      parsedVariations = [];
    }

    const firstVariationPrice =
      parsedVariations?.[0]?.price || parsedVariations?.[0]?.price || 0;

    // Update a Product in the database
    // Also update product-level price and currentPrice to match variation price
    const updateFields: any = {
      type: "variation",
      title,
      slug,
      description,
      featured,
      active: isActive,
      availability,
      updatePrice: isUpdatePrice,
      discountPercentage: discountPercentage
        ? parseFloat(discountPercentage as string)
        : 0,
      brand,
      rating,
      gender,
      category,
      images,
      colors,
      variations,
      price: firstVariationPrice, // Update product-level price
      currentPrice: firstVariationPrice, // Update currentPrice too
      weight: productWeight,
      dimensions: productDimensions,
      ASIN: asin || "",
      updatedAt: parsedUpdatedAt,
      user,
    };
    // Only touch new-taxonomy fields when provided — avoids casting "" to ObjectId
    if (mainCategory) updateFields.mainCategory = mainCategory;
    if (subCategory) updateFields.subCategory = subCategory;
    if (attributes) {
      try {
        updateFields.attributes = JSON.parse(attributes as string);
      } catch {
        // ignore malformed attributes payload
      }
    }

    await Product.updateOne({ _id }, updateFields);
    const response = NextResponse.json({
      message: "Producto actualizado exitosamente",
      success: true,
    });

    return response;
  } catch (error: any) {
    console.error("[PUT /api/newproduct]", error?.message ?? error);
    return NextResponse.json(
      { error: "Error al crear Producto", detail: error?.message },
      { status: 500 },
    );
  }
}
