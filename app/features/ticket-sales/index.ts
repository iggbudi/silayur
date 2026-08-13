/**
 * PUBLIC API untuk slice "ticket-sales".
 *
 * File lain HANYA boleh import dari index.ts ini.
 * Internal (repo, server, api, components) tidak boleh di-deep-import.
 *
 * Slice ini mengelola transaksi penjualan tiket masuk di loket.
 * Self-contained: schema, repo, server, client API, UI semua di folder ini.
 */

// ============================================================================
// CLIENT API
// ============================================================================

export {
  createSale,
  listTodaySales,
  type CreateSaleResponse,
  type ListSalesResponse,
} from "./api";

// ============================================================================
// TYPES
// ============================================================================

export type {
  DaySummary,
  Sale,
  SaleItem,
  SaleInput,
  SaleInputItem,
  SaleStatus,
  PricedItem,
} from "./types";
export { EMPTY_SALE_INPUT } from "./types";

// ============================================================================
// COMPONENTS
// ============================================================================

export { SaleForm } from "./components/SaleForm";
export { SaleHistory } from "./components/SaleHistory";
export { TodaySummary } from "./components/TodaySummary";
