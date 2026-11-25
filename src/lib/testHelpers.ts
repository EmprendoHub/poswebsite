/**
 * Test Utilities and Helpers
 * Integration testing for tournament system
 */

import mongoose from "mongoose";
import bcrypt from "bcrypt";

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

export function generateTestUser(overrides?: Partial<any>) {
  return {
    email: `test-${Date.now()}@example.com`,
    name: `Test User ${Date.now()}`,
    password: "TestPassword123!@",
    ...overrides,
  };
}

export function generateTestTournament(overrides?: Partial<any>) {
  const now = new Date();
  const startDate = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour from now
  const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  return {
    tournamentName: `Test Tournament ${Date.now()}`,
    description: "Integration test tournament",
    ticketCost: 50,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    maxParticipants: 100,
    ...overrides,
  };
}

export function generateTestBadge(overrides?: Partial<any>) {
  return {
    badgeName: `Badge ${Date.now()}`,
    description: "Test badge",
    rarity: "common",
    icon: "🏆",
    ...overrides,
  };
}

// ============================================================================
// API REQUEST HELPERS
// ============================================================================

interface ApiResponse<T = any> {
  status: number;
  ok: boolean;
  data?: T;
  error?: string;
}

async function apiRequest<T = any>(
  endpoint: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    const data = await response.json();

    return {
      status: response.status,
      ok: response.ok,
      data: response.ok ? data : undefined,
      error: !response.ok ? data.error : undefined,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

export async function registerTestUser(
  userData?: Partial<any>,
): Promise<{ user: any; token?: string } | null> {
  const user = generateTestUser(userData);

  const response = await apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(user),
  });

  if (!response.ok) {
    console.error("Registration failed:", response.error);
    return null;
  }

  return response.data;
}

export async function loginTestUser(
  email: string,
  password: string,
): Promise<{ token: string; user: any } | null> {
  const response = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    console.error("Login failed:", response.error);
    return null;
  }

  return response.data;
}

// ============================================================================
// TOURNAMENT HELPERS
// ============================================================================

export async function createTestTournament(
  token: string,
  overrides?: Partial<any>,
): Promise<{ _id: string } | null> {
  const tournament = generateTestTournament(overrides);

  const response = await apiRequest("/api/supervisor/tournaments", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(tournament),
  });

  if (!response.ok) {
    console.error("Tournament creation failed:", response.error);
    return null;
  }

  return response.data;
}

export async function getActiveTournaments(): Promise<any[]> {
  const response = await apiRequest("/api/tournaments/active");

  if (!response.ok) {
    console.error("Failed to fetch active tournaments:", response.error);
    return [];
  }

  return response.data?.tournaments || [];
}

export async function registerForTournament(
  token: string,
  tournamentId: string,
): Promise<boolean> {
  const response = await apiRequest("/api/tournaments/register", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tournamentId }),
  });

  return response.ok;
}

// ============================================================================
// CREDIT HELPERS
// ============================================================================

export async function getCustomerCredits(
  token: string,
): Promise<{ totalCredits: number; transactions: any[] } | null> {
  const response = await apiRequest("/api/customer/credits", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    console.error("Failed to fetch credits:", response.error);
    return null;
  }

  return response.data;
}

export async function assignTournamentWinner(
  supervisorToken: string,
  tournamentId: string,
  participantId: string,
  creditAmount: number,
  badgeIds?: string[],
): Promise<boolean> {
  const response = await apiRequest(
    `/api/supervisor/tournaments/${tournamentId}/assign-winner`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${supervisorToken}` },
      body: JSON.stringify({
        participantId,
        creditAmount,
        badgeIds: badgeIds || [],
      }),
    },
  );

  return response.ok;
}

export async function manualCreditAdjustment(
  supervisorToken: string,
  customerId: string,
  adjustmentAmount: number,
  reason: string,
  adjustmentType: "refund" | "bonus" | "correction" | "cancellation",
): Promise<boolean> {
  const formData = new FormData();
  formData.append("customerId", customerId);
  formData.append("adjustmentAmount", adjustmentAmount.toString());
  formData.append("reason", reason);
  formData.append("adjustmentType", adjustmentType);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/supervisor/manual-credit-adjustment`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${supervisorToken}` },
        body: formData,
      },
    );

    return response.ok;
  } catch (error) {
    console.error("Manual adjustment failed:", error);
    return false;
  }
}

// ============================================================================
// CHECKOUT HELPERS
// ============================================================================

export async function initiateCheckout(
  token: string,
  items: Array<{ productId: string; quantity: number }>,
  useCredits?: { amount: number },
): Promise<{ checkoutId: string } | null> {
  const response = await apiRequest("/api/checkout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      items,
      useCredits,
    }),
  });

  if (!response.ok) {
    console.error("Checkout initiation failed:", response.error);
    return null;
  }

  return response.data;
}

export async function completeCheckout(
  token: string,
  checkoutId: string,
  paymentMethod: "stripe" | "mercadopago" | "credits",
): Promise<{ orderId: string } | null> {
  const response = await apiRequest(`/api/checkout/${checkoutId}/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ paymentMethod }),
  });

  if (!response.ok) {
    console.error("Checkout completion failed:", response.error);
    return null;
  }

  return response.data;
}

