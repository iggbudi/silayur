/**
 * Konstanta modul Jadwal Karyawan & PIC.
 */

import type { AttendanceStatus, PicArea, ShiftKey } from "./types";

export const SHIFTS: { key: ShiftKey; label: string; time: string }[] = [
  { key: "morning", label: "Shift Pagi", time: "06.00 - 14.00" },
  { key: "evening", label: "Shift Sore", time: "14.00 - 22.00" },
];

export const AREAS: PicArea[] = [
  "Operasional",
  "Tiket",
  "Fasilitas",
  "Kebersihan",
  "Parkir",
];

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "hadir",
  "izin",
  "libur",
  "tidak_hadir",
];

export function getShiftLabel(key: ShiftKey): string {
  return SHIFTS.find((s) => s.key === key)?.label ?? key;
}

export function getShiftTime(key: ShiftKey): string {
  return SHIFTS.find((s) => s.key === key)?.time ?? "";
}

export function getStatusLabel(status: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    hadir: "Hadir",
    izin: "Izin",
    libur: "Libur",
    tidak_hadir: "Tidak Hadir",
  };
  return map[status] ?? status;
}

export function getStatusClass(status: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    hadir: "badge-green",
    izin: "badge-yellow",
    libur: "badge-gray",
    tidak_hadir: "badge-red",
  };
  return map[status] ?? "badge-gray";
}
