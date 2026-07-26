/**
 * PUBLIC API untuk slice "ticket-master".
 *
 * Slice ini bertanggung jawab untuk: master tiket (produk Dewasa/Anak)
 * dan tarif efektif per periode.
 *
 * File yang menjadi anggota slice ini:
 * - db/ticket-repo.ts                  (CRUD ticket products & prices)
 * - app/components/ticket-settings.tsx (UI untuk master tiket)
 */

// ============================================================================
// SERVER (ticket repository)
// ============================================================================

export {
  loadTicketProducts,
  saveTicketProducts,
} from "../../../db/ticket-repo";

// ============================================================================
// CLIENT (UI components)
// ============================================================================

export { TicketSettings } from "../../components/ticket-settings";

// ============================================================================
// TYPES
// ============================================================================

export type {
  TicketProduct,
  TicketPrice,
  TicketVisitorCategory,
  TicketValidityMode,
  TicketDayType,
} from "../../../shared/config";
