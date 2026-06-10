// Envía.com API service
interface EnviaConfig {
  apiToken: string;
  baseUrl: string;
  environment: "test" | "production";
}

// Function to normalize state names to Envía.com state codes
function normalizeStateName(state: string): string {
  const stateMap: { [key: string]: string } = {
    // Estados de México
    Aguascalientes: "AGU",
    "Baja California": "BCN",
    "Baja California Sur": "BCS",
    Campeche: "CAM",
    Chiapas: "CHP",
    Chihuahua: "CHH",
    "Ciudad de México": "CMX",
    CDMX: "CMX",
    "Mexico City": "CMX",
    Coahuila: "COA",
    Colima: "COL",
    Durango: "DUR",
    Guanajuato: "GUA",
    Guerrero: "GRO",
    Hidalgo: "HID",
    Jalisco: "JAL",
    México: "MEX",
    "Estado de México": "MEX",
    Michoacán: "MICH",
    Morelos: "MOR",
    Nayarit: "NAY",
    "Nuevo León": "NLE",
    Oaxaca: "OAX",
    Puebla: "PUE",
    Querétaro: "QUE",
    "Quintana Roo": "ROO",
    "San Luis Potosí": "SLP",
    Sinaloa: "SIN",
    Sonora: "SON",
    Tabasco: "TAB",
    Tamaulipas: "TAM",
    Tlaxcala: "TLA",
    Veracruz: "VER",
    Yucatán: "YUC",
    Zacatecas: "ZAC",
  };

  // If already a code (3 characters), return as is
  if (state.length === 3) {
    return state.toUpperCase();
  }

  // Try to find in map
  return stateMap[state] || state.substring(0, 3).toUpperCase();
}

interface Address {
  name: string;
  company?: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
  email?: string;
  reference?: string;
}

interface Package {
  weight: number; // in kg
  length: number; // in cm
  width: number; // in cm
  height: number; // in cm
  declared_value: number; // in MXN
  content: string;
  type: string; // "box", "envelope", etc.
  quantity?: number; // optional quantity field
}

interface ShippingQuoteRequest {
  origin: Address;
  destination: Address;
  packages: Package[];
  insurance?: boolean;
  additional_services?: string[];
}

interface ShippingQuote {
  carrier_name: string;
  service_name: string;
  price: number;
  currency: string;
  estimated_days: number;
  service_id: number;
  carrier_id: number;
  delivery_estimate?: string;
  tracking_url?: string;
}

interface ShipmentRequest {
  origin: Address;
  destination: Address;
  packages: Package[];
  shipment: {
    type: number;
    carrier: string;
    service: string;
  };
}

interface ShipmentResponse {
  tracking_number: string;
  carrier_name: string;
  service_name: string;
  label_url: string;
  cost: number;
  currency: string;
  estimated_delivery: string;
}

interface TrackingInfo {
  tracking_number: string;
  status: string;
  events: Array<{
    date: string;
    status: string;
    location: string;
    description: string;
  }>;
}

interface EnviaQuoteResponse {
  data: Array<{
    carrier_name: string;
    service_name: string;
    price: number;
    currency: string;
    estimated_days: number;
    service_id: number;
    carrier_id: number;
    delivery_estimate?: string;
  }>;
}

interface EnviaShipmentResponse {
  data: {
    tracking_number: string;
    carrier_name: string;
    service_name: string;
    label_file: string;
    cost: number;
    currency: string;
    estimated_delivery: string;
  };
}

interface EnviaTrackingResponse {
  data: {
    tracking_number: string;
    status: string;
    events: Array<{
      date: string;
      status: string;
      location: string;
      description: string;
    }>;
  };
}

class EnviaService {
  private config: EnviaConfig;

  constructor(config: EnviaConfig) {
    this.config = config;
  }

  private async makeRequest(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    data?: any,
  ): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;

