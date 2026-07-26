/**
 * PUBLIC API untuk slice "dashboard".
 *
 * Slice ini bertanggung jawab untuk: halaman utama dashboard dan widget
 * KPI yang ditampilkan.
 *
 * File yang menjadi anggota slice ini:
 * - app/page.tsx                       (root dashboard)
 * - app/components/dashboard-widgets.tsx (MetricCard)
 *
 * Catatan: data operasional (pengunjung, keuangan, dll) saat ini masih
 * simulasi statis. Nantinya akan diisi oleh slice lain (e.g. ticket-sales)
 * dan dibaca via API/config.
 */

// ============================================================================
// CLIENT (UI components)
// ============================================================================

export { MetricCard } from "../../components/dashboard-widgets";

// ============================================================================
// TYPES
// ============================================================================

export type { ModuleKey, ModuleState } from "../../lib/module-config";
