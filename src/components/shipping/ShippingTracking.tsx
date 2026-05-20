"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

interface TrackingEvent {
  date: string;
  time: string;
  status: string;
  location: string;
  description: string;
}

interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery: string;
  currentLocation: string;
  events: TrackingEvent[];
  trackingUrl?: string;
}

interface ShippingTrackingProps {
  trackingNumber: string;
  orderId?: string;
  className?: string;
}

const ShippingTracking: React.FC<ShippingTrackingProps> = ({
  trackingNumber,
  orderId,
  className = "",
}) => {
  const [tracking, setTracking] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrackingInfo = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/shipping/tracking?trackingNumber=${encodeURIComponent(
          trackingNumber
        )}`
      );
      const data = await response.json();

      if (data.success) {
        setTracking(data.tracking);
      } else {
        setError(data.message || "Error al obtener información de tracking");
      }
    } catch (err: any) {
      console.error("Error fetching tracking info:", err);
      setError("Error de conexión al obtener información de tracking");
    } finally {
      setLoading(false);
    }
  }, [trackingNumber]);

  useEffect(() => {
    if (trackingNumber) {
      fetchTrackingInfo();
    }
  }, [trackingNumber, fetchTrackingInfo]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
      case "entregado":
        return "bg-green-500";
      case "in_transit":
      case "en_transito":
        return "bg-blue-500";
      case "out_for_delivery":
      case "en_reparto":
        return "bg-orange-500";
      case "pending":
      case "pendiente":
        return "bg-yellow-500";
      case "exception":
      case "problema":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
      case "entregado":
        return <CheckCircle className="w-4 h-4" />;
      case "in_transit":
      case "en_transito":
        return <Truck className="w-4 h-4" />;
      case "out_for_delivery":
      case "en_reparto":
        return <Package className="w-4 h-4" />;
      case "pending":
      case "pendiente":
        return <Clock className="w-4 h-4" />;
      case "exception":
      case "problema":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Seguimiento de Envío
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Obteniendo información de tracking...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Seguimiento de Envío
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <Button onClick={fetchTrackingInfo} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!tracking) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Seguimiento de Envío
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            No hay información de tracking disponible
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Seguimiento de Envío
          </div>
          {tracking.trackingUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(tracking.trackingUrl, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver en sitio de paquetería
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Summary */}
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge
                className={`${getStatusColor(tracking.status)} text-white`}
              >
                {getStatusIcon(tracking.status)}
                <span className="ml-1 capitalize">{tracking.status}</span>
              </Badge>
            </div>
            <span className="text-sm text-gray-500">
              #{tracking.trackingNumber}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Paquetería</p>
              <p className="font-semibold">{tracking.carrier}</p>
            </div>
            <div>
              <p className="text-gray-600">Entrega estimada</p>
              <p className="font-semibold">
                {new Date(tracking.estimatedDelivery).toLocaleDateString(
                  "es-MX"
                )}
              </p>
            </div>
          </div>

          {tracking.currentLocation && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>Ubicación actual: {tracking.currentLocation}</span>
            </div>
          )}
        </div>

        {/* Tracking Events */}
        <div>
          <h4 className="font-semibold mb-3">Historial de movimientos</h4>
          <div className="space-y-3">
            {tracking.events.map((event, index) => (
              <div
                key={index}
                className="flex gap-3 pb-3 border-b last:border-b-0"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{event.status}</p>
                    <span className="text-xs text-gray-500">
                      {event.date} {event.time}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    {event.description}
                  </p>
                  {event.location && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {event.location}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-center">
          <Button
            onClick={fetchTrackingInfo}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Actualizar información
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShippingTracking;
