/**
 * Client API modul Operasional.
 * Wrapper tipis di atas fetch(); tidak ada logika di sini.
 */

import type {
  OperationsChecklistInput,
  OperationsChecklistItem,
  OperationsStatus,
} from "./types";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `Permintaan gagal (${response.status})`);
  }
  return data;
}

export async function operationsStatus(
  dateIso?: string,
): Promise<OperationsStatus> {
  const query = dateIso ? `?date=${dateIso}` : "";
  const response = await fetch(`/api/operations${query}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson<OperationsStatus>(response);
}

export async function setOperationsChecklist(
  input: OperationsChecklistInput,
): Promise<OperationsChecklistItem> {
  const response = await fetch("/api/operations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  return parseJson<OperationsChecklistItem>(response);
}
