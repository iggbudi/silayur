"use client";

import type { Sale } from "../types";

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SaleHistory({ sales }: { sales: Sale[] }) {
  if (sales.length === 0) {
    return (
      <p className="sale-history-empty">
        Belum ada transaksi hari ini.
      </p>
    );
  }
  return (
    <ul className="sale-history">
      {sales.map((sale) => (
        <li key={sale.id} className="sale-history-row">
          <div>
            <strong>{sale.receiptNumber}</strong>
            <small>
              {formatTime(sale.soldAt)} · oleh {sale.soldByName ?? sale.soldBy}
            </small>
          </div>
          <div>
            <span>{sale.totalQuantity} tiket</span>
            <strong>{currency.format(sale.totalAmount)}</strong>
          </div>
        </li>
      ))}
    </ul>
  );
}
