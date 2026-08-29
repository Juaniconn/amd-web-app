import "server-only";
import { skydropxGet, skydropxPost } from "./skydropx-client";

export type AddressData = {
  address_template_id: string;
  name: string;
  company: string;
  street1: string;
  street_number: string;
  apartment_number?: string;
  postal_code: string;
  area_level1: string;
  area_level2: string;
  area_level3?: string;
  country_code: string;
  phone: string;
  email: string;
  reference?: string;
};

export type ParcelData = {
  weight: number;
  height: number;
  width: number;
  length: number;
  declared_value?: number;
};

export type ShipmentRequest = {
  quotation: {
    address_from: AddressData;
    address_to: AddressData;
    parcels: ParcelData[];
    requested_carriers?: string[];
  };
};

export type ShipmentV2Request = {
  shipment: {
    quotation_id: string;
    rate_id: string;
    carrier_name: string;
    address_from: AddressData;
    address_to: AddressData;
    consignment_note: string;
    package_type: string;
    total: number;
    parcels: ParcelData[];
  };
};

export type Rate = {
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

export type Quotation = {
  id: string;
  is_completed: boolean;
  rates: Rate[];
};

export type Shipment = {
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

// Quotations
export async function createQuotation(
  data: ShipmentRequest,
): Promise<Quotation> {
  return skydropxPost<Quotation>("/api/v1/quotations", data);
}

export async function getQuotation(id: string): Promise<Quotation> {
  return skydropxGet<Quotation>(`/api/v1/quotations/${id}`);
}

// Shipments
export async function createShipment(
  data: ShipmentV2Request,
): Promise<Shipment> {
  return skydropxPost<Shipment>("/api/v2/shipments", data);
}

export async function getShipment(id: string): Promise<Shipment> {
  return skydropxGet<Shipment>(`/api/v1/shipments/${id}`);
}

export async function getShipmentByTracking(
  trackingNumber: string,
): Promise<Shipment> {
  return skydropxGet<Shipment>(
    `/api/v1/shipments/tracking/${trackingNumber}`,
  );
}

export async function cancelShipment(id: string): Promise<void> {
  await skydropxPost(`/api/v1/shipments/${id}/cancellations`, {});
}

export async function getCredits(): Promise<{
  balance: number;
  currency: string;
}> {
  const data = await skydropxGet<unknown>("/api/v1/finance/credits");
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (obj.data && typeof obj.data === "object") {
      const inner = obj.data as Record<string, unknown>;
      return {
        balance: Number(inner.balance ?? 0),
        currency: String(inner.currency ?? "MXN"),
      };
    }
  }
  return { balance: 0, currency: "MXN" };
}
