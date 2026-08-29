"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState, StatCard, StatRow } from "@/components/shared/ui-patterns";
import {
  Search,
  Package,
  DollarSign,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Star,
  Clock,
} from "lucide-react";

type Address = {
  id: string;
  name: string;
  street1: string;
  street_number: string;
  apartment_number: string;
  city: string;
  state: string;
  area_level3: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  reference: string;
  is_origin: boolean;
  is_destination: boolean;
  is_default: boolean;
  company: string;
  carrier_verified: string[];
};

type Rate = {
  id: string;
  provider_name: string;
  provider_display_name: string;
  provider_service_name: string;
  provider_service_code: string;
  status: string;
  currency_code: string | null;
  amount: number | null;
  total: number | null;
  days: number | null;
  shipment_creation_type: string;
  success: boolean;
  error_messages: string[] | null;
};

type Quotation = {
  id: string;
  is_completed: boolean;
  rates: Rate[];
};

type Shipment = {
  id: string;
  tracking_number: string;
  carrier_name: string;
  carrier_service: string;
  status: string;
  total_amount: number;
  currency: string;
  label_url: string;
  tracking_events: Array<{
    status: string;
    description: string;
    created_at: string;
  }>;
};

export default function SkydropxPage() {
  const [activeTab, setActiveTab] = useState("quotation");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [trackingResult, setTrackingResult] = useState<Shipment | null>(null);
  const [polling, setPolling] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState<string>("");
  const [selectedDestination, setSelectedDestination] = useState<string>("");

  // Package
  const [packageForm, setPackageForm] = useState({
    weight: 2,
    height: 10,
    width: 10,
    length: 10,
  });

  // Tracking
  const [trackingNumber, setTrackingNumber] = useState("");

  // Credits
  const [credits, setCredits] = useState<{ balance: number; currency: string } | null>(null);

  // Load addresses on mount
  useEffect(() => {
    loadAddresses();
    loadCredits();
  }, []);

  async function loadCredits() {
    try {
      const res = await fetch("/api/skydropx?action=credits");
      const data = await res.json();
      if (res.ok) {
        setCredits({ balance: data.balance ?? 0, currency: data.currency ?? "MXN" });
      }
    } catch {
      // ignore
    }
  }

  // Poll for quotation completion
  useEffect(() => {
    if (!quotation || quotation.is_completed || !polling) return;

    let attempts = 0;
    const maxAttempts = 20; // 20 attempts * 3s = 60s max

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        setPolling(false);
        clearInterval(interval);
        return;
      }

      try {
        const res = await fetch(`/api/skydropx?action=quotation&id=${quotation.id}`);
        const data = await res.json();
        if (res.ok) {
          setQuotation(data);
          if (data.is_completed) {
            setPolling(false);
            clearInterval(interval);
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [quotation?.id, polling]);

  async function loadAddresses() {
    setLoadingAddresses(true);
    setError(null);
    try {
      const res = await fetch("/api/skydropx?action=addresses");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cargar direcciones");
      }

      const list: Address[] = data.addresses || [];
      setAddresses(list);

      if (list.length === 0) {
        setError("No se encontraron direcciones.");
      } else {
        const defaultOrigin = list.find((a) => a.is_origin && a.is_default);
        const defaultDest = list.find((a) => a.is_destination && a.is_default);
        if (defaultOrigin) setSelectedOrigin(defaultOrigin.id);
        if (defaultDest) setSelectedDestination(defaultDest.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar direcciones de Skydropx");
      setAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  }

  function getSelectedOriginAddress(): Address | undefined {
    return addresses.find((a) => a.id === selectedOrigin);
  }

  function getSelectedDestinationAddress(): Address | undefined {
    return addresses.find((a) => a.id === selectedDestination);
  }

  async function handleQuotation() {
    setLoading(true);
    setError(null);
    setQuotation(null);
    setShipment(null);

    const origin = getSelectedOriginAddress();
    const destination = getSelectedDestinationAddress();

    if (!origin || !destination) {
      setError("Selecciona direcciones de origen y destino");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/skydropx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quotation",
          quotation: {
            address_from: {
              address_template_id: origin.id,
              country_code: origin.country || "MX",
              postal_code: origin.postal_code,
              area_level1: origin.state,
              area_level2: origin.city,
              area_level3: origin.area_level3 || "",
            },
            address_to: {
              address_template_id: destination.id,
              country_code: destination.country || "MX",
              postal_code: destination.postal_code,
              area_level1: destination.state,
              area_level2: destination.city,
              area_level3: destination.area_level3 || "",
            },
            parcels: [{
              weight: packageForm.weight,
              height: packageForm.height,
              width: packageForm.width,
              length: packageForm.length,
              package_protected: true,
              declared_value: 100,
            }],
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cotizar");
      setQuotation(data);
      setPolling(!data.is_completed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateShipment(rateId: string) {
    setLoading(true);
    setError(null);

    const origin = getSelectedOriginAddress();
    const destination = getSelectedDestinationAddress();
    const rate = quotation?.rates?.find((r) => r.id === rateId);

    if (!origin || !destination || !rate) {
      setError("Error al obtener datos del envío");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/skydropx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "shipment",
          shipment: {
            quotation_id: quotation?.id,
            rate_id: rateId,
            carrier_name: rate?.provider_name,
            address_from: {
              address_template_id: origin.id,
              name: origin.name || "",
              company: origin.company || "",
              street1: origin.street1 || "",
              street_number: origin.street_number || "",
              apartment_number: origin.apartment_number || "",
              postal_code: origin.postal_code || "",
              area_level1: origin.state || "",
              area_level2: origin.city || "",
              area_level3: origin.area_level3 || "",
              country_code: origin.country || "MX",
              phone: origin.phone || "",
              email: origin.email || "",
              reference: origin.reference || "",
            },
            address_to: {
              address_template_id: destination.id,
              name: destination.name || "",
              company: destination.company || "",
              street1: destination.street1 || "",
              street_number: destination.street_number || "",
              apartment_number: destination.apartment_number || "",
              postal_code: destination.postal_code || "",
              area_level1: destination.state || "",
              area_level2: destination.city || "",
              area_level3: destination.area_level3 || "",
              country_code: destination.country || "MX",
              phone: destination.phone || "",
              email: destination.email || "",
              reference: destination.reference || "",
            },
            consignment_note: "31391500", // Maquinados de precisión estándar
            package_type: "4G", // Caja de cartón
            total: rate.total,
            parcels: [{
              weight: packageForm.weight,
              height: packageForm.height,
              width: packageForm.width,
              length: packageForm.length,
              declared_value: 100,
            }],
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear envío");
      setShipment(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function handleTracking() {
    setLoading(true);
    setError(null);
    setTrackingResult(null);

    try {
      const res = await fetch(`/api/skydropx?action=tracking&number=${trackingNumber}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al rastrear");
      setTrackingResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  const originAddresses = addresses.filter((a) => a.is_origin);
  const destinationAddresses = addresses.filter((a) => a.is_destination);
  const completedRates = quotation?.rates?.filter((r) => r.total !== null && r.total > 0) || [];
  const pendingRates = quotation?.rates?.filter((r) => r.status === "pending" && r.total === null) || [];
  const failedRates = quotation?.rates?.filter((r) => r.status === "failed" || r.error_messages) || [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Skydropx"
        description="Cotiza, crea y rastrea envíos con las mejores paqueterías"
        actions={
          <Button variant="outline" size="sm" onClick={loadAddresses} disabled={loadingAddresses}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loadingAddresses ? "animate-spin" : ""}`} />
            Recargar direcciones
          </Button>
        }
      />

      <StatRow>
        <StatCard label="Origen" value={originAddresses.length} icon={<MapPin className="h-4 w-4" />} />
        <StatCard label="Destino" value={destinationAddresses.length} icon={<MapPin className="h-4 w-4" />} />
        <StatCard label="Saldo Skydropx" value={`${credits?.currency ?? "MXN"} $${credits?.balance?.toFixed(2) ?? "0.00"}`} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Paqueterías" value="20+" icon={<Package className="h-4 w-4" />} />
      </StatRow>

      <div className="flex gap-2">
        <Button variant={activeTab === "quotation" ? "default" : "outline"} onClick={() => setActiveTab("quotation")}>
          Cotizar
        </Button>
        <Button variant={activeTab === "tracking" ? "default" : "outline"} onClick={() => setActiveTab("tracking")}>
          Rastrear
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {activeTab === "quotation" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Dirección de origen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAddresses ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando...
                  </div>
                ) : originAddresses.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No tienes direcciones de origen.</div>
                ) : (
                  <div className="space-y-2">
                    {originAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        onClick={() => setSelectedOrigin(addr.id)}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          selectedOrigin === addr.id ? "border-blue-500 bg-blue-50" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{addr.name}</p>
                          {addr.is_default && <Star className="h-3 w-3 text-amber-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {addr.street1} {addr.street_number}, {addr.city}, {addr.state} {addr.postal_code}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Dirección de destino
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAddresses ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando...
                  </div>
                ) : destinationAddresses.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No tienes direcciones de destino.</div>
                ) : (
                  <div className="space-y-2">
                    {destinationAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        onClick={() => setSelectedDestination(addr.id)}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          selectedDestination === addr.id ? "border-blue-500 bg-blue-50" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{addr.name}</p>
                          {addr.is_default && <Star className="h-3 w-3 text-amber-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {addr.street1} {addr.street_number}, {addr.city}, {addr.state} {addr.postal_code}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Paquete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <Label>Peso (kg)</Label>
                  <Input type="number" value={packageForm.weight} onChange={(e) => setPackageForm({ ...packageForm, weight: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Alto (cm)</Label>
                  <Input type="number" value={packageForm.height} onChange={(e) => setPackageForm({ ...packageForm, height: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Ancho (cm)</Label>
                  <Input type="number" value={packageForm.width} onChange={(e) => setPackageForm({ ...packageForm, width: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Largo (cm)</Label>
                  <Input type="number" value={packageForm.length} onChange={(e) => setPackageForm({ ...packageForm, length: Number(e.target.value) })} />
                </div>
              </div>
              <Button onClick={handleQuotation} disabled={loading || loadingAddresses || !selectedOrigin || !selectedDestination} className="mt-4">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
                Cotizar envío
              </Button>
            </CardContent>
          </Card>

          {quotation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Cotización
                  {polling && (
                    <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                      <Clock className="h-3 w-3 animate-pulse" />
                      Esperando tarifas...
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completedRates.length === 0 && pendingRates.length > 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Clock className="h-4 w-4 animate-pulse" />
                    Procesando cotización con {quotation.rates.length} paqueterías...
                  </div>
                ) : null}

                {quotation.rates.length === 0 ? (
                  <EmptyState icon={<AlertCircle className="h-8 w-8" />} title="Sin tarifas" description="No se encontraron opciones para este envío." />
                ) : (
                  <div className="space-y-2">
                    {completedRates.length > 0 && (
                      <p className="text-sm font-medium text-green-600 mb-2">✓ {completedRates.length} tarifas disponibles</p>
                    )}
                    {quotation.rates
                      .sort((a, b) => {
                        // Sort: completed first, then pending, then by price
                        if (a.total && !b.total) return -1;
                        if (!a.total && b.total) return 1;
                        return (a.total ?? 0) - (b.total ?? 0);
                      })
                      .map((rate) => {
                        const isCompleted = rate.total !== null && rate.total > 0;
                        return (
                          <div key={rate.id} className={`flex items-center justify-between rounded-lg border p-3 ${isCompleted ? "" : "opacity-60"}`}>
                            <div>
                              <p className="font-medium">{rate.provider_display_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {rate.provider_service_name} · {rate.days ? `${rate.days} días` : "N/A"}
                                {!isCompleted && " · Procesando..."}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {isCompleted ? (
                                <>
                                  <span className="font-bold">
                                    {rate.currency_code ?? "MXN"} ${Number(rate.total ?? 0).toFixed(2)}
                                  </span>
                                  <Button size="sm" onClick={() => handleCreateShipment(rate.id)} disabled={loading}>
                                    Crear envío
                                  </Button>
                                </>
                              ) : (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {shipment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" /> Envío creado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Guía</p>
                    <p className="font-mono font-bold">{shipment.tracking_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Paquetería</p>
                    <p className="font-medium">{shipment.carrier_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-bold">{shipment.currency} ${shipment.total_amount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <Badge>{shipment.status}</Badge>
                  </div>
                </div>
                {shipment.label_url && (
                  <a href={shipment.label_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm hover:bg-muted">
                    Descargar etiqueta
                  </a>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "tracking" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-4 w-4" /> Rastrear envío
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Número de guía..." className="flex-1" />
                <Button onClick={handleTracking} disabled={loading || !trackingNumber}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {trackingResult && (
            <Card>
              <CardHeader><CardTitle>Resultado</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Guía</p>
                    <p className="font-mono font-bold">{trackingResult.tracking_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Paquetería</p>
                    <p className="font-medium">{trackingResult.carrier_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <Badge>{trackingResult.status}</Badge>
                  </div>
                </div>
                {trackingResult.tracking_events?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Historial</p>
                    <div className="space-y-2">
                      {trackingResult.tracking_events.map((event, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500" />
                          <div>
                            <p>{event.description}</p>
                            <p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString("es-MX")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
