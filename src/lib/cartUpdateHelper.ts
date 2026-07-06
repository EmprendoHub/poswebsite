/**
 * Helper functions to automatically update shopping cart items
 * when product information (price, title, etc) is updated
 */

import Order from "@/backend/models/Order";

const IVA_RATE = 0.16; // Mexican 16% VAT

/**
 * Updates all active orders containing a specific product
 * @param productId - The MongoDB ObjectId of the product being updated
 * @param updatedFields - Object containing the updated fields (price, title, etc)
 */
export async function updateCartItemsForProduct(
  productId: string,
  updatedFields: any,
) {
  try {
    // Define which statuses are "active" (not completed, cancelled, etc)
    const activeStatuses = [
      "Procesando",
      "Pendiente",
      "En Proceso",
      "Confirmado",
      "Preparando",
      "Listo para Envío",
    ];

    // Find all active orders containing this product
    const affectedOrders = await Order.find({
      "orderItems.product": productId,
      orderStatus: { $in: activeStatuses },
    });

    if (affectedOrders.length === 0) {
      return {
        updated: 0,
        message: "No active orders found with this product",
      };
    }

    let totalUpdated = 0;

    // Update each affected order
    for (const order of affectedOrders) {
      let orderModified = false;
      let newTotal = 0;

      // Update the matching order items
      order.orderItems = order.orderItems.map((item: any) => {
        if (item.product?.toString() === productId) {
          orderModified = true;

          // Update price if provided
          if (updatedFields.price !== undefined) {
            item.price = updatedFields.price;
          }

          // Update name if provided
          if (updatedFields.title !== undefined) {
            item.name = updatedFields.title;
          }

          // Update image if provided
          if (updatedFields.images && updatedFields.images.length > 0) {
            item.image = updatedFields.images[0];
          }
        }

        // Recalculate subtotal for this item
        newTotal += item.price * item.quantity;
        return item;
      });

      if (orderModified) {
        // Recalculate order totals with IVA
        const subtotal = order.orderItems.reduce(
          (sum: number, item: any) => sum + item.price * item.quantity,
          0,
        );

        const totalIVA = subtotal * IVA_RATE;
        const total = subtotal + totalIVA;

        // Update order with new totals
        if (order.paymentInfo) {
          order.paymentInfo.taxPaid = totalIVA;
          order.paymentInfo.amountPaid = total;
        }

        await order.save();
        totalUpdated++;
      }
    }

    return {
      updated: totalUpdated,
      message: `Updated ${totalUpdated} active order(s) containing this product`,
    };
  } catch (error: any) {
    console.error("Error updating cart items:", error);
    return {
      updated: 0,
      error: error.message || "Failed to update cart items",
    };
  }
}

/**
 * Gets statistics about how many carts contain a specific product
 * @param productId - The MongoDB ObjectId of the product
 * @returns Object with cart statistics
 */
export async function getCartStatisticsForProduct(productId: string) {
  try {
    const activeStatuses = [
      "Procesando",
      "Pendiente",
      "En Proceso",
      "Confirmado",
      "Preparando",
      "Listo para Envío",
    ];

    // Count total orders with product
    const totalOrders = await Order.countDocuments({
      "orderItems.product": productId,
    });

    // Count active orders with product
    const activeOrders = await Order.countDocuments({
      "orderItems.product": productId,
      orderStatus: { $in: activeStatuses },
    });

    // Count total items across all orders
    const ordersWithProduct = await Order.find({
      "orderItems.product": productId,
    });

    const totalItems = ordersWithProduct.reduce((sum: number, order: any) => {
      const itemsCount = order.orderItems
        .filter((item: any) => item.product?.toString() === productId)
        .reduce((itemSum: number, item: any) => itemSum + item.quantity, 0);
      return sum + itemsCount;
    }, 0);

    return {
      totalOrders,
      activeOrders,
      completedOrders: totalOrders - activeOrders,
      totalItemsInCarts: totalItems,
    };
  } catch (error: any) {
    console.error("Error getting cart statistics:", error);
    return {
      totalOrders: 0,
      activeOrders: 0,
      completedOrders: 0,
      totalItemsInCarts: 0,
      error: error.message,
    };
  }
}
