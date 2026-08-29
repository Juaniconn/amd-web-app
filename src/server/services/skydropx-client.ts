import "server-only";
import { getSkydropxToken } from "./skydropx-auth";

const BASE_URL = "https://api-pro.skydropx.com";

export async function skydropxFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getSkydropxToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SkydropX API error: ${response.status} ${error}`);
  }

  return response.json();
}

export async function skydropxGet<T>(path: string): Promise<T> {
  return skydropxFetch<T>(path, { method: "GET" });
}

export async function skydropxPost<T>(path: string, body: unknown): Promise<T> {
  return skydropxFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
