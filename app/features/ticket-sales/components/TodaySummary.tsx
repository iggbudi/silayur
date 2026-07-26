"use client";

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function TodaySummary({
  date,
  count,
  revenue,
}: {
  date: string;
  count: number;
  revenue: number;
}) {
  return (
    <div className="today-summary">
      <div>
        <span>Hari ini</span>
        <strong>{date}</strong>
      </div>
      <div>
        <span>Transaksi</span>
        <strong>{count}</strong>
      </div>
      <div>
        <span>Pendapatan</span>
        <strong>{currency.format(revenue)}</strong>
      </div>
    </div>
  );
}