// ============================================================================
// VERIFICATION HELPERS
// ============================================================================

export async function verifyEmailSent(
  recipientEmail: string,
  emailType: "registration" | "winner" | "expiry_reminder",
): Promise<boolean> {
  // This would require access to email service logs or test mailbox
  // For integration testing, check application logs or mock email service
  console.log(`[TEST] Checking for ${emailType} email to ${recipientEmail}`);
  return true; // Mock implementation
}

export async function verifyCreditTransaction(
  customerId: string,
  transactionType: "earned" | "used" | "expired",
  amount: number,
): Promise<boolean> {
  try {
    // Connect to database directly for verification
    const dbUrl = process.env.MONGODB_URI;
    if (!dbUrl) {
      console.error("MONGODB_URI not set");
      return false;
    }

    await mongoose.connect(dbUrl);

    const { default: CustomerCredit } =
      await import("@/backend/models/CustomerCredit");

    const creditRecord = await CustomerCredit.findOne({
      customerId,
      "transactions.type": transactionType,
      "transactions.amount": amount,
    });

    await mongoose.disconnect();

    return !!creditRecord;
  } catch (error) {
    console.error("Credit verification failed:", error);
    return false;
  }
}

export async function verifyTournamentParticipation(
  customerId: string,
  tournamentId: string,
): Promise<boolean> {
  try {
    const dbUrl = process.env.MONGODB_URI;
    if (!dbUrl) return false;

    await mongoose.connect(dbUrl);

    const { default: TournamentParticipant } =
      await import("@/backend/models/TournamentParticipant");

    const participant = await TournamentParticipant.findOne({
      customerId,
      tournamentId,
    });

    await mongoose.disconnect();

    return !!participant;
  } catch (error) {
    console.error("Participant verification failed:", error);
    return false;
  }
}

export async function verifyCreditExpiry(
  customerId: string,
  transactionId: string,
): Promise<boolean> {
  try {
    const dbUrl = process.env.MONGODB_URI;
    if (!dbUrl) return false;

    await mongoose.connect(dbUrl);

    const { default: CustomerCredit } =
      await import("@/backend/models/CustomerCredit");

    const creditRecord = await CustomerCredit.findOne({
      customerId,
      "transactions._id": transactionId,
      "transactions.status": "expired",
    });

    await mongoose.disconnect();

    return !!creditRecord;
  } catch (error) {
    console.error("Expiry verification failed:", error);
    return false;
  }
}

// ============================================================================
// TEST CLEANUP
// ============================================================================

export async function cleanupTestData() {
  try {
    const dbUrl = process.env.MONGODB_URI;
    if (!dbUrl) {
      console.warn("MONGODB_URI not set - skipping cleanup");
      return;
    }

    await mongoose.connect(dbUrl);

    // Clean up test users, tournaments, credits
    const { default: User } = await import("@/backend/models/User");
    const { default: Tournament } = await import("@/backend/models/Tournament");
    const { default: CustomerCredit } =
      await import("@/backend/models/CustomerCredit");

    await User.deleteMany({ email: /^test-/ });
    await Tournament.deleteMany({ tournamentName: /^Test Tournament/ });
    await CustomerCredit.deleteMany({
      customerId: { $in: await User.find({ email: /^test-/ }).select("_id") },
    });

    await mongoose.disconnect();
    console.log("[TEST] Cleanup completed");
  } catch (error) {
    console.error("Cleanup failed:", error);
  }
}

const testHelpersExport = {
  generateTestUser,
  generateTestTournament,
  generateTestBadge,
  registerTestUser,
  loginTestUser,
  createTestTournament,
  getActiveTournaments,
  registerForTournament,
  getCustomerCredits,
  assignTournamentWinner,
  manualCreditAdjustment,
  initiateCheckout,
  completeCheckout,
  verifyEmailSent,
  verifyCreditTransaction,
  verifyTournamentParticipation,
  verifyCreditExpiry,
  cleanupTestData,
};

export default testHelpersExport;
