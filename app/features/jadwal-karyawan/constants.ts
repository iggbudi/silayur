/**
 * Konstanta modul Jadwal Karyawan & PIC.
 */

import type {
  AttendanceStatus,
  PicArea,
  ShiftDefinition,
  ShiftKey,
} from "./types";

/**
 * Fallback shift bila config kosong/belum di-seed.
 * Sumber utama shift: config_items section `shifts` (dapat diubah di Pengaturan).
 */
export const DEFAULT_SHIFTS: ShiftDefinition[] = [
  {
    key: "morning",
    label: "Shift Pagi",
    time: "06.00 - 14.00",
    active: true,
    sortOrder: 10,
  },
  {
    key: "evening",
    label: "Shift Sore",
    time: "14.00 - 22.00",
    active: true,
    sortOrder: 20,
  },
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

export function getShiftLabel(
  key: ShiftKey,
  shifts: ShiftDefinition[] = DEFAULT_SHIFTS,
): string {
  return shifts.find((s) => s.key === key)?.label ?? key;
}

export function getShiftTime(
  key: ShiftKey,
  shifts: ShiftDefinition[] = DEFAULT_SHIFTS,
): string {
  return shifts.find((s) => s.key === key)?.time ?? "";
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
