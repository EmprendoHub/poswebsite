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
      mainImage,
      brand,
      grade,
      gender,
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
      brand,
      rating,
      gender,
      category,
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
      mainImage,
      brand,
      grade,
      gender,
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

    // Parse weight and dimensions
    const productWeight = weight ? parseFloat(weight) : 0.5;
    const productDimensions = dimensions
      ? JSON.parse(dimensions)
      : {
          length: 15,
          width: 15,
          height: 10,
        };

    // Update a Product in the database
    await Product.updateOne(
      { _id },
      {
        type: "variation",
        title,
        slug,
        description,
        featured,
        active: isActive,
        availability,
        brand,
        rating,
        gender,
        category,
        images,
        colors,
        variations,
        weight: productWeight,
        dimensions: productDimensions,
        ASIN: asin || "",
        updatedAt: parsedUpdatedAt,
        user,
      },
    );
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
