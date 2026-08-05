import assert from "node:assert/strict";
import test from "node:test";
import {
  dayTypeFor,
  effectivePriceFor,
  isWeekend,
  todayIsoDate,
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
