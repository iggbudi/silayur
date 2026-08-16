/**
 * Tipe domain modul Jadwal Karyawan & PIC.
 */

export type ShiftKey = "morning" | "evening";
export type AttendanceStatus = "hadir" | "izin" | "libur" | "tidak_hadir";
export type PicArea = "Operasional" | "Tiket" | "Fasilitas" | "Kebersihan" | "Parkir";

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
  morningShift: number;
  eveningShift: number;
  absent: number;
  picsToday: PicAssignment[];
  schedulesToday: ScheduleShift[];
};

/** Response untuk GET (daftar jadwal + ringkasan). */
export type JadwalListResponse = {
  date: string;
  summary: JadwalSummary;
};

/** Response untuk daftar karyawan. */
export type EmployeeListResponse = {
  employees: Employee[];
};
