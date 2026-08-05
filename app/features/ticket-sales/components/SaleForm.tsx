"use client";

import { FormEvent, useState } from "react";
import type { TicketProduct } from "../../../../shared/config";
import { effectivePriceFor, todayIsoDate } from "../../../../shared/date";
import type { Sale, SaleInput, SaleInputItem } from "../types";
import { createSale } from "../api";

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

  const activeProducts = products.filter((p) => p.active);
  const previewDate = todayIsoDate();

  const totalAmount = activeProducts.reduce((sum, p) => {
    const qty = items[p.id] ?? 0;
    return sum + (effectivePriceFor(p, previewDate)?.price ?? 0) * qty;
  }, 0);
  const totalQuantity = Object.values(items).reduce((a, b) => a + b, 0);

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
    const input: SaleInput = { items: inputItems, notes };
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
      <div className="sale-form-grid">
        {activeProducts.map((product) => {
          const qty = items[product.id] ?? 0;
          const activePrice = effectivePriceFor(product, previewDate);
          return (
            <div key={product.id} className="sale-form-row">
              <div className="sale-form-product">
                <strong>{product.name}</strong>
                <small>
                  {activePrice
                    ? `${currency.format(activePrice.price)} (${activePrice.dayType === "weekday" ? "weekday" : "weekend"})`
                    : "Belum ada tarif aktif"}
                </small>
              </div>
              <input
                type="number"
                min="0"
                max="999"
                value={qty}
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
        <button type="submit" disabled={submitting || totalQuantity === 0}>
          {submitting ? "Menyimpan…" : "Catat Penjualan"}
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
