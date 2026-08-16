"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "../hooks/use-session";
import { useMobileSidebar } from "../hooks/use-mobile-sidebar";
import { useDrawerSwipe } from "../hooks/use-drawer-swipe";
import { Brand } from "../components/brand";
import { SidebarNavigation } from "../components/sidebar-navigation";
import { SidebarFooter } from "../components/sidebar-footer";
import { MobileDrawer } from "../components/mobile-drawer";
import { MobileMenuButton } from "../components/mobile-menu-button";
import { SessionGate } from "../components/session-gate";
import { todayIsoDate } from "../../shared/date";
import {
  facilityHistory,
  facilitySummary,
  setFacilityStatus,
  type FacilityHistoryEntry,
  type FacilityStatusSummary,
  type FacilityStatusValue,
} from "../features/facilities";

const statusLabel: Record<FacilityStatusValue, string> = {
  operational: "Beroperasi",
  needs_attention: "Perlu cek",
  closed: "Ditutup",
};

const numberFormat = new Intl.NumberFormat("id-ID");

export default function FacilitiesPage() {
  const { session, ready: authReady, logout } = useSession();
  const {
    open: mobileMenuOpen,
    close: closeMobileMenu,
    toggle: toggleMobileMenu,
    drawerRef,
    triggerRef,
  } = useMobileSidebar();
  useDrawerSwipe(drawerRef, mobileMenuOpen, closeMobileMenu);

  const [summary, setSummary] = useState<FacilityStatusSummary | null>(null);
  const [history, setHistory] = useState<FacilityHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    const data = await facilitySummary(todayIsoDate());
    setSummary(data);
  }, []);

  useEffect(() => {
    if (!authReady || !session) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadData();
        const h = await facilityHistory(30);
        if (!cancelled) setHistory(h);
        if (!cancelled) setError("");
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Gagal memuat data.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, session, loadData]);

  async function handleSetStatus(facilityId: string, status: FacilityStatusValue) {
    setError("");
    setNotice("");
    try {
      await setFacilityStatus({
        facilityId,
        status,
        note: notes[facilityId] ?? "",
      });
      setNotes((prev) => ({ ...prev, [facilityId]: "" }));
      setNotice(`Status ${statusLabel[status]} disimpan.`);
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyimpan.");
    }
  }

  if (!authReady) return <SessionGate title="Memuat fasilitas…" />;
  if (!session) {
    return <SessionGate title="Sesi berakhir" message="Silakan masuk kembali." />;
  }
  const access = session.access;
  const canViewFacilities =
    access.facilities === "view" || access.facilities === "manage";
  const canManageFacilities = access.facilities === "manage";

  if (!canViewFacilities) {
    return (
      <main className="login-shell">
        <div className="login-card">
          <Brand compact />
          <h1>Akses ditolak</h1>
          <p>Anda tidak memiliki izin melihat fasilitas.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <MobileMenuButton
        open={mobileMenuOpen}
        onToggle={toggleMobileMenu}
        controls="dashboard-sidebar"
        triggerRef={triggerRef}
      />
      <MobileDrawer
        id="dashboard-sidebar"
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        drawerRef={drawerRef}
      >
        <Brand />
        <SidebarNavigation
          access={access}
          modules={session.modules}
          active="facilities"
          onNavigate={closeMobileMenu}
        />
        <SidebarFooter
          name={session.user.name}
          roleLabel={session.role?.label ?? session.user.role}
          onLogout={() => {
            void logout();
          }}
        />
      </MobileDrawer>

      <section className="workspace facility-workspace">
        <header className="topbar">
          <div className="title-line">
            <h1>Fasilitas</h1>
            <span className="section-kicker">
              {summary
                ? `${numberFormat.format(summary.counts.operational)} beroperasi · ${numberFormat.format(
                    summary.counts.needsAttention,
                  )} perlu cek · ${numberFormat.format(summary.counts.closed)} ditutup`
                : "Status harian"}
            </span>
          </div>
        </header>

        {notice ? (
          <p className="facility-notice" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="sale-form-error" role="alert">
            {error}
          </p>
        ) : null}

        <section className="panel">
          <div className="panel-heading">
            <h2>Kesiapan fasilitas hari ini</h2>
            {summary?.updatedAt ? (
              <span className="updated-label">
                Diperbarui{" "}
                {new Date(summary.updatedAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : null}
          </div>

          {loading ? <p className="facility-empty">Memuat…</p> : null}
          {summary && summary.facilities.length === 0 ? (
            <p className="facility-empty">Belum ada fasilitas terdaftar.</p>
          ) : null}

          <div className="facility-list">
            {summary?.facilities.map((facility) => (
              <div key={facility.id} className="facility-row">
                <div className="facility-main">
                  <span className="facility-symbol" aria-hidden="true">
                    ◇
                  </span>
                  <div className="facility-name-wrap">
                    <div className="facility-name-line">
                      <strong>{facility.name}</strong>
                      <span
                        className={`facility-status facility-status-${facility.status}`}
                      >
                        {statusLabel[facility.status]}
                      </span>
                    </div>
                    {facility.detail ? (
                      <small>{facility.detail}</small>
                    ) : null}
                  </div>
                </div>
                {canManageFacilities ? (
                  <div className="facility-actions">
                    <input
                      type="text"
                      placeholder="Catatan (opsional)"
                      value={notes[facility.id] ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({
                          ...prev,
                          [facility.id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="facility-btn facility-btn-primary"
                      onClick={() =>
                        void handleSetStatus(facility.id, "operational")
                      }
                    >
                      Beroperasi
                    </button>
                    <button
                      type="button"
                      className="facility-btn facility-btn-warn"
                      onClick={() =>
                        void handleSetStatus(facility.id, "needs_attention")
                      }
                    >
                      Perlu cek
                    </button>
                    <button
                      type="button"
                      className="facility-btn facility-btn-danger"
                      onClick={() =>
                        void handleSetStatus(facility.id, "closed")
                      }
                    >
                      Ditutup
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* Riwayat status lintas hari */}
        <section className="panel">
          <div className="panel-heading">
            <h2>Riwayat status</h2>
            <span className="updated-label">30 catatan terakhir</span>
          </div>
          {history.length === 0 ? (
            <p className="facility-empty">Belum ada catatan status fasilitas.</p>
          ) : (
            <ul className="facility-history">
              {history.map((entry) => (
                <li key={entry.id} className="facility-history-row">
                  <span className="facility-history-date">
                    {entry.date}
                  </span>
                  <strong>{entry.facilityName}</strong>
                  <span
                    className={`facility-status facility-status-${entry.status}`}
                  >
                    {statusLabel[entry.status]}
                  </span>
                  {entry.note ? (
                    <small className="facility-history-note">
                      “{entry.note}”
                    </small>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
