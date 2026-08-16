/**
 * Client API modul Jadwal Karyawan & PIC.
 * Wrapper tipis di atas fetch(); tidak ada logika bisnis di sini.
 */

import type {
  CreateEmployeeInput,
  CreatePicInput,
  CreateScheduleInput,
  Employee,
  EmployeeListResponse,
  JadwalListResponse,
  PicAssignment,
  ScheduleShift,
  UpdateScheduleStatusInput,
} from "./types";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `Permintaan gagal (${response.status})`);
  }
  return data;
}

export async function fetchJadwal(dateIso?: string): Promise<JadwalListResponse> {
  const params = dateIso ? `?date=${dateIso}` : "";
  const response = await fetch(`/api/jadwal-karyawan${params}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson<JadwalListResponse>(response);
}

export async function createSchedule(
  input: CreateScheduleInput,
): Promise<ScheduleShift> {
  const response = await fetch("/api/jadwal-karyawan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ action: "createSchedule", data: input }),
  });
  return parseJson<ScheduleShift>(response);
}

export async function updateScheduleStatus(
  scheduleId: string,
  input: UpdateScheduleStatusInput,
): Promise<ScheduleShift> {
  const response = await fetch(`/api/jadwal-karyawan/${scheduleId}/status`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  return parseJson<ScheduleShift>(response);
}

export async function assignPic(input: CreatePicInput): Promise<PicAssignment> {
  const response = await fetch("/api/jadwal-karyawan/pic", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  return parseJson<PicAssignment>(response);
}

export async function fetchEmployees(): Promise<EmployeeListResponse> {
  const response = await fetch("/api/jadwal-karyawan/employees", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson<EmployeeListResponse>(response);
}

export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<Employee> {
  const response = await fetch("/api/jadwal-karyawan/employees", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  return parseJson<Employee>(response);
}
