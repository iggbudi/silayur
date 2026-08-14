"use client";

import Link from "next/link";
import { canView } from "../lib/access";
import type {
  AccessLevel,
  ModuleKey,
  ModuleState,
  PermissionModuleKey,
} from "../../shared/config";

type SidebarAccess = Record<PermissionModuleKey, AccessLevel>;
type ActiveSidebarItem =
  | "dashboard"
  | "settings"
  | "penjualan"
  | "keuangan"
  | "laporan";

type NavigationItem = {
  label: string;
  icon: string;
  key: ModuleKey | null;
  permission: PermissionModuleKey;
  href?: string;
  activeKey?: ActiveSidebarItem;
};

const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    icon: "⌂",
    key: null,
    permission: "dashboard",
    href: "/",
    activeKey: "dashboard",
  },
  {
    label: "Operasional",
    icon: "✓",
    key: "operations",
    permission: "operations",
  },
  {
    label: "Penjualan",
    icon: "₹",
    key: "visitors",
    permission: "visitors",
    href: "/penjualan",
    activeKey: "penjualan",
  },
  {
    label: "Keuangan",
    icon: "Rp",
    key: "finance",
    permission: "finance",
    href: "/keuangan",
    activeKey: "keuangan",
  },
  {
    label: "Komplain",
    icon: "!",
    key: "complaints",
    permission: "complaints",
  },
  {
    label: "Laporan",
    icon: "↗",
    key: null,
    permission: "reports",
    href: "/laporan",
    activeKey: "laporan",
  },
];

export function SidebarNavigation({
  access,
  modules,
  active,
  onNavigate,
}: {
  access: SidebarAccess;
  modules: ModuleState;
  active: ActiveSidebarItem;
  onNavigate: () => void;
}) {
  return (
    <nav aria-label="Navigasi utama">
      {navigation.map((item) => {
        const moduleEnabled = item.key === null || modules[item.key];
        const permissionOk = canView(access[item.permission]);
        const enabled = moduleEnabled && permissionOk;
        const lockedByPermission = moduleEnabled && !permissionOk;
        const isActive =
          item.activeKey !== undefined && item.activeKey === active;
        const className = `nav-link ${isActive ? "nav-active" : ""} ${
          !enabled ? "nav-disabled" : ""
        } ${lockedByPermission ? "nav-locked" : ""}`;
        const content = (
          <>
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
            {!moduleEnabled ? <small>nonaktif</small> : null}
            {lockedByPermission ? <small>terkunci</small> : null}
          </>
        );

        if (item.href && enabled) {
          return (
            <Link
              className={className}
              href={item.href}
              key={item.label}
              onClick={onNavigate}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            className={className}
            type="button"
            key={item.label}
            disabled={!enabled}
            onClick={onNavigate}
          >
            {content}
          </button>
        );
      })}

      {canView(access.settings) ? (
        <Link
          className={`nav-link ${active === "settings" ? "nav-active" : ""}`}
          href="/pengaturan"
          onClick={onNavigate}
        >
          <span className="nav-icon" aria-hidden="true">
            ⚙
          </span>
          <span>Pengaturan</span>
        </Link>
      ) : (
        <button className="nav-disabled nav-locked" type="button" disabled>
          <span className="nav-icon" aria-hidden="true">
            ⚙
          </span>
          <span>Pengaturan</span>
          <small>terkunci</small>
        </button>
      )}
    </nav>
  );
}