    console.log(`🚚 Envía.com API ${method} request:`, {
      url,
      data: data ? JSON.stringify(data, null, 2) : "No data",
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
        "Content-Type": "application/json",
      },
    });

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          "Content-Type": "application/json",
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      console.log(`📡 Envía.com API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Envía.com API error:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(
          `Envía.com API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const result = await response.json();
      console.log(
        `✅ Envía.com API success response:`,
        JSON.stringify(result, null, 2),
      );

      return result;
    } catch (error) {
      console.error(`💥 Envía.com API request failed:`, error);
      throw error;
    }
  }

  async getQuotes(request: ShippingQuoteRequest): Promise<ShippingQuote[]> {
    try {
      console.log("📦 Getting shipping quotes from Envía.com...");
      console.log("Request data:", JSON.stringify(request, null, 2));

      // Envía.com quote endpoint - using exact API format
      const quoteRequest = {
        origin: {
          name: request.origin.name,
          company: request.origin.company || "",
          email: request.origin.email || "",
          phone: request.origin.phone || "",
          street: request.origin.street,
          number: request.origin.number,
          city: request.origin.city,
          state: normalizeStateName(request.origin.state),
          country: request.origin.country || "MX",
          postalCode: request.origin.postal_code,
        },
        destination: {
          name: request.destination.name,
          phone: request.destination.phone || "",
          street: request.destination.street,
          number: request.destination.number,
          city: request.destination.city,
          state: normalizeStateName(request.destination.state),
          country: request.destination.country || "MX",
          postalCode: request.destination.postal_code,
        },
        packages: request.packages.map((pkg) => ({
          type: pkg.type || "box",
          content: pkg.content || "Merchandise",
          amount: pkg.quantity || 1,
          declaredValue: pkg.declared_value || 0,
          lengthUnit: "CM",
          weightUnit: "KG",
          weight: pkg.weight,
          dimensions: {
            length: Math.round(pkg.length),
            width: Math.round(pkg.width),
            height: Math.round(pkg.height),
          },
        })),
        shipment: {
          type: 1,
          carrier: "fedex",
          service: "express",
        },
      };

      console.log(
        "Sending quote request to Envía.com:",
        JSON.stringify(quoteRequest, null, 2),
      );

      const response = await this.makeRequest(
        "/ship/rate",
        "POST",
        quoteRequest,
      );

      console.log(
        "Received response from Envía.com:",
        JSON.stringify(response, null, 2),
      );

      // Check if we got valid quotes
      if (response && response.data && Array.isArray(response.data)) {
        const quotes: ShippingQuote[] = response.data.map((quote: any) => ({
          carrier_name: quote.carrier || quote.carrierName,
          service_name: quote.service || quote.serviceName,
          price: parseFloat(quote.totalPrice || quote.price || 0),
          currency: quote.currency || "MXN",
          estimated_days: parseInt(
            quote.deliveryEstimate || quote.estimatedDays || 5,
          ),
          service_id: quote.serviceId || quote.service_id,
          carrier_id: quote.carrierId || quote.carrier_id,
          delivery_estimate:
            quote.deliveryEstimate || `${quote.estimatedDays || 5} días`,
        }));

        if (quotes.length > 0) {
          console.log("✅ Successfully retrieved quotes from Envía.com");
          return quotes;
        }
      }

      console.log("⚠️ No valid quotes received, using fallback");
      return this.generateFallbackQuotes(request);
    } catch (error: any) {
      console.error("❌ Error getting quotes from Envía.com:", error.message);
      console.log("🔄 Falling back to estimated quotes");
      // Return fallback quotes on error
      return this.generateFallbackQuotes(request);
    }
  }

  async createShipment(request: ShipmentRequest): Promise<ShipmentResponse> {
    try {
      console.log("📦 Creating shipment with Envía.com...");
      console.log(request);
      // Transform request to Envía.com format
      const enviaRequest = {
        origin: request.origin,
        destination: request.destination,
        packages: request.packages,
        shipment: request.shipment,
      };

      const response: EnviaShipmentResponse = await this.makeRequest(
        "/ship/generate",
        "POST",
        enviaRequest,
      );

      return {
        tracking_number: response.data.tracking_number,
        carrier_name: response.data.carrier_name,
        service_name: response.data.service_name,
        label_url: response.data.label_file,
        cost: response.data.cost,
        currency: response.data.currency,
        estimated_delivery: response.data.estimated_delivery,
      };
    } catch (error) {
      console.error("❌ Error creating shipment with Envía.com:", error);
      throw error;
    }
  }

  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    try {
      console.log("🔍 Tracking shipment with Envía.com:", trackingNumber);

      const response: EnviaTrackingResponse = await this.makeRequest(
        `/guide/${trackingNumber}`,
      );

      return {
        tracking_number: response.data.tracking_number,
        status: response.data.status,
        events: response.data.events,
      };
    } catch (error) {
      console.error("❌ Error tracking shipment with Envía.com:", error);
      throw error;
    }
  }

  async getCarriers(countryCode: string = "MX"): Promise<any[]> {
    try {
      console.log("🚛 Getting available carriers from Envía.com...");

      const response = await this.makeRequest(
        `/available-carrier-detailed/${countryCode}/0/1`,
      );

      return response.data || [];
    } catch (error) {
      console.error("❌ Error getting carriers from Envía.com:", error);
      return [];
    }
  }

  private generateFallbackQuotes(
    request: ShippingQuoteRequest,
  ): ShippingQuote[] {
    console.log("🔄 Generating fallback quotes for Envía.com...");

    const totalWeight = request.packages.reduce(
      (sum, pkg) => sum + pkg.weight,
      0,
    );
    const totalValue = request.packages.reduce(
      (sum, pkg) => sum + pkg.declared_value,
      0,
    );

    // Base shipping cost calculation
    const baseWeight = Math.max(1, Math.ceil(totalWeight));
    const baseCost = 200; // Base cost in MXN
    const perKgCost = 15; // Cost per kg in MXN
    const insuranceCost = request.insurance ? totalValue * 0.005 : 0; // 0.5% of value

    const quotes: ShippingQuote[] = [
      {
        carrier_name: "FedEx",
        service_name: "Express",
        price: baseCost + baseWeight * perKgCost,
        currency: "MXN",
        estimated_days: 2,
        service_id: 2,
        carrier_id: 2,
        delivery_estimate: "1-2 días hábiles",
      },
    ];

    console.log("📋 Generated fallback quotes:", quotes);
    return quotes;
  }
}

// Default configuration
function createEnviaService(): EnviaService {
  // Use test mode for localhost, live mode for production
  const isLocalhost =
    process.env.NEXTAUTH_URL?.includes("localhost") ||
    process.env.NODE_ENV === "development";

  const config: EnviaConfig = {
    apiToken: isLocalhost
      ? process.env.ENVIA_API_TOKEN_TEST || process.env.ENVIA_API_TOKEN || ""
      : process.env.ENVIA_API_TOKEN_LIVE || process.env.ENVIA_API_TOKEN || "",
    baseUrl: isLocalhost
      ? "https://api-test.envia.com"
      : "https://api.envia.com",
    environment: isLocalhost ? "test" : "production",
  };

  if (!config.apiToken) {
    console.warn(
      "⚠️ ENVIA_API_TOKEN not configured, some features may not work",
    );
  }

  return new EnviaService(config);
}

// Export the service instance and types
export default createEnviaService();
export {
  EnviaService,
  createEnviaService,
  type EnviaConfig,
  type Address,
  type Package,
  type ShippingQuoteRequest,
  type ShippingQuote,
  type ShipmentRequest,
  type ShipmentResponse,
  type TrackingInfo,
};
