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
  operationsStatus,
  setOperationsChecklist,
  type OperationsStatus,
} from "../features/operations";

const numberFormat = new Intl.NumberFormat("id-ID");

export default function OperationsPage() {
  const { session, ready: authReady, logout } = useSession();
  const {
    open: mobileMenuOpen,
    close: closeMobileMenu,
    toggle: toggleMobileMenu,
    drawerRef,
    triggerRef,
  } = useMobileSidebar();
  useDrawerSwipe(drawerRef, mobileMenuOpen, closeMobileMenu);

  const [status, setStatus] = useState<OperationsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    const data = await operationsStatus(todayIsoDate());
    setStatus(data);
  }, []);

  useEffect(() => {
    if (!authReady || !session) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadData();
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

  async function handleToggle(checklistId: string, done: boolean) {
    setError("");
    setNotice("");
    try {
      await setOperationsChecklist({
        checklistId,
        done,
        note: notes[checklistId] ?? "",
      });
      setNotes((prev) => ({ ...prev, [checklistId]: "" }));
      setNotice(done ? "Checklist ditandai selesai." : "Checklist dibatalkan.");
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyimpan.");
    }
  }

  if (!authReady) return <SessionGate title="Memuat operasional…" />;
  if (!session) {
    return <SessionGate title="Sesi berakhir" message="Silakan masuk kembali." />;
  }
  const access = session.access;
  const canViewOperations =
    access.operations === "view" || access.operations === "manage";
  const canManageOperations = access.operations === "manage";

  if (!canViewOperations) {
    return (
      <main className="login-shell">
        <div className="login-card">
          <Brand compact />
          <h1>Akses ditolak</h1>
          <p>Anda tidak memiliki izin melihat operasional.</p>
        </div>
      </main>
    );
  }

  const progress =
    status && status.totalCount > 0
      ? Math.round((status.doneCount / status.totalCount) * 100)
      : 0;

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
          active="operations"
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

      <section className="workspace operations-workspace">
        <header className="topbar">
          <div className="title-line">
            <h1>Operasional</h1>
            <span className="section-kicker">
              {status
                ? `Daftar tugas harian · ${numberFormat.format(status.doneCount)} dari ${numberFormat.format(
                    status.totalCount,
                  )} selesai`
                : "Daftar tugas harian"}
            </span>
          </div>
        </header>

        {notice ? (
          <p className="operations-notice" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="sale-form-error" role="alert">
            {error}
          </p>
        ) : null}

        {/* Panel tugas harian (pemeran utama). Jam buka & panduan dirapikan di bawahnya. */}

        <section className="panel">
          <div className="panel-heading">
            <h2>Daftar tugas hari ini</h2>
            {status?.updatedAt ? (
              <span className="updated-label">
                Diperbarui{" "}
                {new Date(status.updatedAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : null}
          </div>

          {status && status.operatingHours.length > 0 ? (
            <p className="operations-hours-line">
              🕗 Jam buka taman:{" "}
              {status.operatingHours
                .map((hours) => `${hours.name} · ${hours.time}`)
                .join(" · ")}
            </p>
          ) : null}

          {loading ? <p className="operations-empty">Memuat…</p> : null}
          {status && status.items.length === 0 ? (
            <p className="operations-empty">
              Belum ada tugas. Minta admin menambahkan daftar tugas harian di
              Pengaturan &gt; Daftar tugas harian.
            </p>
          ) : null}

          {status && status.items.length > 0 ? (
            <div className="operations-progress" aria-label="Progress checklist">
              <div className="operations-progress-head">
                <span>Progress hari ini</span>
                <strong>
                  {numberFormat.format(status.doneCount)}/
                  {numberFormat.format(status.totalCount)}
                </strong>
              </div>
              <div className="operations-track">
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}

          {status && status.groups.length > 0 ? (
            status.groups.map((group) => (
              <div className="operations-group" key={group.phase}>
                <div className="operations-group-head">
                  <strong>{group.label}</strong>
                  <span>
                    {numberFormat.format(group.doneCount)} dari{" "}
                    {numberFormat.format(group.totalCount)} selesai
                  </span>
                </div>
                <div className="operations-list">
                  {group.items.map((item) => (
                    <div
                      key={item.checklistId}
                      className={`operations-row ${item.done ? "operations-row-done" : ""}`}
                    >
                      <div className="operations-main">
                        <strong>{item.name}</strong>
                        {item.detail ? <small>{item.detail}</small> : null}
                        {item.note ? (
                          <small className="operations-note">“{item.note}”</small>
                        ) : null}
                      </div>
                      <span
                        className={`operations-status ${item.done ? "operations-status-done" : "operations-status-pending"}`}
                      >
                        {item.done ? "Selesai" : "Belum"}
                      </span>
                      {canManageOperations ? (
                        <div className="operations-actions">
                          <input
                            type="text"
                            placeholder="Catatan (opsional)"
                            value={notes[item.checklistId] ?? ""}
                            onChange={(e) =>
                              setNotes((prev) => ({
                                ...prev,
                                [item.checklistId]: e.target.value,
                              }))
                            }
                          />
                          {item.done ? (
                            <button
                              type="button"
                              className="operations-btn operations-btn-danger"
                              onClick={() =>
                                void handleToggle(item.checklistId, false)
                              }
                            >
                              Batal
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="operations-btn operations-btn-primary"
                              onClick={() =>
                                void handleToggle(item.checklistId, true)
                              }
                            >
                              Selesai
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : status && status.items.length > 0 ? (
            <p className="operations-empty">
              Tugas belum dikelompokkan ke tahap buka/tutup. Hubungi admin agar
              mengaturnya di Pengaturan &gt; Daftar tugas harian.
            </p>
          ) : null}
        </section>

        {/* Panduan singkat (collapsible, tidak menghalangi aksi utama) */}
        <details className="panel operations-guide">
          <summary>Butuh bantuan? Panduan singkat</summary>
          <ul className="operations-guide-list">
            <li>
              <strong>Apa ini?</strong> Daftar pekerjaan harian untuk
              menyiapkan dan menutup taman — misalnya cek kebersihan,
              menyiapkan uang loket, atau memastikan fasilitas siap.
            </li>
            <li>
              <strong>Cara pakai:</strong> centang <em>Selesai</em> setiap
              tugas yang sudah dikerjakan. Tambahkan catatan bila perlu.
              Tugas yang belum dikerjakan tampil berstatus <em>Belum</em>.
            </li>
            <li>
              <strong>Catatan:</strong> daftar tugas ini diatur oleh admin di
              menu Pengaturan → Daftar tugas harian. Hubungi admin bila ada
              tugas yang perlu ditambah atau diubah.
            </li>
          </ul>
        </details>
      </section>
    </main>
  );
}
