import assert from "node:assert/strict";
import test from "node:test";
import {
  dayTypeFor,
  eachDateInRange,
  effectivePriceFor,
  isValidDateIso,
  isWeekend,
  localDayUtcRange,
  localUtcRange,
  todayIsoDate,
  utcIsoToLocalDate,
} from "../date";
import type { TicketProduct } from "../config";

const WEEKDAY = "2026-07-27"; // Senin
const WEEKEND = "2026-07-25"; // Sabtu

function product(prices: TicketProduct["prices"]): TicketProduct {
  return {
    id: "ticket-adult",
    code: "TKT-DEWASA",
    name: "Tiket Masuk Dewasa",
    visitorCategory: "adult",
    validityMode: "same_day",
    description: "",
    active: true,
    prices,
  };
}

test("todayIsoDate returns a valid YYYY-MM-DD calendar date", () => {
  const today = todayIsoDate();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  const parsed = new Date(`${today}T00:00:00.000Z`);
  assert.equal(Number.isNaN(parsed.getTime()), false);
  assert.equal(parsed.toISOString().slice(0, 10), today);
});

test("isWeekend and dayTypeFor classify Saturday/Sunday as weekend", () => {
  assert.equal(isWeekend(WEEKEND), true);
  assert.equal(isWeekend("2026-07-26"), true); // Minggu
  assert.equal(isWeekend(WEEKDAY), false);
  assert.equal(dayTypeFor(WEEKEND), "weekend");
  assert.equal(dayTypeFor(WEEKDAY), "weekday");
  assert.equal(isWeekend("not-a-date"), false);
});

test("localDayUtcRange maps a WIB calendar day to 24h UTC bounds", () => {
  const { startIso, endIso } = localDayUtcRange("2026-07-27");
  assert.equal(startIso, "2026-07-26T17:00:00.000Z");
  assert.equal(endIso, "2026-07-27T17:00:00.000Z");

  const startMs = new Date(startIso).getTime();
  assert.equal(new Date(endIso).getTime() - startMs, 24 * 60 * 60 * 1000);
  // 01:00 WIB (18:00 UTC hari sebelumnya) termasuk hari kalender WIB yang sama.
  const earlyMorningWib = "2026-07-26T18:00:00.000Z";
  assert.ok(
    earlyMorningWib >= startIso && earlyMorningWib < endIso,
    "01:00 WIB 27 Juli harus termasuk rentang 27 Juli",
  );
});

test("isValidDateIso accepts real dates and rejects bad formats", () => {
  assert.equal(isValidDateIso("2026-07-27"), true);
  assert.equal(isValidDateIso("2026-02-28"), true);
  assert.equal(isValidDateIso("2026-02-31"), false, "tanggal mustahil ditolak");
  assert.equal(isValidDateIso("2026-7-27"), false, "bulan tanpa nol depan");
  assert.equal(isValidDateIso("27-07-2026"), false);
  assert.equal(isValidDateIso(""), false);
  assert.equal(isValidDateIso("not-a-date"), false);
});

test("localUtcRange spans from start of from-day to start of day after to", () => {
  const { startIso, endIso } = localUtcRange("2026-07-25", "2026-07-27");
  assert.equal(startIso, "2026-07-24T17:00:00.000Z");
  assert.equal(endIso, "2026-07-27T17:00:00.000Z");
  // Satu hari → sama dengan localDayUtcRange.
  const single = localUtcRange("2026-07-27", "2026-07-27");
  assert.deepEqual(single, localDayUtcRange("2026-07-27"));
});

test("utcIsoToLocalDate converts ISO UTC to the WIB calendar day", () => {
  // 17:00 UTC 24 Juli = 00:00 WIB 25 Juli → masuk hari 25.
  assert.equal(utcIsoToLocalDate("2026-07-24T17:00:00.000Z"), "2026-07-25");
  assert.equal(utcIsoToLocalDate("2026-07-24T16:59:59.999Z"), "2026-07-24");
  assert.equal(utcIsoToLocalDate("2026-07-25T10:00:00.000Z"), "2026-07-25");
});

test("eachDateInRange lists every date inclusive and in order", () => {
  assert.deepEqual(eachDateInRange("2026-07-25", "2026-07-27"), [
    "2026-07-25",
    "2026-07-26",
    "2026-07-27",
  ]);
  assert.deepEqual(eachDateInRange("2026-07-27", "2026-07-27"), [
    "2026-07-27",
  ]);
  assert.deepEqual(eachDateInRange("2026-12-30", "2027-01-01"), [
    "2026-12-30",
    "2026-12-31",
    "2027-01-01",
  ]);
});

test("effectivePriceFor picks the active tariff for the day type", () => {
  const ticket = product([
    { id: "p1", ticketProductId: "ticket-adult", dayType: "weekday", price: 15000, validFrom: "2026-01-01", validUntil: null, active: true },
    { id: "p2", ticketProductId: "ticket-adult", dayType: "weekend", price: 20000, validFrom: "2026-01-01", validUntil: null, active: true },
  ]);
  assert.equal(effectivePriceFor(ticket, WEEKDAY)?.price, 15000);
  assert.equal(effectivePriceFor(ticket, WEEKEND)?.price, 20000);
});

test("effectivePriceFor ignores inactive and out-of-period tariffs", () => {
  const ticket = product([
    // Non-aktif: tidak boleh terpilih meski dayType cocok.
    { id: "p1", ticketProductId: "ticket-adult", dayType: "weekday", price: 15000, validFrom: "2026-01-01", validUntil: null, active: false },
    // Periode belum mulai: tidak boleh terpilih.
    { id: "p2", ticketProductId: "ticket-adult", dayType: "weekday", price: 16000, validFrom: "2027-01-01", validUntil: null, active: true },
    // Periode sudah berakhir: tidak boleh terpilih.
    { id: "p3", ticketProductId: "ticket-adult", dayType: "weekday", price: 14000, validFrom: "2026-01-01", validUntil: "2026-06-30", active: true },
  ]);
  assert.equal(effectivePriceFor(ticket, WEEKDAY), null);

  const withWeekend = product([
    { id: "p4", ticketProductId: "ticket-adult", dayType: "weekend", price: 20000, validFrom: "2026-01-01", validUntil: null, active: true },
  ]);
  assert.equal(effectivePriceFor(withWeekend, WEEKDAY), null, "no weekday tariff");
  assert.equal(effectivePriceFor(withWeekend, WEEKEND)?.price, 20000);
});

test("effectivePriceFor prefers the latest validFrom when periods overlap", () => {
  const ticket = product([
    { id: "p1", ticketProductId: "ticket-adult", dayType: "weekday", price: 15000, validFrom: "2026-01-01", validUntil: null, active: true },
    { id: "p2", ticketProductId: "ticket-adult", dayType: "weekday", price: 17500, validFrom: "2026-08-01", validUntil: null, active: true },
  ]);
  assert.equal(effectivePriceFor(ticket, "2026-07-27")?.price, 15000);
  assert.equal(effectivePriceFor(ticket, "2026-09-01")?.price, 17500);
});
