/**
 * Types untuk slice ticket-sales.
 * Semua kode 1 fitur ada di folder ini.
 *
 * Catatan: snapshot pricing (unitPrice, subtotal) di SaleItem PENTING.
 * Jika master tarif berubah, transaksi lama tetap refer ke harga lama.
 */

import type { TicketProduct, TicketVisitorCategory } from "../../../shared/config";

export type SaleStatus = "completed" | "void_pending" | "voided";

export type SaleItem = {
  id: string;
  saleId: string;
  ticketProductId: string;
  productName: string;
  visitorCategory: TicketVisitorCategory;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export type Sale = {
  id: string;
  receiptNumber: string;
  soldBy: string;
  soldByName?: string;
  soldAt: string;
  visitDate: string;
  totalAmount: number;
  totalQuantity: number;
  status: SaleStatus;
  notes: string;
  voidReason: string;
  voidRequestedAt: string | null;
  voidRequestedBy: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  items: SaleItem[];
};

/** Ringkasan harian penjualan tiket (untuk KPI dashboard & ringkasan loket). */
export type DaySummary = {
  date: string;
  count: number;
  visitors: number;
  revenue: number;
};

export type SaleInputItem = {
  ticketProductId: string;
  quantity: number;
};

export type SaleInput = {
  items: SaleInputItem[];
  notes?: string;
};

/**
 * Bukti / snapshot yang dipakai saat transaksi.
 * Dibentuk dari TicketProduct + harga efektif untuk day tertentu.
 */
export type PricedItem = {
  product: TicketProduct;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export const EMPTY_SALE_INPUT: SaleInput = {
  items: [],
  notes: "",
};
