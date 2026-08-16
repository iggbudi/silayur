/**
 * Tipe domain modul Jadwal Karyawan & PIC.
 */

export type ShiftKey = string;
export type AttendanceStatus = "hadir" | "izin" | "libur" | "tidak_hadir";
export type PicArea = "Operasional" | "Tiket" | "Fasilitas" | "Kebersihan" | "Parkir";

/**
 * Definisi jam kerja (shift) — dari config_items section `shifts`
 * (Pengaturan → Jam kerja karyawan), bukan lagi konstanta hardcoded.
 */
export type ShiftDefinition = {
  /** ID stabil dari config (mis. "morning") — dipakai sebagai nilai kolom `shift`. */
  key: string;
  label: string;
  /** Rentang jam HH.mm-HH.mm. */
  time: string;
  active: boolean;
  sortOrder: number;
};

/** Hitungan karyawan terjadwal per shift untuk ringkasan dashboard. */
export type ShiftCount = {
  key: string;
  label: string;
  time: string;
  count: number;
};

/** Master data karyawan. */
export type Employee = {
  id: string;
  name: string;
  position: string;
  area: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateEmployeeInput = {
  name: string;
  position: string;
  area?: string;
};

/** Jadwal shift per tanggal. */
export type ScheduleShift = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePosition: string;
  date: string;
  shift: ShiftKey;
  status: AttendanceStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateScheduleInput = {
  employeeId: string;
  date: string;
  shift: ShiftKey;
  status?: AttendanceStatus;
  notes?: string;
};

export type UpdateScheduleStatusInput = {
  status: AttendanceStatus;
  notes?: string;
};

/** Penugasan PIC per area per tanggal. */
export type PicAssignment = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePosition: string;
  date: string;
  area: PicArea;
  task: string;
  createdAt: string;
};

export type CreatePicInput = {
  employeeId: string;
  date: string;
  area: PicArea;
  task?: string;
};

/** Ringkasan dashboard jadwal hari ini. */
export type JadwalSummary = {
  totalScheduled: number;
  /** Jumlah karyawan aktif per shift (dinamis, mengikuti config). */
  shiftCounts: ShiftCount[];
  absent: number;
  picsToday: PicAssignment[];
  schedulesToday: ScheduleShift[];
};

/** Response untuk GET (daftar jadwal + ringkasan). */
export type JadwalListResponse = {
  date: string;
  summary: JadwalSummary;
  /** Daftar shift aktif untuk pilihan form. */
  shifts: ShiftDefinition[];
};

/** Response untuk daftar karyawan. */
export type EmployeeListResponse = {
  employees: Employee[];
};
