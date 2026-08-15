/**
 * Client API modul Fasilitas.
 * Wrapper tipis di atas fetch(); tidak ada logika di sini.
 */

import type {
  FacilityStatusInput,
  FacilityStatusRow,
  FacilityStatusSummary,
  FacilityHistoryEntry,
} from "./types";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `Permintaan gagal (${response.status})`);
  }
  return data;
}

export async function facilitySummary(
  dateIso?: string,
): Promise<FacilityStatusSummary> {
  const query = dateIso ? `?date=${dateIso}` : "";
  const response = await fetch(`/api/facilities${query}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson<FacilityStatusSummary>(response);
}

export async function setFacilityStatus(
  input: FacilityStatusInput,
): Promise<FacilityStatusRow> {
  const response = await fetch("/api/facilities/status", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  return parseJson<FacilityStatusRow>(response);
}

/** Riwayat status fasilitas lintas hari (terbaru dulu). */
export async function facilityHistory(
  limit = 50,
): Promise<FacilityHistoryEntry[]> {
  const response = await fetch(`/api/facilities/history?limit=${limit}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await parseJson<{ history: FacilityHistoryEntry[] }>(response);
  return data.history;
}
