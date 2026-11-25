export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";
import Tournament from "@/backend/models/Tournament";
import TournamentParticipant from "@/backend/models/TournamentParticipant";
import User from "@/backend/models/User";
import Customer from "@/backend/models/Customer";
import Order from "@/backend/models/Order";
import CashRegisterSession from "@/backend/models/CashRegisterSession";
import CashRegisterMovement from "@/backend/models/CashRegisterMovement";
import Store from "@/backend/models/Store";
import { sendTournamentParticipantAddedEmail } from "@/lib/tournamentEmailService";

/**
 * POST /api/supervisor/tournaments/:id/add-participant
 * Manually add a participant to a tournament (organizador only)
 * Can add existing customer or create a new one
 * Creates a cash register movement for the organizador's store
 * Sends confirmation email to the participant
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?._id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    // Clear Mongoose model cache to ensure schema is fresh
    if ((global as any).mongoose?.models?.TournamentParticipant) {
      delete (global as any).mongoose.models.TournamentParticipant;
    }
    if ((global as any).mongoose?.modelSchemas?.TournamentParticipant) {
      delete (global as any).mongoose.modelSchemas.TournamentParticipant;
    }

    // Check organizador role
    const user = await User.findById(session.user._id);
    if (user?.role !== "organizador") {
      return NextResponse.json(
        { error: "Se requiere rol de organizador" },
        { status: 403 },
      );
    }

    const { id: tournamentId } = await context.params;
    const body = await req.json();
    const {
      participantName,
      email,
      customerId,
      ticketCost,
      payMethod = "EFECTIVO",
    } = body;

    console.log("[ADD-PARTICIPANT] Request body:", {
      participantName,
      email,
      customerId,
      ticketCost,
      payMethod,
      tournamentId,
    });

    // Validate required fields
    if (!participantName || !email) {
      console.error("[ADD-PARTICIPANT] Missing required fields:", {
        participantName,
        email,
      });
      return NextResponse.json(
        { error: "Nombre y email son requeridos" },
        { status: 400 },
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("[ADD-PARTICIPANT] Invalid email:", email);
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    // Verify tournament exists
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.error("[ADD-PARTICIPANT] Tournament not found:", tournamentId);
      return NextResponse.json(
        { error: "Torneo no encontrado" },
        { status: 404 },
      );
    }

    console.log("[ADD-PARTICIPANT] Tournament found:", {
      name: tournament.tournamentName,
      ticketCost: tournament.ticketCost,
    });

    // Check if participant already exists in this tournament
    const existingParticipant = await TournamentParticipant.findOne({
      tournamentId,
      email,
    });

    if (existingParticipant) {
      console.error("[ADD-PARTICIPANT] Participant already registered:", email);
      return NextResponse.json(
        { error: "Este participante ya está registrado en el torneo" },
        { status: 400 },
      );
    }

    // Handle customer: use existing or create new
    let customer = null;
    let customerWasCreated = false;
    let customerWasExisting = false;

    if (customerId) {
      console.log(
        "[ADD-PARTICIPANT] Looking for existing customer by ID:",
        customerId,
      );
      customer = await Customer.findById(customerId);
      if (!customer) {
        console.error("[ADD-PARTICIPANT] Customer not found:", customerId);
        return NextResponse.json(
          { error: "Cliente no encontrado" },
          { status: 404 },
        );
      }
      console.log("[ADD-PARTICIPANT] Customer found by ID:", {
        name: customer.name,
        email: customer.email,
      });
      customerWasExisting = true;
    } else {
      // First check if customer already exists by email
      console.log(
        "[ADD-PARTICIPANT] Looking for existing customer by email:",
        email,
      );
      customer = await Customer.findOne({ email });

      if (customer) {
        console.log(
          "[ADD-PARTICIPANT] Customer already exists for this email:",
          {
            _id: customer._id,
            name: customer.name,
            email: customer.email,
          },
        );
        customerWasExisting = true;
      } else {
        // Create new customer
        console.log("[ADD-PARTICIPANT] Creating new customer:", {
          name: participantName,
          email,
        });
        try {
          customer = new Customer({
            name: participantName.split(" ")[0] || participantName,
            last_name: participantName.split(" ").slice(1).join(" ") || "",
            email,
          });
          await customer.save();
          console.log("[ADD-PARTICIPANT] Customer created:", customer._id);
          customerWasCreated = true;
        } catch (customerError: any) {
          if (customerError.code === 11000) {
            // Handle race condition: another request created this customer
            console.log(
              "[ADD-PARTICIPANT] Race condition: customer created by another request, fetching it...",
            );
            customer = await Customer.findOne({ email });
            if (customer) {
              console.log(
                "[ADD-PARTICIPANT] Customer found after race condition:",
                customer._id,
              );
              customerWasExisting = true;
            } else {
              console.error(
                "[ADD-PARTICIPANT] Failed to find customer after E11000 error:",
                customerError,
              );
              return NextResponse.json(
                { error: "Error al crear el cliente" },
                { status: 500 },
              );
            }
          } else {
            throw customerError;
          }
        }
      }
    }

    // Create new participant
    const newParticipant = new TournamentParticipant({
      tournamentId,
      participantName,
      email,
      status: "active",
      registrationDate: new Date(),
      confirmationEmailSent: false,
      customerId: customer._id,
    });

    console.log("[ADD-PARTICIPANT] Creating participant:", {
      participantName,
      email,
      customerId: customer._id,
    });

    // Bypass Mongoose validation cache issues by using collection directly if needed
    try {
      await newParticipant.save();
      console.log("[ADD-PARTICIPANT] Participant saved:", newParticipant._id);
    } catch (saveError: any) {
      // If validation fails due to userId being required, try inserting directly
      if (
        saveError.message &&
        saveError.message.includes("userId") &&
        saveError.message.includes("required")
      ) {
        console.warn(
          "[ADD-PARTICIPANT] Falling back to direct insert due to userId validation:",
          saveError.message,
        );
        const result = await TournamentParticipant.collection.insertOne({
          tournamentId: newParticipant.tournamentId,
          participantName: newParticipant.participantName,
          email: newParticipant.email,
          status: newParticipant.status,
          registrationDate: newParticipant.registrationDate,
          confirmationEmailSent: newParticipant.confirmationEmailSent,
          customerId: newParticipant.customerId,
          points: 0,
        });
        // Update the _id to reflect the actual document
        newParticipant._id = result.insertedId;
        console.log(
          "[ADD-PARTICIPANT] Participant inserted directly:",
          result.insertedId,
        );
      } else {
        console.error("[ADD-PARTICIPANT] Error saving participant:", saveError);
        throw saveError;
      }
    }

    // Create Order for the customer
    console.log("[ADD-PARTICIPANT] Creating order for customer:", {
      customerName: participantName,
      email,
      ticketCost: tournament.ticketCost,
    });

    try {
      // Get store slug if available
      let storeSlug = "pos";
      if (user.assignedStore) {
        const store = await Store.findById(user.assignedStore);
        if (store?.slug) {
          storeSlug = store.slug;
        }
      }

      // Adjust date to local timezone (Mexico City: UTC-6)
      const now = new Date();
      const localDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);

      const newOrder = new Order({
        customer: customer._id,
        customerName: participantName,
        email,
        orderItems: [
          {
            product: tournament._id,
            variation: "ticket",
            type: "digital",
            name: `Boleto Torneo ${tournament.ticketCost || 0}`,
            quantity: 1,
            price: tournament.ticketCost || 0,
            image: tournament.coverImage || "",
          },
        ],
        paymentInfo: {
          id:
            payMethod === "EFECTIVO"
              ? "EFECTIVO"
              : `tournament-${tournamentId}-${Date.now()}`,
          status: "paid",
          taxPaid: 0,
          amountPaid: tournament.ticketCost || 0,
        },
        orderStatus: "Entregado",
        fulfillmentType: "shipping",
        payMethod: payMethod || "N/A",
        posRequestedID: `torneo-${tournamentId}-${Date.now()}`,
        branch: storeSlug,
        storeId: user.assignedStore,
        createdAt: localDate,
        updatedAt: localDate,
        comment: `Entrada agregada manualmente para el torneo: ${tournament.tournamentName} (${payMethod})`,
      });

      await newOrder.save();
      console.log("[ADD-PARTICIPANT] Order created:", {
        orderId: newOrder._id,
        orderId_num: newOrder.orderId,
        productType: "digital",
        payMethod,
        branch: storeSlug,
      });
    } catch (orderError) {
      console.error("[ADD-PARTICIPANT] Error creating order:", orderError);
      // Continue with the flow even if order creation fails
    }

    // Update tournament participant count
    if (!tournament.totalParticipants) {
      tournament.totalParticipants = 0;
    }
    tournament.totalParticipants += 1;

    // Recalculate total pool
    if (tournament.ticketCost) {
      tournament.totalPool =
        tournament.totalParticipants * tournament.ticketCost;
    }

    await tournament.save();
    console.log("[ADD-PARTICIPANT] Tournament updated:", {
      totalParticipants: tournament.totalParticipants,
      totalPool: tournament.totalPool,
    });

    // Create cash register movement if organizador has an assigned store and ticketCost is provided
    if (user.assignedStore && ticketCost) {
      console.log("[ADD-PARTICIPANT] Creating cash register movement:", {
        store: user.assignedStore,
        ticketCost,
      });
      try {
        // Find or create an open cash register session
        let session = await CashRegisterSession.findOne({
          store: user.assignedStore,
          status: "open",
        });

        if (!session) {
          console.log("[ADD-PARTICIPANT] Creating new cash register session");
          session = new CashRegisterSession({
            store: user.assignedStore,
            openedBy: user._id,
            openedByName: user.name || "Sistema",
            openedAt: new Date(),
            status: "open",
            openingBalance: 0,
          });
          await session.save();
          console.log(
            "[ADD-PARTICIPANT] Cash register session created:",
            session._id,
          );
        } else {
          console.log(
            "[ADD-PARTICIPANT] Using existing cash register session:",
            session._id,
          );
        }

        // Create cash register movement with proper payment method and amounts
        let cashAmount = 0;
        let cardAmount = 0;

        if (payMethod === "EFECTIVO") {
          cashAmount = ticketCost;
        } else if (payMethod === "TERMINAL") {
          cardAmount = ticketCost;
        } else if (payMethod === "TRANSFERENCIA") {
          cardAmount = ticketCost;
        } else if (payMethod === "MIXTO") {
          // For MIXTO, split 50-50 between cash and card
          cashAmount = ticketCost / 2;
          cardAmount = ticketCost / 2;
        }

        const movement = new CashRegisterMovement({
          session: session._id,
          store: user.assignedStore,
          type: "sale",
          payMethod: payMethod || "N/A",
          cashAmount,
          cardAmount,
          totalAmount: ticketCost,
          createdBy: user._id,
          createdByName: user.name || "Sistema",
          notes: `Venta de entrada para torneo: ${tournament.tournamentName} (${payMethod})`,
        });

        await movement.save();
        console.log("[ADD-PARTICIPANT] Cash register movement created:", {
          movementId: movement._id,
          payMethod,
          cashAmount,
          cardAmount,
          totalAmount: ticketCost,
        });
      } catch (cashError) {
        console.warn(
          "[ADD-PARTICIPANT] Warning: Failed to create cash register movement:",
          cashError,
        );
        // Continue with participant creation even if cash movement fails
      }
    } else {
      console.warn("[ADD-PARTICIPANT] Skipping cash register movement:", {
        hasStore: !!user.assignedStore,
        hasTicketCost: !!ticketCost,
      });
    }

    // Format dates for email
    const startDate = new Date(tournament.startDate).toLocaleDateString(
      "es-MX",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    const endDate = new Date(tournament.endDate).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Send confirmation email
    const emailResult = await sendTournamentParticipantAddedEmail({
      recipientEmail: email,
      customerName: participantName,
      tournamentName: tournament.tournamentName,
      ticketCost: tournament.ticketCost || 0,
      startDate,
      endDate,
      totalParticipants: tournament.totalParticipants,
      totalPool: tournament.totalPool || 0,
    });

    if (!emailResult.success) {
      console.warn(
        "[ADD-PARTICIPANT] Warning: Email failed to send but participant was created:",
        emailResult.error,
      );
    }

    console.log("[ADD-PARTICIPANT] SUCCESS: Participant added successfully", {
      participantId: newParticipant._id,
      participantName,
      email,
      customerId: customer._id,
      customerWasCreated,
      customerWasExisting,
    });

    // Build appropriate notification message
    let notificationMessage = "Participante agregado exitosamente";
    if (customerWasCreated) {
      notificationMessage = `Participante agregado exitosamente. Se creó una nueva cuenta para ${participantName}.`;
    } else if (customerWasExisting) {
      notificationMessage = `Participante agregado exitosamente usando la cuenta existente de ${customer.name || participantName}.`;
    }

    return NextResponse.json(
      {
        success: true,
        message: notificationMessage,
        participant: {
          _id: newParticipant._id,
          participantName: newParticipant.participantName,
          email: newParticipant.email,
          status: newParticipant.status,
          customerId: customer._id,
        },
        customerStatus: customerWasCreated ? "created" : "existing",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[ADD-PARTICIPANT] CRITICAL ERROR:", {
      message: error instanceof Error ? error.message : String(error),
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Error al agregar participante" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/supervisor/tournaments/:id/add-participant?search=...
 * Search for existing customers by name or email
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    if (!session?.user?._id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    // Check organizador role
    const user = await User.findById(session.user._id);
    if (user?.role !== "organizador") {
      return NextResponse.json(
        { error: "Se requiere rol de organizador" },
        { status: 403 },
      );
    }

    // Get search query
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get("search") || "";

    if (!searchQuery || searchQuery.length < 2) {
      return NextResponse.json(
        { error: "Búsqueda debe tener al menos 2 caracteres" },
        { status: 400 },
      );
    }

    // Search customers by name or email
    const customers = await Customer.find({
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { last_name: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
      ],
    }).limit(10);

    return NextResponse.json(
      {
        success: true,
        customers: customers.map((customer) => ({
          _id: customer._id,
          name: customer.name,
          last_name: customer.last_name,
          email: customer.email,
          fullName: `${customer.name} ${customer.last_name || ""}`.trim(),
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error searching customers:", error);
    return NextResponse.json(
      { error: "Error al buscar clientes" },
      { status: 500 },
    );
  }
}
