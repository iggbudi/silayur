/**
 * Client API kalender hari libur.
 * Wrapper tipis di atas fetch(); tidak ada logika di sini.
 */

import type { Holiday, HolidayInput } from "./types";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `Permintaan gagal (${response.status})`);
  }
  return data;
}

export async function listHolidays(): Promise<Holiday[]> {
  const response = await fetch("/api/holidays", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await parseJson<{ holidays: Holiday[] }>(response);
  return data.holidays;
}

export async function createHoliday(input: HolidayInput): Promise<Holiday> {
  const response = await fetch("/api/holidays", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  return parseJson<Holiday>(response);
}

export async function removeHoliday(date: string): Promise<void> {
  const response = await fetch(
    `/api/holidays?date=${encodeURIComponent(date)}`,
    {
      method: "DELETE",
      credentials: "same-origin",
    },
  );
  await parseJson<{ ok: boolean }>(response);
}
