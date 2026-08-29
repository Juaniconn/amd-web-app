import "server-only";
import { skydropxGet } from "./skydropx-client";

export type SkydropxAddressRaw = {
  id: string;
  alias_name: string;
  address_type: "from" | "to";
  default: boolean;
  address: {
    name: string;
    company: string;
    street1: string;
    street_number: string;
    apartment_number: string;
    postal_code: string;
    area_level1: string;
    area_level2: string;
    area_level3: string;
    country_code: string;
    phone: string;
    email: string;
    reference: string;
    rfc: string | null;
    tax_id_number: string | null;
    tax_id_type: string | null;
  };
  verified_carriers: Array<{
    carrier_name: string;
    status: string;
  }>;
};

export type AddressTemplate = {
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

export async function listAddresses(): Promise<AddressTemplate[]> {
  const data = await skydropxGet<unknown>("/api/v1/address_templates");

  let rawAddresses: SkydropxAddressRaw[] = [];

  if (Array.isArray(data)) {
    rawAddresses = data as SkydropxAddressRaw[];
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      rawAddresses = obj.data as SkydropxAddressRaw[];
    }
  }

  return rawAddresses.map((addr) => ({
    id: addr.id,
    name: addr.alias_name,
    street1: addr.address.street1,
    street_number: addr.address.street_number,
    apartment_number: addr.address.apartment_number,
    city: addr.address.area_level2,
    state: addr.address.area_level1,
    area_level3: addr.address.area_level3,
    postal_code: addr.address.postal_code,
    country: addr.address.country_code,
    phone: addr.address.phone,
    email: addr.address.email,
    reference: addr.address.reference,
    is_origin: addr.address_type === "from",
    is_destination: addr.address_type === "to",
    is_default: addr.default,
    company: addr.address.company,
    carrier_verified: addr.verified_carriers?.map((c) => c.carrier_name) || [],
  }));
}

export async function getAddress(id: string): Promise<SkydropxAddressRaw> {
  return skydropxGet<SkydropxAddressRaw>(`/api/v1/address_templates/${id}`);
}
