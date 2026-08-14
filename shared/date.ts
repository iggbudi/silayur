/**
 * Tanggal kalender untuk operasional SILAYUR.
 *
 * Kolom waktu (`sold_at`, `created_at`) tetap disimpan sebagai ISO UTC.
 * Fungsi di file ini hanya untuk **pengelompokan kalender** ("hari ini",
 * `visit_date`, prefix receipt) yang harus mengikuti waktu operasional
 * Asia/Jakarta (WIB, UTC+7) — bukan UTC. Menggunakan `toISOString()`
 * langsung untuk "hari ini" akan salah hari antara 00:00–06:59 WIB.
 */

import type {
  TicketDayType,
  TicketPrice,
  TicketProduct,
} from "./config";

const JAKARTA_TIME_ZONE = "Asia/Jakarta";

/**
 * Tanggal kalender hari ini dalam waktu Asia/Jakarta, format `YYYY-MM-DD`.
 * Contoh: transaksi 01:00 WIB (18:00 UTC kemarin) tetap masuk hari ini.
 */
export function todayIsoDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Apakah tanggal `YYYY-MM-DD` jatuh pada akhir pekan (Sabtu/Minggu).
 * Hari libur nasional mengikuti tarif weekend — keputusan manual petugas.
 */
export function isWeekend(dateIso: string): boolean {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/** Jenis hari untuk penentuan tarif: weekend (Sabtu/Minggu) atau weekday. */
export function dayTypeFor(dateIso: string): TicketDayType {
  return isWeekend(dateIso) ? "weekend" : "weekday";
}

/**
 * Rentang waktu UTC untuk satu hari kalender WIB (ISO; ujung bawah
 * inklusif, ujung atas eksklusif). Hari WIB dimulai 7 jam lebih awal dari
 * UTC, jadi tanggal D dimulai pukul 17:00 UTC hari sebelumnya.
 * Dipakai untuk filter "hari ini" pada kolom waktu ISO UTC (`sold_at`).
 */
export function localDayUtcRange(dateIso: string): {
  startIso: string;
  endIso: string;
} {
  const start = new Date(`${dateIso}T00:00:00.000Z`);
  start.setUTCHours(start.getUTCHours() - 7);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/**
 * Apakah string `YYYY-MM-DD` adalah tanggal kalender yang valid
 * (format benar dan tanggal nyata, mis. menolak `2026-02-31`).
 */
export function isValidDateIso(dateIso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return false;
  const parsed = new Date(`${dateIso}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === dateIso;
}

/**
 * Rentang waktu UTC untuk rentang tanggal kalender WIB (bawah inklusif,
 * atas eksklusif). Mulai dari awal hari `from` sampai awal hari setelah
 * `to` — mencakup seluruh hari di antaranya.
 */
export function localUtcRange(
  fromIso: string,
  toIso: string,
): { startIso: string; endIso: string } {
  const start = localDayUtcRange(fromIso);
  const end = localDayUtcRange(toIso);
  return { startIso: start.startIso, endIso: end.endIso };
}

/**
 * Konversi timestamp ISO UTC ke tanggal kalender WIB `YYYY-MM-DD`.
 * Dipakai untuk mengelompokkan transaksi (kolom `sold_at`) per hari WIB.
 */
export function utcIsoToLocalDate(isoUtc: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoUtc));
}

/**
 * Daftar tanggal `YYYY-MM-DD` dari `fromIso` sampai `toIso` (inklusif,
 * urutan menaik). Prasyarat: `fromIso <= toIso` dan keduanya valid.
 */
export function eachDateInRange(fromIso: string, toIso: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${fromIso}T00:00:00.000Z`);
  const end = new Date(`${toIso}T00:00:00.000Z`);
  while (cursor.getTime() <= end.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Tarif efektif untuk produk pada tanggal tertentu: tarif aktif dengan
 * dayType yang sesuai dan periode `validFrom`/`validUntil` mencakup tanggal.
 * Bila beberapa periode berlaku, ambil yang mulai paling akhir.
 * Kembali `null` bila belum ada tarif yang berlaku.
 */
export function effectivePriceFor(
  product: TicketProduct,
  dateIso: string,
): TicketPrice | null {
  const dayType = dayTypeFor(dateIso);
  const candidates = product.prices
    .filter(
      (price) =>
        price.active &&
        price.dayType === dayType &&
        price.validFrom <= dateIso &&
        (price.validUntil === null || price.validUntil >= dateIso),
    )
    .sort((left, right) => right.validFrom.localeCompare(left.validFrom));
  return candidates[0] ?? null;
}
