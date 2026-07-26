/**
 * PUBLIC API untuk slice "platform".
 *
 * Slice ini berisi utility cross-cutting: brand, toggle, runtime guard,
 * sidebar nav, mobile sidebar hook, dan config API client.
 *
 * File yang menjadi anggota slice ini:
 * - app/components/brand.tsx
 * - app/components/toggle.tsx
 * - app/components/dev-runtime-guard.tsx
 * - app/components/sidebar-navigation.tsx
 * - app/hooks/use-mobile-sidebar.ts
 * - app/lib/config-api.ts          (client API: fetchSession, loginRemote, dll.)
 */

// ============================================================================
// UI COMPONENTS
// ============================================================================

export { Brand } from "../../components/brand";
export { Toggle } from "../../components/toggle";
export { DevRuntimeGuard } from "../../components/dev-runtime-guard";
export { SidebarNavigation } from "../../components/sidebar-navigation";

// ============================================================================
// HOOKS
// ============================================================================

export { useMobileSidebar } from "../../hooks/use-mobile-sidebar";

// ============================================================================
// API CLIENT (config-api.ts - client-side)
// ============================================================================

export {
  fetchSession,
  loginRemote,
  logoutRemote,
  peekSession,
  fetchRemoteConfig,
  putRemoteConfig,
  type SessionBootstrap,
  type RemoteConfig,
} from "../../lib/config-api";
