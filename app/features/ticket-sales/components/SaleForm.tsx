"use client";

import { FormEvent, useEffect, useState } from "react";
import type { TicketProduct } from "../../../../shared/config";
import {
  dayTypeForWithHolidays,
  effectivePriceFor,
  todayIsoDate,
} from "../../../../shared/date";
import type { Sale, SaleInput, SaleInputItem } from "../types";
import { createSale } from "../api";
import { listHolidays } from "../../holidays";

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function SaleForm({
  products,
  onCreated,
}: {
  products: TicketProduct[];
  onCreated: (sale: Sale) => void;
}) {
  const [items, setItems] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [holidayDates, setHolidayDates] = useState<string[]>([]);
  const [visitDate, setVisitDate] = useState<string>(() => todayIsoDate());

  const activeProducts = products.filter((p) => p.active);
  const previewDate = visitDate;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const holidays = await listHolidays();
        if (!cancelled) setHolidayDates(holidays.map((h) => h.date));
      } catch {
        if (!cancelled) setHolidayDates([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dayType = dayTypeForWithHolidays(previewDate, holidayDates);
  const isHoliday = holidayDates.includes(previewDate);
  const dayTypeLabel = isHoliday
    ? "Hari libur — tarif akhir pekan"
    : dayType === "weekend"
      ? "Akhir pekan — tarif weekend"
      : "Hari kerja — tarif weekday";

  const totalAmount = activeProducts.reduce((sum, p) => {
    const qty = items[p.id] ?? 0;
    return (
      sum +
      (effectivePriceFor(p, previewDate, holidayDates)?.price ?? 0) * qty
    );
  }, 0);
  const totalQuantity = Object.values(items).reduce((a, b) => a + b, 0);
  const purchasableCount = activeProducts.filter(
    (p) => effectivePriceFor(p, previewDate, holidayDates) !== null,
  ).length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const inputItems: SaleInputItem[] = activeProducts
      .filter((p) => (items[p.id] ?? 0) > 0)
      .map((p) => ({ ticketProductId: p.id, quantity: items[p.id]! }));
    if (inputItems.length === 0) {
      setError("Pilih minimal satu tiket.");
      return;
    }
    const input: SaleInput = { items: inputItems, notes, visitDate };
    setSubmitting(true);
    try {
      const sale = await createSale(input);
      onCreated(sale);
      setItems({});
      setNotes("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal menyimpan transaksi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="sale-form" onSubmit={handleSubmit}>
      <span className="sale-form-daytype">{dayTypeLabel}</span>
      <label className="sale-form-visit">
        <span>Tanggal kunjungan</span>
        <input
          type="date"
          value={visitDate}
          min={todayIsoDate()}
          onChange={(e) => {
            if (e.target.value) setVisitDate(e.target.value);
          }}
        />
      </label>
      <div className="sale-form-grid">
        {activeProducts.map((product) => {
          const qty = items[product.id] ?? 0;
          const activePrice = effectivePriceFor(
            product,
            previewDate,
            holidayDates,
          );
          const unavailable = activePrice === null;
          return (
            <div
              key={product.id}
              className={`sale-form-row ${
                unavailable ? "sale-form-row-unavailable" : ""
              }`}
            >
              <div className="sale-form-product">
                <strong>{product.name}</strong>
                <small>
                  {activePrice
                    ? `${currency.format(activePrice.price)} (${activePrice.dayType === "weekday" ? "weekday" : "weekend"})`
                    : "Tarif belum dikonfigurasi — tanyakan admin"}
                </small>
              </div>
              <input
                type="number"
                min="0"
                max="999"
                value={unavailable ? 0 : qty}
                disabled={unavailable}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setItems({ ...items, [product.id]: Number.isFinite(next) && next > 0 ? next : 0 });
                }}
                aria-label={`Jumlah ${product.name}`}
              />
            </div>
          );
        })}
      </div>
      <label className="sale-form-notes">
        <span>Catatan (opsional)</span>
        <textarea
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
      <div className="sale-form-summary">
        <span>
          {totalQuantity} tiket ·{" "}
          <strong>{currency.format(totalAmount)}</strong>
        </span>
        <button
          type="submit"
          disabled={submitting || totalQuantity === 0 || purchasableCount === 0}
        >
          {submitting
            ? "Menyimpan…"
            : purchasableCount === 0
              ? "Belum ada tarif aktif"
              : "Catat Penjualan"}
        </button>
      </div>
      {error ? (
        <p className="sale-form-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
