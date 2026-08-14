/**
 * Client API modul Komplain.
 * Wrapper tipis di atas fetch(); tidak ada logika di sini.
 */

import type {
  Complaint,
  ComplaintInput,
  ComplaintList,
  ComplaintStatus,
} from "./types";

/** Hasil `recentComplaints`: komplain terbaru + jumlah terbuka. */
export type RecentComplaintsResult = {
  complaints: Complaint[];
  openCount: number;
};

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `Permintaan gagal (${response.status})`);
  }
  return data;
}

export async function listComplaints(dateIso: string): Promise<ComplaintList> {
  const response = await fetch(`/api/complaints?date=${dateIso}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson<ComplaintList>(response);
}

export async function createComplaint(
  input: ComplaintInput,
): Promise<Complaint> {
  const response = await fetch("/api/complaints", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  return parseJson<Complaint>(response);
}

export async function updateComplaintStatus(
  complaintId: string,
  status: ComplaintStatus,
): Promise<Complaint> {
  const response = await fetch(`/api/complaints/${complaintId}/status`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ status }),
  });
  return parseJson<Complaint>(response);
}

export async function recentComplaints(): Promise<RecentComplaintsResult> {
  const response = await fetch("/api/complaints/recent", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson<RecentComplaintsResult>(response);
}
