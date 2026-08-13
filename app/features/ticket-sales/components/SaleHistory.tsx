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

function statusLabel(status: Sale["status"]): string {
  if (status === "voided") return "Dibatalkan";
  if (status === "void_pending") return "Menunggu persetujuan";
  return "Selesai";
}

export function SaleHistory({
  sales,
  canApprove,
  onRequestVoid,
  onApprove,
}: {
  sales: Sale[];
  canApprove: boolean;
  onRequestVoid: (saleId: string) => void;
  onApprove: (saleId: string) => void;
}) {
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
        <li
          key={sale.id}
          className={`sale-history-row ${
            sale.status === "voided" ? "sale-row-voided" : ""
          }`}
        >
          <div>
            <strong>{sale.receiptNumber}</strong>
            <small>
              {formatTime(sale.soldAt)} · oleh {sale.soldByName ?? sale.soldBy}
            </small>
            {sale.voidReason ? (
              <small className="sale-void-reason">
                Alasan batal: {sale.voidReason}
              </small>
            ) : null}
          </div>
          <div className="sale-history-actions">
            <span>{sale.totalQuantity} tiket</span>
            <strong>{currency.format(sale.totalAmount)}</strong>
            {sale.status !== "completed" ? (
              <span className={`sale-status sale-status-${sale.status}`}>
                {statusLabel(sale.status)}
              </span>
            ) : null}
            {sale.status === "completed" ? (
              <button
                type="button"
                className="sale-action-button"
                onClick={() => onRequestVoid(sale.id)}
              >
                Batalkan
              </button>
            ) : null}
            {sale.status === "void_pending" && canApprove ? (
              <button
                type="button"
                className="sale-action-button sale-action-approve"
                onClick={() => onApprove(sale.id)}
              >
                Setujui
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
