/**
 * Validasi input modul Jadwal Karyawan & PIC (Zod).
 */

import { z } from "zod";

export const createEmployeeSchema = z.object({
  name: z.string().min(2, "Nama karyawan wajib diisi (minimal 2 karakter)."),
  position: z.string().min(2, "Posisi wajib diisi (minimal 2 karakter)."),
  area: z.string().optional(),
});

export const createScheduleSchema = z.object({
  employeeId: z.string().min(1, "ID karyawan wajib diisi."),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal wajib YYYY-MM-DD."),
  shift: z.enum(["morning", "evening"], { message: "Shift tidak valid." }),
  status: z.enum(["hadir", "izin", "libur", "tidak_hadir"]).optional(),
  notes: z.string().optional(),
});

export const updateScheduleStatusSchema = z.object({
  status: z.enum(["hadir", "izin", "libur", "tidak_hadir"], {
    message: "Status kehadiran tidak valid.",
  }),
  notes: z.string().optional(),
});

export const createPicSchema = z.object({
  employeeId: z.string().min(1, "ID karyawan wajib diisi."),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal wajib YYYY-MM-DD."),
  area: z.enum(["Operasional", "Tiket", "Fasilitas", "Kebersihan", "Parkir"], {
    message: "Area PIC tidak valid.",
  }),
  task: z.string().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleStatusInput = z.infer<
  typeof updateScheduleStatusSchema
>;
export type CreatePicInput = z.infer<typeof createPicSchema>;
